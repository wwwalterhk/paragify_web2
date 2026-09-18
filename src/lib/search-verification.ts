export const SEARCH_COOKIE = "__Host-paragify-search";
export const SEARCH_TTL = 3600;

const SITE_ORIGIN = "https://paragify.com";

export function searchGrantKey(token: string, ip: string): Request {
	return new Request(`${SITE_ORIGIN}/__search-grants/${encodeURIComponent(token)}/${encodeURIComponent(ip)}`);
}

export function safeSearchReturn(value: string | null): string {
	if (!value || value.length > 4096) return "/";
	try {
		const url = new URL(value, SITE_ORIGIN);
		if (url.origin !== SITE_ORIGIN || url.pathname !== "/") return "/";
		return url.pathname + url.search;
	} catch {
		return "/";
	}
}
