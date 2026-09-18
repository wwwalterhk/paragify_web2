import { SignJWT, jwtVerify } from "jose";
import { SEARCH_TTL } from "./search-verification";

const SITE_ORIGIN = "https://paragify.com";
const ISSUER = "public-search-v2";
const signingKey = (secret: string) => new TextEncoder().encode("public-search-v2\0" + secret);

export async function issueSearchGrant(secret: string, ip: string): Promise<string> {
  return new SignJWT({ ip })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER).setAudience(SITE_ORIGIN)
    .setJti(crypto.randomUUID()).setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SEARCH_TTL)
    .sign(signingKey(secret));
}

export async function verifySearchGrant(token: string, secret: string, ip: string): Promise<string | null> {
  if (token.length > 4096) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(secret), {
      algorithms: ["HS256"], issuer: ISSUER, audience: SITE_ORIGIN,
      maxTokenAge: SEARCH_TTL,
    });
    if (payload.ip !== ip || typeof payload.jti !== "string" ||
        typeof payload.exp !== "number" || typeof payload.iat !== "number" ||
        payload.iat > Math.floor(Date.now() / 1000) ||
        payload.exp - payload.iat > SEARCH_TTL) return null;
    return payload.jti;
  } catch { return null; }
}
