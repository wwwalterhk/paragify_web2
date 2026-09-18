# Preparation queue indexes (2026-09-18)

D1 insights attributed the largest reads to preparation/admin queries. Added
partial indexes restricted to visibility='prepare', matching status/creation
order and hashtag-generation/update order. Admin responses remain uncached.

Apply with:
`npx wrangler d1 execute DB --remote --file scripts/optimize-preparation-queries.sql`

Measured checks using application SQL:

| Query | Rows read before | After |
| --- | ---: | ---: |
| Page queue with no matching pages | 23,817 | 3 |
| Empty hashtag generation queue | 3,399 | 0 |
| Completed preparation queue (1,521 results) | 4,919 | 3,042 |

The above result sets matched before and after, ignoring ordering of tied rows.
The upstream preparation process was active during testing, so live queue sizes
can change between requests. The indexes avoid scanning unrelated published
posts but do not eliminate reads for rows actually returned.

One-time index creation/statistics refresh: 106,684 reads and 3,063 writes.
Future preparation writes also maintain the new indexes. No app data was deleted.
