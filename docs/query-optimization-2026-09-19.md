# Taxonomy query optimization — 19 September 2026

- Separate translated category/subcategory labels from public post counts.
- Cache labels by display locale for 1 hour and counts by normalized content-locale set for 15 minutes.
- Count public posts once per subcategory without multiplying rows through translation joins. Preserve empty categories, inactive-category/subcategory exclusion, translation fallback, and country filtering.
- No database schema changes or stricter IP limits.

Read-only production comparisons matched every output row for all five country filters. Combined label/count query rows read versus the original 3,926: US 2,661; UK 2,712; HK 3,846; TW 2,720; JP 2,673. Subsequent count refreshes can reuse label caches. These are cold-query samples, not a site-wide savings guarantee. Validation queries contribute to D1 usage.

Tests: `node scripts/test-taxonomy-counts.cjs` (Node with node:sqlite), `node scripts/test-public-protection.cjs`, and production OpenNext build.
