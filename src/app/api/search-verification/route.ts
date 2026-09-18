import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { SEARCH_COOKIE, SEARCH_TTL, searchGrantKey, safeSearchReturn } from "@/lib/search-verification";

export async function POST(request: Request) {
	if (request.headers.get("origin") !== new URL(request.url).origin) {
		return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
	}
	const body = await request.json().catch(() => null) as { token?: unknown; returnTo?: unknown } | null;
	if (typeof body?.token !== "string" || !body.token || body.token.length > 2048) {
		return NextResponse.json({ error: "Please complete verification." }, { status: 400 });
	}
	const { env } = await getCloudflareContext({ async: true });
	const secret = (env as CloudflareEnv & { TURNSTILE_SECRET_KEY?: string }).TURNSTILE_SECRET_KEY;
	const ip = request.headers.get("cf-connecting-ip");
	const cache = (globalThis.caches as CacheStorage & { default?: Cache })?.default;
	if (!secret || !ip || !cache) {
		return NextResponse.json({ error: "Verification is temporarily unavailable. Please retry." }, { status: 503 });
	}
	try {
		const verified = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
			method: "POST",
			body: new URLSearchParams({ secret, response: body.token, remoteip: ip }),
		});
		const result = await verified.json() as { success?: boolean; hostname?: string; action?: string };
		if (!result.success || result.hostname !== "paragify.com" || result.action !== "public-search") {
			return NextResponse.json({ error: "Verification failed. Please retry." }, { status: 403 });
		}
		const token = crypto.randomUUID();
		await cache.put(searchGrantKey(token, ip), new Response("verified", {
			headers: { "cache-control": `public, max-age=${SEARCH_TTL}` },
		}));
		const returnTo = safeSearchReturn(typeof body.returnTo === "string" ? body.returnTo : null);
		const response = NextResponse.json({ returnTo });
		response.headers.set("cache-control", "no-store");
		response.cookies.set(SEARCH_COOKIE, token, {
			secure: true,
			httpOnly: true,
			sameSite: "lax",
			path: "/",
			maxAge: SEARCH_TTL,
		});
		return response;
	} catch {
		return NextResponse.json({ error: "Verification is temporarily unavailable. Please retry." }, { status: 503 });
	}
}
