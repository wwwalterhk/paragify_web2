import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SEARCH_COOKIE, searchGrantKey, safeSearchReturn } from "./search-verification";
import { verifySearchGrant } from "./search-grant";

type Limiter = { limit(options: { key: string }): Promise<{ success: boolean }> };
type ProtectionEnv = {
  TURNSTILE_SECRET_KEY?: string;
  ABUSE_PAGE_LIMIT?: Limiter;
  ABUSE_API_LIMIT?: Limiter;
  ABUSE_SEARCH_LIMIT?: Limiter;
  ABUSE_AGGREGATE_LIMIT?: Limiter;
};
const API_PATHS = new Set(["/api/feed", "/api/posts/feed", "/api/mobile/posts",
  "/api/posts/comments", "/api/posts/like", "/api/posts/view"]);
const SITE = "https://paragify.com";

async function bindings(): Promise<ProtectionEnv> {
  return (await getCloudflareContext({ async: true })).env as ProtectionEnv;
}

async function allowed(limiter: Limiter | undefined, key: string): Promise<boolean> {
  // Local development and a platform limiter failure must not lock out readers.
  if (!limiter) return true;
  try { return (await limiter.limit({ key: SITE + "|" + key })).success; }
  catch { return true; }
}

function retryResponse(): NextResponse {
  return NextResponse.json({ error: "Please wait a moment and retry." }, {
    status: 429, headers: { "cache-control": "no-store", "retry-after": "60",
      "x-abuse-guard": "short-window-limit", "x-robots-tag": "noindex" },
  });
}

function challenge(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/verify-search";
  url.search = "";
  url.searchParams.set("returnTo", safeSearchReturn(request.nextUrl.pathname + request.nextUrl.search));
  const response = NextResponse.redirect(url, 307);
  response.headers.set("cache-control", "no-store");
  response.headers.set("x-abuse-guard", "verification-required");
  response.headers.set("x-robots-tag", "noindex");
  return response;
}

async function grantId(request: NextRequest, env: ProtectionEnv, ip: string): Promise<string | null> {
  const token = request.cookies.get(SEARCH_COOKIE)?.value;
  if (!token || !ip) return null;
  if (env.TURNSTILE_SECRET_KEY) {
    const id = await verifySearchGrant(token, env.TURNSTILE_SECRET_KEY, ip);
    if (id) return id;
  }
  // Keep existing one-hour UUID grants usable during migration.
  if (/^[0-9a-f-]{36}$/.test(token)) {
    try {
      const cache = (globalThis.caches as CacheStorage & { default?: Cache })?.default;
      if (await cache?.match(searchGrantKey(token, ip))) return token;
    } catch { /* Ask for verification again. */ }
  }
  return null;
}

export async function guardPublicPageRequest(request: NextRequest): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname;
  const api = API_PATHS.has(path);
  if (request.method !== "GET" && request.method !== "HEAD" &&
      !(api && path === "/api/posts/view" && request.method === "POST")) return null;
  if (path === "/verify-search" || /^\/(?:auth|admin|_next|api)(?:\/|$)/.test(path) && !api ||
      /\.[a-z0-9]+$/i.test(path)) return null;

  const expensiveSearch = path === "/" &&
    Boolean(request.nextUrl.searchParams.get("q")?.trim() || request.nextUrl.searchParams.get("hashtag")?.trim());
  const ip = request.headers.get("cf-connecting-ip")?.trim() || "";
  let env: ProtectionEnv;
  try { env = await bindings(); }
  catch { return expensiveSearch ? challenge(request) : null; }
  const verified = await grantId(request, env, ip);
  const subject = verified ? "browser:" + verified : "ip:" + ip;

  if (api) {
    if (!ip) return null;
    if (!await allowed(env.ABUSE_API_LIMIT, "api:" + path + ":" + subject) ||
        !await allowed(env.ABUSE_AGGREGATE_LIMIT, "api:" + path)) return retryResponse();
    return null;
  }
  if (expensiveSearch) {
    if (!verified) return challenge(request);
    if (!await allowed(env.ABUSE_SEARCH_LIMIT, "search:" + subject) ||
        !await allowed(env.ABUSE_AGGREGATE_LIMIT, "search")) return retryResponse();
    return null;
  }
  // Verified browsers never inherit a page/IP ban. Unverified readers can recover
  // immediately by completing a challenge instead of waiting out a long block.
  if (!verified && ip && !await allowed(env.ABUSE_PAGE_LIMIT, "pages:ip:" + ip)) return challenge(request);
  return null;
}

export async function limitVerification(request: Request): Promise<NextResponse | null> {
  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return null;
  try {
    const env = await bindings();
    return await allowed(env.ABUSE_SEARCH_LIMIT, "verify:ip:" + ip) ? null : retryResponse();
  } catch { return null; }
}
