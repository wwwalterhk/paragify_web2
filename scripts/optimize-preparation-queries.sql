-- Target the preparation queues without caching private/admin responses.
CREATE INDEX IF NOT EXISTS idx_posts_prepare_status_created
ON posts(prepare_status, created_at DESC, post_id DESC)
WHERE visibility = 'prepare';

CREATE INDEX IF NOT EXISTS idx_posts_prepare_hashtags_updated
ON posts(generate_hashtags_locale, updated_at DESC, post_id DESC)
WHERE visibility = 'prepare';

ANALYZE posts;
ANALYZE post_pages;
