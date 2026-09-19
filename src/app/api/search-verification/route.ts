import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { SEARCH_COOKIE, SEARCH_TTL, safeSearchReturn } from "@/lib/search-verification";
import { issueSearchGrant } from "@/lib/search-grant";
import { limitVerification, recordInvalidVerification } from "@/lib/request-guard";

function json(body: object, status: number) {
  return NextResponse.json(body, { status, headers: {
    "cache-control": "no-store", "x-robots-tag": "noindex",
  } });
}
async function readBody(request: Request): Promise<{ token?: unknown; returnTo?: unknown } | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        throw new RangeError("Verification body is too large");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return json({ error: "Invalid origin" }, 403);
  const limited = await limitVerification(request);
  if (limited) return limited;
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || ""))
    return json({ error: "Expected JSON" }, 415);
  let body: { token?: unknown; returnTo?: unknown } | null;
  try { body = await readBody(request); }
  catch (error) { return json({ error: "Invalid verification request." }, error instanceof RangeError ? 413 : 400); }
  if (typeof body?.token !== "string" || !body.token || body.token.length > 2048)
    return json({ error: "Please complete verification." }, 400);
  try {
    const { env } = await getCloudflareContext({ async: true });
    const secret = (env as CloudflareEnv & { TURNSTILE_SECRET_KEY?: string }).TURNSTILE_SECRET_KEY;
    const ip = request.headers.get("cf-connecting-ip")?.trim();
    if (!secret || !ip) return json({ error: "Verification is temporarily unavailable. Please retry." }, 503);
    const verified = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", signal: AbortSignal.timeout(10000),
      body: new URLSearchParams({ secret, response: body.token, remoteip: ip }),
    });
    if (!verified.ok) return json({ error: "Verification service is temporarily unavailable. Please retry." }, 503);
    const result = await verified.json() as {
      success?: boolean; hostname?: string; action?: string; "error-codes"?: string[];
    };
    if (!result.success) {
      const codes = Array.isArray(result["error-codes"]) ? result["error-codes"] : [];
      if (codes.some(code => ["internal-error", "invalid-input-secret", "missing-input-secret"].includes(code)))
        return json({ error: "Verification service is temporarily unavailable. Please retry." }, 503);
      if (codes.includes("invalid-input-response") && !codes.includes("timeout-or-duplicate")) {
        const blocked = await recordInvalidVerification(request);
        if (blocked) return blocked;
      }
      return json({ error: "Verification failed or expired. Please try a fresh challenge." }, 403);
    }
    if (result.hostname !== "paragify.com" || result.action !== "public-search")
      return json({ error: "Verification failed. Please retry." }, 403);
    const token = await issueSearchGrant(secret, ip);
    const response = json({ returnTo: safeSearchReturn(typeof body.returnTo === "string" ? body.returnTo : null) }, 200);
    response.cookies.set(SEARCH_COOKIE, token, { secure: true, httpOnly: true, sameSite: "lax", path: "/", maxAge: SEARCH_TTL });
    return response;
  } catch {
    return json({ error: "Verification is temporarily unavailable. Please retry." }, 503);
  }
}
