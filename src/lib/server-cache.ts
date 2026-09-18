/** Cache public server data in Cloudflare's per-datacenter Cache API. */
const CACHE_ORIGIN = "https://paragify.com";

export async function cachePublicJson<T>(
	namespace: string,
	keyParts: unknown[],
	ttlSeconds: number,
	loader: () => Promise<T>,
	shouldCache: (value: T) => boolean = () => true,
): Promise<T> {
	const cacheStorage = globalThis.caches as CacheStorage & { default?: Cache };
	const cache = cacheStorage?.default;
	if (!cache) return loader();

	const encodedKey = encodeURIComponent(JSON.stringify(keyParts));
	const request = new Request(`${CACHE_ORIGIN}/__edge-data-cache/${namespace}/${encodedKey}`);
	try {
		const cached = await cache.match(request);
		if (cached) return (await cached.json()) as T;
	} catch {
		return loader();
	}

	const value = await loader();
	if (!shouldCache(value)) return value;
	try {
		await cache.put(request, new Response(JSON.stringify(value), {
			headers: {
				"cache-control": `public, max-age=${ttlSeconds}`,
				"content-type": "application/json; charset=utf-8",
			},
		}));
	} catch {
		// Cache failures must not turn a successful request into an error.
	}
	return value;
}
