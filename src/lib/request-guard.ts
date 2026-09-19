import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SEARCH_COOKIE, safeSearchReturn } from "./search-verification";
import { verifySearchGrant } from "./search-grant";
import { markAbuse, remainingAbuseSeconds } from "./abuse-state";

type Limiter = { limit(options: { key: string }): Promise<{ success: boolean }> };
type ProtectionEnv = {
  TURNSTILE_SECRET_KEY?: string;
  ABUSE_PAGE_LIMIT?: Limiter;
  ABUSE_API_LIMIT?: Limiter;
  ABUSE_SEARCH_LIMIT?: Limiter;
  ABUSE_AGGREGATE_LIMIT?: Limiter;
  ABUSE_RISK_LIMIT?: Limiter;
  ABUSE_VERIFIED_LIMIT?: Limiter;
  ABUSE_VERIFY_LIMIT?: Limiter;
  ABUSE_FAILURE_LIMIT?: Limiter;
};
const API_PATHS = new Set(["/api/feed", "/api/posts/feed", "/api/mobile/posts",
  "/api/posts/comments", "/api/posts/like", "/api/posts/view"]);
const SITE = "https://paragify.com";

async function bindings(): Promise<ProtectionEnv> {
  return (await getCloudflareContext({ async: true })).env as ProtectionEnv;
}
async function allowed(limiter: Limiter | undefined, key: string): Promise<boolean> {
  if (!limiter) return true;
  try { return (await limiter.limit({ key: SITE + "|" + key })).success; }
  catch { return true; } // A platform failure must not lock out ordinary readers.
}
function retryResponse(seconds = 60): NextResponse {
  return NextResponse.json({ error: "Please wait a moment and retry.", retry_after: seconds }, {
    status: 429, headers: { "cache-control": "no-store", "retry-after": String(seconds),
      "x-abuse-guard": "short-window-limit", "x-robots-tag": "noindex" },
  });
}
function challenge(request: NextRequest, api = false): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/verify-search"; url.search = "";
  const returnTo = api
    ? safeSearchReturn(request.headers.get("referer") || (request.nextUrl.pathname === "/api/feed" ? "/feed" : "/"))
    : safeSearchReturn(request.nextUrl.pathname + request.nextUrl.search);
  url.searchParams.set("returnTo", returnTo);
  // JSON clients must never receive HTML from an automatically followed redirect.
  const response = api ? NextResponse.json({
    error: "Please verify your browser to continue.", code: "verification_required",
    verification_url: url.pathname + url.search, retry_after: 60,
  }, { status: 429, headers: { "retry-after": "60" } }) : NextResponse.redirect(url, 307);
  response.headers.set("cache-control", "no-store");
  response.headers.set("x-abuse-guard", "verification-required");
  response.headers.set("x-robots-tag", "noindex");
  return response;
}
async function requireVerification(request: NextRequest, ip: string, api: boolean) {
  // Native clients cannot complete a browser-cookie challenge. Keep their
  // existing short-window 429 contract instead of trapping them behind it.
  if (request.nextUrl.pathname === "/api/mobile/posts") return retryResponse();
  await markAbuse(ip, "challenge");
  return challenge(request, api);
}
function sensitiveBrowse(request: NextRequest): boolean {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/" && pathname !== "/feed" && !API_PATHS.has(pathname)) return false;
  return ["category", "subcategory", "author", "tag", "user", "q", "hashtag"]
    .some(key => Boolean(searchParams.get(key)?.trim())) || Number(searchParams.get("page") || "1") > 5;
}
export async function guardPublicPageRequest(request: NextRequest): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname;
  const api = API_PATHS.has(path);
  if (request.method !== "GET" && request.method !== "HEAD" &&
      !(api && path === "/api/posts/view" && request.method === "POST")) return null;
  if (path === "/verify-search" || (/^\/(?:auth|admin|_next|api)(?:\/|$)/.test(path) && !api) ||
      (/\.[a-z0-9]+$/i.test(path) && !/^\/(?:p|post)\//.test(path))) return null;
  const expensiveSearch = path === "/" &&
    Boolean(request.nextUrl.searchParams.get("q")?.trim() || request.nextUrl.searchParams.get("hashtag")?.trim());
  const ip = request.headers.get("cf-connecting-ip")?.trim() || "";
  let env: ProtectionEnv;
  try { env = await bindings(); }
  catch { return expensiveSearch ? challenge(request) : null; }
  const token = request.cookies.get(SEARCH_COOKIE)?.value;
  const verified = token && ip && env.TURNSTILE_SECRET_KEY
    ? await verifySearchGrant(token, env.TURNSTILE_SECRET_KEY, ip) : null;
  const subject = verified ? "browser:" + verified : "ip:" + ip;

  // Keep the challenge sticky for clients that ignore it. Valid browsers sharing
  // an IP can recover independently; reading the marker does not extend its TTL.
  if (!verified && ip && path !== "/api/mobile/posts" && await remainingAbuseSeconds(ip, "challenge"))
    return challenge(request, api);
  // Passing Turnstile is not unlimited permission to scrape. A generous IP ceiling
  // persists across new cookies so repeatedly solving challenges cannot reset it.
  if (verified && (!await allowed(env.ABUSE_VERIFIED_LIMIT, "verified:" + subject) ||
      !await allowed(env.ABUSE_AGGREGATE_LIMIT, "verified-ip:" + ip))) return retryResponse();
  if (sensitiveBrowse(request) && ip) {
    if (!verified && !await allowed(env.ABUSE_RISK_LIMIT, "filtered:ip:" + ip))
      return requireVerification(request, ip, api);
    if (verified && !await allowed(env.ABUSE_VERIFIED_LIMIT, "filtered-ip:" + ip)) return retryResponse();
  }
  if (api) {
    if (!ip) return null;
    if (!await allowed(env.ABUSE_API_LIMIT, "api:" + path + ":" + subject))
      return verified ? retryResponse() : requireVerification(request, ip, true);
    if (!await allowed(env.ABUSE_AGGREGATE_LIMIT, "api:" + path)) return retryResponse();
    return null;
  }
  if (expensiveSearch) {
    if (!verified) return challenge(request);
    if (!await allowed(env.ABUSE_SEARCH_LIMIT, "search:" + subject) ||
        !await allowed(env.ABUSE_AGGREGATE_LIMIT, "search")) return retryResponse();
    return null;
  }
  if (!verified && ip && !await allowed(env.ABUSE_PAGE_LIMIT, "pages:ip:" + ip))
    return requireVerification(request, ip, false);
  return null;
}
export async function limitVerification(request: Request): Promise<NextResponse | null> {
  const ip = request.headers.get("cf-connecting-ip")?.trim();
  if (!ip) return null;
  const cooldown = await remainingAbuseSeconds(ip, "verification-cooldown");
  if (cooldown) return retryResponse(cooldown);
  try {
    const env = await bindings();
    return await allowed(env.ABUSE_VERIFY_LIMIT, "verify:ip:" + ip) ? null : retryResponse();
  } catch { return null; }
}
/** Only a definitive invalid response counts, not expiry/replay or service errors. */
export async function recordInvalidVerification(request: Request): Promise<NextResponse | null> {
  const ip = request.headers.get("cf-connecting-ip")?.trim();
  if (!ip) return null;
  try {
    const env = await bindings();
    if (!await allowed(env.ABUSE_FAILURE_LIMIT, "invalid:ip:" + ip)) {
      await Promise.all([markAbuse(ip, "challenge"), markAbuse(ip, "verification-cooldown")]);
      return retryResponse();
    }
  } catch { /* Do not penalize a platform failure. */ }
  return null;
}
