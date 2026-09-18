import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Public JSON only. Never use this helper for user-specific data. */
const CACHE_ORIGIN = "https://paragify.com";
const MAX_HOT_BYTES = 2 * 1024 * 1024;
const MAX_ENTRY_BYTES = 128 * 1024;
const hot = new Map<string, { json: string; expires: number; bytes: number }>();
let hotBytes = 0;
// Worker I/O promises must never cross request contexts.
const pendingByRequest = new WeakMap<object, Map<string, Promise<string>>>();

function forget(key: string) {
  const old = hot.get(key);
  if (old) hotBytes -= old.bytes;
  hot.delete(key);
}
function remember(key: string, json: string, expires: number) {
  const bytes = json.length * 2;
  if (bytes > MAX_ENTRY_BYTES || expires <= Date.now()) return;
  forget(key);
  while (hot.size >= 128 || hotBytes + bytes > MAX_HOT_BYTES) {
    const oldest = hot.keys().next().value;
    if (oldest === undefined) break;
    forget(oldest);
  }
  hot.set(key, { json, expires, bytes });
  hotBytes += bytes;
}
function requestPending(): Map<string, Promise<string>> | undefined {
  try {
    const { ctx } = getCloudflareContext();
    let pending = pendingByRequest.get(ctx);
    if (!pending) { pending = new Map(); pendingByRequest.set(ctx, pending); }
    return pending;
  } catch { return undefined; }
}

export async function cachePublicJson<T>(
  namespace: string, keyParts: unknown[], ttlSeconds: number,
  loader: () => Promise<T>, shouldCache: (value: T) => boolean = () => true,
): Promise<T> {
  const url = CACHE_ORIGIN + "/__edge-data-cache/" + namespace + "/" + encodeURIComponent(JSON.stringify(keyParts));
  const key = url + "|" + ttlSeconds;
  const recent = hot.get(key);
  if (recent && recent.expires > Date.now()) return JSON.parse(recent.json) as T;
  if (recent) forget(key);

  const pending = requestPending();
  const existing = pending?.get(key);
  if (existing) return JSON.parse(await existing) as T;

  const fill = async (): Promise<string> => {
    const cache = (globalThis.caches as CacheStorage & { default?: Cache })?.default;
    const request = new Request(url);
    try {
      const cached = await cache?.match(request);
      if (cached) {
        const json = await cached.text();
        JSON.parse(json);
        // Never extend the original TTL by moving an edge entry into memory.
        const expires = Number(cached.headers.get("x-data-expires"));
        if (Number.isFinite(expires)) remember(key, json, expires);
        return json;
      }
    } catch { /* Continue to the loader if cache lookup/parsing fails. */ }

    const value = await loader();
    const json = JSON.stringify(value);
    if (json === undefined) throw new TypeError("Public cache loader must return JSON");
    if (ttlSeconds > 0 && shouldCache(value)) {
      const expires = Date.now() + ttlSeconds * 1000;
      remember(key, json, expires);
      try {
        await cache?.put(request, new Response(json, { headers: {
          "cache-control": "public, max-age=" + ttlSeconds,
          "content-type": "application/json; charset=utf-8",
          "x-data-expires": String(expires),
        } }));
      } catch { /* Successful reads survive cache-write failures. */ }
    }
    return json;
  };
  const work = fill();
  pending?.set(key, work);
  try { return JSON.parse(await work) as T; }
  finally { pending?.delete(key); }
}
