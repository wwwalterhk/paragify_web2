/** Binary, expiring markers only: counters use native rate-limit bindings. */
const SITE = "https://paragify.com";
type Marker = "challenge" | "verification-cooldown";
function key(ip: string, marker: Marker) {
  return new Request(SITE + "/__abuse-state/v3/" + marker + "/" + encodeURIComponent(ip));
}
export async function remainingAbuseSeconds(ip: string, marker: Marker): Promise<number> {
  if (!ip) return 0;
  try {
    const cache = (globalThis.caches as CacheStorage & { default?: Cache })?.default;
    const response = await cache?.match(key(ip, marker));
    const until = Number(response?.headers.get("x-abuse-until") ?? 0);
    return Number.isFinite(until) ? Math.max(0, Math.ceil((until - Date.now()) / 1000)) : 0;
  } catch { return 0; }
}
export async function markAbuse(ip: string, marker: Marker): Promise<void> {
  if (!ip) return;
  const ttl = marker === "challenge" ? 900 : 60;
  try {
    const cache = (globalThis.caches as CacheStorage & { default?: Cache })?.default;
    await cache?.put(key(ip, marker), new Response(null, { headers: {
      "cache-control": "public, max-age=" + ttl,
      "x-abuse-until": String(Date.now() + ttl * 1000),
    } }));
  } catch { /* Native rate limits still apply when marker storage is unavailable. */ }
}
