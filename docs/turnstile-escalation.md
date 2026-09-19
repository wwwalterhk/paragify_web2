# Turnstile escalation and short-window protection

Updated 19 September 2026. Applies only to guarded public reads and view-tracking POSTs. Authentication, admin, and other writes retain their existing protections.

## Escalation
- Normal unverified browsing retains 120 requests/minute per IP.
- Filter-heavy public browsing (category, author, tag, search, or deep pagination) is counted across URLs, at 30/minute per IP. Changing the query string does not reset this key.
- Exceeding an individual unverified limit stores a 15-minute, per-IP verification-required marker. No D1 calls are needed to check it. Reading this marker never renews its expiry.
- Marked visitors are challenged before public database routes. A valid signed grant bypasses this marker immediately, so another browser sharing the IP can recover independently.
- A verified browser is still limited to 240 guarded requests/minute. A generous 1,200/minute verified-IP ceiling survives cookie/grant rotation. Filter-heavy verified requests also have a stable 240/minute IP key.
- Existing API per-endpoint limits (120/minute) and search limits (60/minute) remain. Aggregate overload returns a short 429 rather than flagging individual visitors.
- Browser-facing APIs return JSON 429 with code `verification_required` and a recovery URL, never an HTML redirect. Browser feed clients navigate to the challenge, preserving the current page as the return target. Feed auto-loading stops on an error; manual retry remains available.
- The native `/api/mobile/posts` endpoint retains short-window JSON 429s rather than browser challenges; native clients cannot recover through a website cookie. Its rate and aggregate limits still apply.

## Turnstile verification
- At most 10 submissions/minute per IP, independently of the search-query budget.
- Count only Siteverify's definitive `invalid-input-response` failures as invalid attempts. The sixth such failure in a short window stores a 60-second verification cooldown and a verification-required marker.
- Expired/duplicate tokens, service outages, incorrect server secrets, or hostname/action mismatches do not create invalid-attempt strikes. Submissions still count toward the general attempt limit.
- Check Siteverify success, hostname, and action before issuing a signed, HttpOnly, Secure, SameSite=Lax, IP-bound, one-hour cookie.
- Reject bodies over 8 KiB and oversized tokens. Origin checking and no-store responses apply.
- The challenge UI prevents duplicate submissions and supports a fresh challenge after errors, with Retry-After countdowns instead of rapid retries.
- Old regional UUID verification grants are no longer accepted. Signed grants remain valid.

## Limits and storage
Native Cloudflare rate-limit bindings are approximate and regional. Binary challenge/cooldown markers use Cache API and may be evicted; failed marker reads or platform-limit calls fail open for normal reads. Text/hashtag search still requires valid verification.

Raw IPs are present in limiter keys, marker keys, and signed cookie payloads (signing is not encryption), not in a new D1 log/table. No new per-request application logging is added.

These rules detect suspicious behavior, not malicious intent. They do not guarantee blocking distributed traffic or bots that successfully solve Turnstile. No permanent account-wide firewall bans or country-wide rules are added.

Tests: `node scripts/test-public-protection.cjs` and `node scripts/test-browser-verification.cjs`. Tests mock Cloudflare/Turnstile and do not prove real interactive challenge completion.
