import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const WINDOW_SECONDS = 60;
const MAX_PAGE_REQUESTS_PER_WINDOW = 60;
const MAX_RISK_SCORE_PER_WINDOW = 36;
const BLOCK_SECONDS = 60 * 60;

function clientIp(request: NextRequest): string | null {
	return request.headers.get("cf-connecting-ip")?.trim()
		|| request.headers.get("x-real-ip")?.trim()
		|| request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
		|| null;
}

/** Returns a 429 response when a client is temporarily blocked. */
export async function guardPublicPageRequest(request: NextRequest, namespace: string): Promise<NextResponse | null> {
	if (request.method !== "GET" && request.method !== "HEAD") return null;
	const ip = clientIp(request);
	const cache = (globalThis.caches as CacheStorage & { default?: Cache })?.default;
	if (!ip || !cache) return null;

	try {
		const key = encodeURIComponent(ip);
		const origin = request.nextUrl.origin;
		const blockRequest = new Request(`${origin}/__edge-rate-limit/${namespace}/blocked/${key}`);
		if (await cache.match(blockRequest)) return blockedResponse(BLOCK_SECONDS);

		const windowId = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
		const risk = requestRisk(request);
		const totalCount = await increment(cache, origin, namespace, key, windowId, "all", 1);
		const riskScore = risk > 1
			? await increment(cache, origin, namespace, key, windowId, "risk", risk)
			: 0;

		if (totalCount <= MAX_PAGE_REQUESTS_PER_WINDOW && riskScore <= MAX_RISK_SCORE_PER_WINDOW) return null;
		await cache.put(blockRequest, new Response(null, {
			headers: { "cache-control": `public, max-age=${BLOCK_SECONDS}` },
		}));
		return blockedResponse(BLOCK_SECONDS);
	} catch {
		return null;
	}
}

function requestRisk(request: NextRequest): number {
	const params = request.nextUrl.searchParams;
	const query = params.get("q")?.trim() || "";
	const page = Number(params.get("page") || "1");
	if (query.length > 120 || !Number.isFinite(page) || page < 1 || page > 200) return MAX_RISK_SCORE_PER_WINDOW + 1;

	let score = 1;
	let filters = 0;
	if (query) { score += 8; filters += 1; }
	if (params.has("hashtag")) { score += 4; filters += 1; }
	if (params.has("category")) { score += 2; filters += 1; }
	if (params.has("subcategory")) { score += 2; filters += 1; }
	if (params.has("author")) { score += 3; filters += 1; }
	if (page > 1) score += 2 + Math.min(8, Math.floor(page / 10));
	if (filters > 2) score += filters;
	return score;
}

async function increment(cache: Cache, origin: string, namespace: string, key: string, windowId: number, scope: string, amount: number): Promise<number> {
	const request = new Request(`${origin}/__edge-rate-limit/${namespace}/count/${scope}/${key}/${windowId}`);
	const previous = await cache.match(request);
	const count = Number(previous?.headers.get("x-request-count") || "0") + amount;
	await cache.put(request, new Response(null, {
		headers: {
			"cache-control": `public, max-age=${WINDOW_SECONDS}`,
			"x-request-count": String(count),
		},
	}));
	return count;
}

function blockedResponse(retryAfter: number): NextResponse {
	return new NextResponse("Too many requests. Please try again later.", {
		status: 429,
		headers: {
			"cache-control": "no-store",
			"retry-after": String(retryAfter),
			"x-robots-tag": "noindex",
		},
	});
}
