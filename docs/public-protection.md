# Public cache and abuse protection

See [Turnstile escalation](turnstile-escalation.md) for the current behavioral limits and cooldown policy.

Run regression checks with `node scripts/test-public-protection.cjs`.

- Public JSON uses regional Cache API plus a bounded Worker-local cache of completed JSON (2 MiB estimate, 128 entries, 128 KiB per entry). Both retain the original TTL. Never use for private/user-specific data.
- Duplicate loads within the same Worker request share a promise. Separate requests never share I/O promises; simultaneous cold requests in separate contexts or regions can still repeat database work.
- Native Cloudflare rate bindings replace Cache API read-modify-write counters. Limits are approximate and regional, not globally atomic.
- Unverified page traffic exceeding 120 requests/minute gets a Turnstile challenge, not a 15-minute IP ban. A verified browser can continue normal browsing.
- Read APIs (and view-tracking POST) have separate per-endpoint/per-client limits of 120/minute and an aggregate per-endpoint limit of 1200/minute. Writes/authentication otherwise retain their existing protections.
- Root text/hashtag searches require verification, with 60/minute per verified browser and 1200/minute aggregate. Verification submissions have a separate binding at 10/minute per IP.
- API/search rate responses are no-store HTTP 429 with Retry-After: 60. A platform limiter failure fails open; search verification still applies.
- Verification cookies are HttpOnly, Secure, SameSite=Lax and valid for one hour. HS256 signatures use a domain-separated key from the existing Turnstile secret; audience, issuer, time and raw Cloudflare-provided IP are checked. Cookies do not depend on a regional cache entry. Legacy UUID grants are no longer accepted.
- Raw IPs are not SHA-256 hashed. Native limiter keys and signed cookie payloads contain the IP; signing is not encryption. No new D1 IP log/table is created.
- This does not prevent all scraping: a verified client can read public pages, regional limits are approximate, and a distributed client can use multiple identities.

Deployment requires TURNSTILE_SECRET_KEY and the eight ABUSE_*_LIMIT bindings in wrangler.jsonc. The real interactive Turnstile flow must also be checked in a browser; automated tests mock the Turnstile response.
