import { NextResponse } from "next/server";

const IMAGE_ACCEPT_HEADER = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";
const PROXY_USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseProxyUrl(rawUrl: string | null): URL | null {
	if (!rawUrl) return null;
	const trimmed = rawUrl.trim();
	if (!trimmed) return null;

	try {
		const parsed = new URL(trimmed);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const targetUrl = parseProxyUrl(requestUrl.searchParams.get("url"));
	if (!targetUrl) {
		return NextResponse.json({ error: "invalid image url" }, { status: 400 });
	}

	try {
		const upstreamResponse = await fetch(targetUrl.toString(), {
			method: "GET",
			headers: {
				Accept: IMAGE_ACCEPT_HEADER,
				"User-Agent": PROXY_USER_AGENT,
				Referer: `${targetUrl.protocol}//${targetUrl.host}/`,
			},
			redirect: "follow",
			cache: "no-store",
		});

		if (!upstreamResponse.ok) {
			return NextResponse.json(
				{ error: `upstream image fetch failed (${upstreamResponse.status})` },
				{ status: upstreamResponse.status },
			);
		}

		const contentType = upstreamResponse.headers.get("content-type") ?? "application/octet-stream";
		const cacheControl = upstreamResponse.headers.get("cache-control") ?? "public, max-age=3600";
		const body = await upstreamResponse.arrayBuffer();

			return new NextResponse(body, {
				status: 200,
				headers: {
					"Content-Type": contentType,
					"Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
					Pragma: "no-cache",
					Expires: "0",
					"Access-Control-Allow-Origin": "*",
					"Timing-Allow-Origin": "*",
					"X-Image-Proxy-Target": targetUrl.toString(),
					"X-Image-Proxy-Upstream-Cache-Control": cacheControl,
					"X-Content-Type-Options": "nosniff",
				},
			});
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "image proxy failed",
			},
			{ status: 502 },
		);
	}
}
