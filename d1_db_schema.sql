-- Cloudflare D1 schema for crawler outputs
-- Stores normalized listing JSON; uses (site, id) as composite primary key.


-- Core users
CREATE TABLE IF NOT EXISTS users (
  user_pk INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  bio          TEXT,                              -- short intro/bio
  hero_url     TEXT,                              -- main hero image
  profile_heading TEXT,
  profile_subheading TEXT,
  phone TEXT,
  locale TEXT DEFAULT 'zh-hk',
  writing_style TEXT, -- e.g. concise, detailed, humorous
  writing_locale TEXT, -- e.g. zh-hk, en-us
  site TEXT, -- e.g. 328car.com, if not null, it is a account from a specific site (e.g. sync to other site users)
  role TEXT DEFAULT 'user', -- user, dealer, admin
  status TEXT DEFAULT 'active', -- active, disabled
  last_login_from TEXT,
  noti_type TEXT, -- APNS or FCM
  noti_device_token TEXT, -- APNS or FCM token
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);



CREATE TABLE IF NOT EXISTS user_id_history (
  history_pk INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pk INTEGER NOT NULL,
  old_user_id TEXT,
  new_user_id TEXT,
  changed_by_user_pk INTEGER,                -- null when unknown/system
  change_source TEXT NOT NULL DEFAULT 'system', -- signup|profile|admin|system|migration
  reason TEXT,
  request_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (COALESCE(old_user_id, '') <> COALESCE(new_user_id, ''))
);

CREATE INDEX IF NOT EXISTS idx_user_id_history_user_created
  ON user_id_history(user_pk, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_id_history_old_user_id
  ON user_id_history(old_user_id);

CREATE INDEX IF NOT EXISTS idx_user_id_history_new_user_id
  ON user_id_history(new_user_id);

CREATE TRIGGER IF NOT EXISTS trg_users_user_id_history_insert
AFTER INSERT ON users
WHEN NEW.user_id IS NOT NULL AND trim(NEW.user_id) <> ''
BEGIN
  INSERT INTO user_id_history (user_pk, old_user_id, new_user_id, change_source, reason)
  VALUES (NEW.user_pk, NULL, NEW.user_id, 'signup', 'initial user_id');
END;

CREATE TRIGGER IF NOT EXISTS trg_users_user_id_history_update
AFTER UPDATE OF user_id ON users
WHEN COALESCE(OLD.user_id, '') <> COALESCE(NEW.user_id, '')
BEGIN
  INSERT INTO user_id_history (user_pk, old_user_id, new_user_id, change_source, reason)
  VALUES (NEW.user_pk, OLD.user_id, NEW.user_id, 'system', 'user_id changed');
END;





-- OAuth accounts (Google, etc.)
CREATE TABLE IF NOT EXISTS user_accounts (
  account_pk INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pk INTEGER NOT NULL,
  provider TEXT NOT NULL, -- google, apple, etc.
  provider_user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provider, provider_user_id),
  FOREIGN KEY (user_pk) REFERENCES users(user_pk)
);

-- Password auth (hashed)
CREATE TABLE IF NOT EXISTS user_passwords (
  user_pk INTEGER PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_pk) REFERENCES users(user_pk)
);

-- Email activation tokens
CREATE TABLE IF NOT EXISTS user_verification_tokens (
  token TEXT PRIMARY KEY,
  user_pk INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_pk) REFERENCES users(user_pk)
);

-- General email logs
CREATE TABLE IF NOT EXISTS email_logs (
  email_log_pk INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token TEXT PRIMARY KEY,
  user_pk INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_pk) REFERENCES users(user_pk)
);

-- Sessions (if you want DB-backed sessions)
CREATE TABLE IF NOT EXISTS user_sessions (
  session_pk INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pk INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  device_id TEXT,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_pk) REFERENCES users(user_pk)
);

-- Favorites / watchlist
CREATE TABLE IF NOT EXISTS user_favorites (
  favorite_pk INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pk INTEGER NOT NULL,
  listing_pk INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_pk, listing_pk),
  FOREIGN KEY (user_pk) REFERENCES users(user_pk),
  FOREIGN KEY (listing_pk) REFERENCES car_listings(listing_pk)
);

-- Saved searches / alerts
CREATE TABLE IF NOT EXISTS user_saved_searches (
  search_pk INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pk INTEGER NOT NULL,
  name TEXT,
  query_json TEXT NOT NULL, -- filters as JSON
  notify INTEGER DEFAULT 0, -- 0/1
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_pk) REFERENCES users(user_pk)
);

-- Lead / inquiry messages
CREATE TABLE IF NOT EXISTS user_inquiries (
  inquiry_pk INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pk INTEGER,
  listing_pk INTEGER NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'new', -- new, replied, closed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_pk) REFERENCES users(user_pk),
  FOREIGN KEY (listing_pk) REFERENCES car_listings(listing_pk)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_pk);
CREATE INDEX IF NOT EXISTS idx_user_inquiries_listing ON user_inquiries(listing_pk);






-- Conversations (1:1, listing chat, or small group)
CREATE TABLE IF NOT EXISTS chat_conversations (
  convo_id        TEXT PRIMARY KEY,              -- GUID/ULID; also the DO id
  convo_type      TEXT NOT NULL,                 -- 'direct' | 'listing' | 'group'
  listing_pk      INTEGER,                       -- link to car_listings when convo_type='listing'
  title           TEXT,                          -- optional group/listing title
  created_by      INTEGER NOT NULL,              -- FK users.user_pk
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  --FOREIGN KEY (listing_pk) REFERENCES car_listings(listing_pk),
  --FOREIGN KEY (created_by) REFERENCES users(user_pk)
);
CREATE INDEX IF NOT EXISTS idx_chat_convo_listing ON chat_conversations(listing_pk);

-- Participants in a conversation
CREATE TABLE IF NOT EXISTS chat_participants (
  convo_id    TEXT NOT NULL,
  user_pk     INTEGER NOT NULL,
  role        TEXT DEFAULT 'member',             -- member|admin|system
  joined_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_read_msg_id INTEGER,                     -- FK chat_messages.message_id
  last_rece_msg_id INTEGER                     -- FK chat_messages.message_id
  --UNIQUE (convo_id, user_pk),
  --FOREIGN KEY (convo_id) REFERENCES chat_conversations(convo_id),
  --FOREIGN KEY (user_pk)  REFERENCES users(user_pk)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_u_chat_convo_id_user_pk ON chat_participants(convo_id, user_pk);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_pk);

-- Messages (text/image/system)
CREATE TABLE IF NOT EXISTS chat_messages (
  message_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  convo_id     TEXT NOT NULL,
  sender_pk    INTEGER NOT NULL,                 -- FK users.user_pk
  msg_type     TEXT NOT NULL DEFAULT 'text',     -- text|image|system
  body         TEXT,                             -- UTF-8 text or caption
  media_url    TEXT,                             -- CDN URL for image/file
  media_width  INTEGER,
  media_height INTEGER,
  reply_message_id INTEGER,
  status       TEXT NOT NULL DEFAULT 'sent',     -- sent|deleted
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  -- FOREIGN KEY (convo_id) REFERENCES chat_conversations(convo_id),
  -- FOREIGN KEY (sender_pk) REFERENCES users(user_pk)
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_convo ON chat_messages(convo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_pk, created_at DESC);

-- Optional: per-user receipts (delivered/read) if you need finer than last_read
CREATE TABLE IF NOT EXISTS chat_receipts (
  message_id INTEGER NOT NULL,
  user_pk    INTEGER NOT NULL,
  status     TEXT NOT NULL,                      -- delivered|read
  at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_pk, status)
  -- FOREIGN KEY (message_id) REFERENCES chat_messages(message_id),
  -- FOREIGN KEY (user_pk)    REFERENCES users(user_pk)
);

-- Optional: attachments table if you support multiple files per message
CREATE TABLE IF NOT EXISTS chat_message_attachments (
  attachment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id    INTEGER NOT NULL,
  url           TEXT NOT NULL,
  mime_type     TEXT,
  size_bytes    INTEGER,
  width         INTEGER,
  height        INTEGER
  -- FOREIGN KEY (message_id) REFERENCES chat_messages(message_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_attach_msg ON chat_message_attachments(message_id);


CREATE TABLE IF NOT EXISTS chat_message_link_previews (
  message_id    INTEGER PRIMARY KEY,
  url           TEXT NOT NULL,
  title         TEXT,
  description   TEXT,
  image_url     TEXT,
  image_source_url TEXT,                     -- original OG image URL from source site
  image_storage_key TEXT,                    -- key/path in R2 storage
  image_mime_type TEXT,
  image_size_bytes INTEGER,
  image_width   INTEGER,
  image_height  INTEGER,
  image_sha256  TEXT,                        -- dedupe/integrity hash
  image_status  TEXT NOT NULL DEFAULT 'pending', -- pending|ok|failed|skipped
  image_error_message TEXT,
  image_fetched_at DATETIME,
  site_name     TEXT,
  fetched_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  status        TEXT NOT NULL DEFAULT 'ok',   -- ok|failed|pending
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_chat_link_preview_url ON chat_message_link_previews(url);
CREATE INDEX IF NOT EXISTS idx_chat_link_preview_image_status ON chat_message_link_previews(image_status);




-- Instagram-style posts (carousel with multiple pages)
CREATE TABLE IF NOT EXISTS posts (
  post_id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pk        INTEGER NOT NULL,
  post_slug      TEXT UNIQUE, -- unique slug for URL
  locale         TEXT, 
  caption        TEXT,
  show_page_content INTEGER NOT NULL DEFAULT 1, -- 0/1: include page-derived content in text display
  custom_content TEXT, -- custom text appended after page content
  sell       INTEGER DEFAULT 0, -- 0/1 if this post is a sell
  title          TEXT,
  brand_slug     TEXT,
  model_name     TEXT,
  prepare_status TEXT, -- fetch_url, fetch_url_done, process_media, process_media_done, ready
  prepare_url    TEXT, 
  prepare_content    TEXT, 
  prepare_content_refined    TEXT, 
  refine_prepare_content INTEGER, -- 0 = none, 1 = requested, 2 = done, 3 = failed
  cover_img_url    TEXT, 
  heading_1_img_url    TEXT, 
  heading_2_img_url    TEXT, 
  generate_cover_img INTEGER NOT NULL DEFAULT 0, -- 0 = none, 1 = requested, 2 = done, 3 = failed
  generate_heading_1_img INTEGER NOT NULL DEFAULT 0, -- 0 = none, 1 = requested, 2 = done, 3 = failed
  generate_heading_2_img INTEGER NOT NULL DEFAULT 0, -- 0 = none, 1 = requested, 2 = done, 3 = failed
  generate_hashtags_locale INTEGER NOT NULL DEFAULT 0, -- 0 = none, 1 = requested, 2 = done, 3 = failed, 4 = waiting for result
  prepare_plan    TEXT, 
  prepare_mode    TEXT, -- gemini operation mode, e.g. fast, thiking, pro
  ig_ref        TEXT, -- instagram reference ID if published to IG
  batch_id        TEXT, -- optional batch ID if this post is part of a batch operation (e.g. AI generation)
  price          INTEGER,
  view_count     INTEGER NOT NULL DEFAULT 0,
  template_id    TEXT, -- optional template reference for AI-generated content
  cover_page     INTEGER NOT NULL DEFAULT 1,          -- 1-based index into post_pages
  visibility     TEXT NOT NULL DEFAULT 'public',      -- public|followers|private
  like_count     INTEGER NOT NULL DEFAULT 0,
  comment_count  INTEGER NOT NULL DEFAULT 0,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  prepare_post_id INTEGER, -- FK to another post_id if this is a prepared post derived from another (e.g. for AI generation)
  prepare_src    TEXT, -- original text content of prepare_url
  cat_code    TEXT, -- category code for this post, e.g. car, tech, lifestyle (can be used for filtering and display)
  sub_cat_code    TEXT,-- subcategory code for this post, e.g. car, tech, lifestyle (can be used for filtering and display)
  site    TEXT -- site of the data source, e.g. 328car, if null, it is a post of paragify.com, it share the table for generating prepared data
  -- FOREIGN KEY (user_pk) REFERENCES users(user_pk)
);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_pk, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_slug ON posts(post_slug);

CREATE INDEX IF NOT EXISTS idx_posts_prepare_content_ready_page
ON posts(updated_at DESC, post_id DESC)
WHERE visibility = 'prepare'
  AND prepare_status = 'prepare_content_batch_done'
  AND prepare_content IS NOT NULL
  AND trim(prepare_content) <> '';

CREATE INDEX IF NOT EXISTS idx_posts_prepare_post_public
ON posts(prepare_post_id)
WHERE visibility = 'public';


CREATE INDEX IF NOT EXISTS idx_posts_public_feed
ON posts(post_id DESC)
WHERE visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_posts_public_user_feed
ON posts(user_pk, post_id DESC)
WHERE visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_posts_public_locale_feed
ON posts(lower(locale), post_id DESC)
WHERE visibility = 'public' AND locale IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_post_saves_user_post
ON post_saves(user_pk, post_id);

CREATE INDEX IF NOT EXISTS idx_posts_prepare_post_any
ON posts(prepare_post_id)
WHERE prepare_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_prepare_content_ready_user_page
ON posts(user_pk, updated_at DESC, post_id DESC)
WHERE visibility = 'prepare'
  AND prepare_status = 'prepare_content_batch_done'
  AND prepare_content IS NOT NULL
  AND trim(prepare_content) <> '';


-- Migration for existing databases (run once, separately from full schema bootstrap):
-- ALTER TABLE posts ADD COLUMN show_page_content INTEGER NOT NULL DEFAULT 1;
-- ALTER TABLE posts ADD COLUMN custom_content TEXT;

CREATE TABLE IF NOT EXISTS post_pages (
  page_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id     INTEGER NOT NULL,
  page_num    INTEGER NOT NULL,                     -- 1,2,3...
  media_url   TEXT NOT NULL,                        -- relative URL/path for CDN rewrite
  media_type  TEXT NOT NULL DEFAULT 'image',        -- image|video|other
  width       INTEGER,
  height      INTEGER,
  media_crop_top_left_x      INTEGER,
  media_crop_top_left_y      INTEGER,
  media_crop_bottom_right_x      INTEGER,
  media_crop_bottom_right_y      INTEGER,
  alt_text    TEXT,
  title       TEXT,
  h1          TEXT,  
  h2          TEXT, 
  h3          TEXT, 
  h4          TEXT,    
  caption     TEXT,     
  layout_json TEXT,     -- e.g. {"order":["h1, "h2","meida","h3","h4","caption"]}     
  raw_media_url TEXT, -- original URL 
  bg_media_url TEXT, -- background URL 
  UNIQUE (post_id, page_num)
  -- FOREIGN KEY (post_id) REFERENCES posts(post_id)
);
CREATE INDEX IF NOT EXISTS idx_post_pages_post ON post_pages(post_id);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id    INTEGER NOT NULL,
  user_pk    INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_pk)
  -- FOREIGN KEY (post_id) REFERENCES posts(post_id),
  -- FOREIGN KEY (user_pk) REFERENCES users(user_pk)
);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_pk, created_at DESC);

CREATE TABLE IF NOT EXISTS post_view_uniques (
  post_id         INTEGER NOT NULL,
  user_pk         INTEGER NOT NULL,
  view_count      INTEGER NOT NULL DEFAULT 1,
  first_viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_viewed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_pk)
  -- FOREIGN KEY (post_id) REFERENCES posts(post_id),
  -- FOREIGN KEY (user_pk) REFERENCES users(user_pk)
);
CREATE INDEX IF NOT EXISTS idx_post_view_uniques_user_last ON post_view_uniques(user_pk, last_viewed_at DESC);

CREATE TABLE IF NOT EXISTS post_comments (
  comment_id            INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id               INTEGER NOT NULL,
  user_pk               INTEGER NOT NULL,
  body                  TEXT NOT NULL,
  reply_to_comment_id   INTEGER,                    -- threaded replies (optional)
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP
  -- FOREIGN KEY (post_id) REFERENCES posts(post_id),
  -- FOREIGN KEY (user_pk) REFERENCES users(user_pk)
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_post_comments_user ON post_comments(user_pk, created_at DESC);

-- Optional: saved posts
CREATE TABLE IF NOT EXISTS post_saves (
  post_id    INTEGER NOT NULL,
  user_pk    INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_pk)
  -- FOREIGN KEY (post_id) REFERENCES posts(post_id),
  -- FOREIGN KEY (user_pk) REFERENCES users(user_pk)
);
CREATE INDEX IF NOT EXISTS idx_post_saves_user ON post_saves(user_pk, created_at DESC);

-- Reports for posts
CREATE TABLE IF NOT EXISTS post_reports (
  report_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id       INTEGER NOT NULL,
  reporter_pk   INTEGER NOT NULL,
  reason        TEXT NOT NULL,
  details       TEXT,
  status        TEXT NOT NULL DEFAULT 'open',  -- open|reviewed|closed
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_by   INTEGER,
  review_note   TEXT,
  resolved_at   DATETIME
  -- FOREIGN KEY (post_id) REFERENCES posts(post_id),
  -- FOREIGN KEY (reporter_pk) REFERENCES users(user_pk)
);
CREATE INDEX IF NOT EXISTS idx_post_reports_post ON post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_reporter ON post_reports(reporter_pk);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON post_reports(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_reports_unique_reporter_post ON post_reports(post_id, reporter_pk);

-- Hashtags extracted from post captions
CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id INTEGER NOT NULL,
  tag     TEXT NOT NULL,            -- normalized lowercase without leading #
  kind    INTEGER DEFAULT 0, -- 0=basic hashtag, 1=content tag
  PRIMARY KEY (post_id, tag)
  -- FOREIGN KEY (post_id) REFERENCES posts(post_id)
);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_tag ON post_hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_tag_post ON post_hashtags(tag, post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_tag_post_kind ON post_hashtags(tag, post_id, kind);

CREATE TABLE IF NOT EXISTS post_keywords (
  post_id INTEGER NOT NULL,
  tag     TEXT NOT NULL,            -- normalized lowercase without leading #
  PRIMARY KEY (post_id, tag)
  -- FOREIGN KEY (post_id) REFERENCES posts(post_id)
);
CREATE INDEX IF NOT EXISTS idx_post_keywords_tag ON post_keywords(tag);
CREATE INDEX IF NOT EXISTS idx_post_keywords_tag_post ON post_keywords(tag, post_id);






CREATE TABLE IF NOT EXISTS gemini_batch_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gemini_batch_id TEXT NOT NULL UNIQUE,      -- batch ID from Gemini
  status TEXT NOT NULL,
  item_purpose TEXT,                         -- e.g. fetch_url_batch, prepare_content_batch

  submitted_by_admin_id INTEGER,
  model_name TEXT NOT NULL,
  prompt_version TEXT,
  prepare_mode TEXT,

  request_payload_ref TEXT,                  -- path/url/key to raw request JSON
  response_payload_ref TEXT,                 -- path/url/key to raw response JSON

  queued_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  started_at TEXT,
  completed_at TEXT,
  duration_ms INTEGER,

  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd REAL,

  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_gemini_batch_jobs_status ON gemini_batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_gemini_batch_jobs_queued_at ON gemini_batch_jobs(queued_at);
CREATE INDEX IF NOT EXISTS idx_gemini_batch_jobs_item_purpose ON gemini_batch_jobs(item_purpose);
-- Migration for existing databases:
-- ALTER TABLE gemini_batch_jobs ADD COLUMN item_purpose TEXT;

-- 2) One row per item/post inside a batch
CREATE TABLE IF NOT EXISTS gemini_batch_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_job_id INTEGER NOT NULL,
  item_purpose TEXT NOT NULL, -- e.g. fetch_url_batch
  item_type TEXT NOT NULL, -- e.g. posts
  item_id INTEGER NOT NULL, -- the pk of the item being processed, e.g. posts.post_id
  gemini_custom_id TEXT NOT NULL,            -- item-level ID you send to Gemini

  item_status TEXT NOT NULL,
  parse_ok INTEGER NOT NULL DEFAULT 0 CHECK (parse_ok IN (0,1)),
  validation_ok INTEGER NOT NULL DEFAULT 0 CHECK (validation_ok IN (0,1)),
  failure_stage TEXT,                        -- e.g. fetch|gemini|parse|validate|post_update

  result_json TEXT,                          -- parsed JSON result (stringified)
  input_ref TEXT,                            -- optional file/path/url
  output_ref TEXT,                           -- optional file/path/url

  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd REAL,

  attempt_count INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  error_message TEXT,

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gemini_batch_gemini_custom_id ON gemini_batch_items(batch_job_id, gemini_custom_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gemini_batch_item_type_items_id ON gemini_batch_items(batch_job_id, item_type, item_id);






CREATE TABLE IF NOT EXISTS web_contents (
  content_id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pk        INTEGER NOT NULL,
  write_style        TEXT,
  content_slug      TEXT UNIQUE, -- unique slug for URL
  locale         TEXT, 
  title          TEXT,
  cover_img_url    TEXT, 
  html_length    INTEGER, 
  status INTEGER DEFAULT 1, -- 0 = deleted, 1 = active
  prepare_status INTEGER DEFAULT 0, -- 0 = none, 1 = requested, 2 = done, 3 = failed
  prepare_url    TEXT, 
  prepare_src    TEXT, -- original text content of prepare_url
  prepare_content    TEXT, 
  prepare_content_refined    TEXT, 
  refine_prepare_content INTEGER, -- 0 = none, 1 = requested, 2 = done, 3 = failed
  batch_id        TEXT, -- optional batch ID if this post is part of a batch operation (e.g. AI generation)
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_web_contents_user_created ON web_contents(user_pk, created_at DESC);














-- Post taxonomy: canonical rows
CREATE TABLE IF NOT EXISTS posts_categories (
  posts_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts_subcategories (
  posts_subcategory_id INTEGER PRIMARY KEY AUTOINCREMENT,
  posts_category_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  -- FOREIGN KEY (posts_category_id) REFERENCES posts_categories(posts_category_id)
);

-- Localized labels / slugs
CREATE TABLE IF NOT EXISTS posts_category_translations (
  posts_category_id INTEGER NOT NULL,
  locale TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  -- FOREIGN KEY (posts_category_id) REFERENCES posts_categories(posts_category_id)
);

CREATE TABLE IF NOT EXISTS posts_subcategory_translations (
  posts_subcategory_id INTEGER NOT NULL,
  locale TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  -- FOREIGN KEY (posts_subcategory_id) REFERENCES posts_subcategories(posts_subcategory_id)
);

-- Many-to-many link between posts and taxonomy
CREATE TABLE IF NOT EXISTS posts_subcategory_assignments (
  post_id INTEGER NOT NULL,
  posts_subcategory_id INTEGER NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  -- FOREIGN KEY (post_id) REFERENCES posts(post_id),
  -- FOREIGN KEY (posts_subcategory_id) REFERENCES posts_subcategories(posts_subcategory_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_categories_code
ON posts_categories(code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_subcategories_category_code
ON posts_subcategories(posts_category_id, code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_category_translations_category_locale
ON posts_category_translations(posts_category_id, locale);

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_category_translations_locale_slug
ON posts_category_translations(locale, slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_subcategory_translations_subcategory_locale
ON posts_subcategory_translations(posts_subcategory_id, locale);

-- Subcategory slug is resolved together with category slug, so this is indexed but not globally unique
CREATE INDEX IF NOT EXISTS idx_posts_subcategory_translations_locale_slug
ON posts_subcategory_translations(locale, slug);

CREATE INDEX IF NOT EXISTS idx_posts_subcategories_category
ON posts_subcategories(posts_category_id, sort_order, posts_subcategory_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_subcategory_assignments_unique
ON posts_subcategory_assignments(post_id, posts_subcategory_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_subcategory_assignments_primary
ON posts_subcategory_assignments(post_id)
WHERE is_primary = 1;

CREATE INDEX IF NOT EXISTS idx_posts_subcategory_assignments_post
ON posts_subcategory_assignments(post_id, is_primary DESC, sort_order, posts_subcategory_id);

CREATE INDEX IF NOT EXISTS idx_posts_subcategory_assignments_subcategory
ON posts_subcategory_assignments(posts_subcategory_id, post_id);




INSERT OR IGNORE INTO posts_categories (code, sort_order, is_active) VALUES
  ('tech', 10, 1),
  ('gaming', 20, 1),
  ('toys', 30, 1),
  ('automotive', 40, 1),
  ('food', 50, 1),
  ('science', 60, 1),
  ('watches', 70, 1),
  ('drinks', 80, 1),
  ('clothing', 90, 1),
  ('news', 100, 1),
  ('lifestyle', 110, 1);


WITH seed(code, locale, name, slug, description, sort_order) AS (
  VALUES
    ('tech', 'en', 'Tech', 'tech', NULL, 10),
    ('gaming', 'en', 'Gaming', 'gaming', NULL, 20),
    ('toys', 'en', 'Toys', 'toys', NULL, 30),
    ('automotive', 'en', 'Automotive', 'automotive', NULL, 40),
    ('food', 'en', 'Food', 'food', NULL, 50),
    ('science', 'en', 'Science', 'science', NULL, 60),
    ('watches', 'en', 'Watches', 'watches', NULL, 70),
    ('drinks', 'en', 'Drinks', 'drinks', NULL, 80),
    ('clothing', 'en', 'Clothing', 'clothing', NULL, 90),
    ('news', 'en', 'News', 'news', NULL, 100),
    ('lifestyle', 'en', 'Lifestyle', 'lifestyle', NULL, 110)
)
INSERT OR IGNORE INTO posts_category_translations (
  posts_category_id,
  locale,
  name,
  slug,
  description
)
SELECT
  pc.posts_category_id,
  s.locale,
  s.name,
  s.slug,
  s.description
FROM seed s
JOIN posts_categories pc
  ON pc.code = s.code
ORDER BY s.sort_order;



WITH seed (
  category_code,
  subcategory_code,
  sort_order,
  is_active
) AS (
  VALUES
    ('tech', 'phones', 10, 1),
    ('tech', 'computers', 20, 1),
    ('tech', 'audio', 30, 1),
    ('tech', 'cameras', 40, 1),
    ('tech', 'apps', 50, 1),
    ('tech', 'ai', 60, 1),
    ('tech', 'smart-home', 70, 1),
    ('tech', 'accessories', 80, 1),

    ('gaming', 'console-gaming', 10, 1),
    ('gaming', 'pc-gaming', 20, 1),
    ('gaming', 'handheld-gaming', 30, 1),
    ('gaming', 'mobile-gaming', 40, 1),
    ('gaming', 'gaming-accessories', 50, 1),
    ('gaming', 'video-games', 60, 1),

    ('toys', 'action-figures', 10, 1),
    ('toys', 'collectibles', 20, 1),
    ('toys', 'building-sets', 30, 1),
    ('toys', 'board-games', 40, 1),
    ('toys', 'educational-toys', 50, 1),
    ('toys', 'remote-control', 60, 1),

    ('automotive', 'cars', 10, 1),
    ('automotive', 'ev', 20, 1),
    ('automotive', 'motorcycles', 30, 1),
    ('automotive', 'car-accessories', 40, 1),
    ('automotive', 'car-care', 50, 1),
    ('automotive', 'maintenance', 60, 1),

    ('food', 'recipes', 10, 1),
    ('food', 'restaurants', 20, 1),
    ('food', 'snacks', 30, 1),
    ('food', 'desserts', 40, 1),
    ('food', 'ingredients', 50, 1),
    ('food', 'cooking-tools', 60, 1),

    ('science', 'space', 10, 1),
    ('science', 'physics', 20, 1),
    ('science', 'biology', 30, 1),
    ('science', 'chemistry', 40, 1),
    ('science', 'earth-science', 50, 1),
    ('science', 'research', 60, 1),

    ('watches', 'luxury-watches', 10, 1),
    ('watches', 'smartwatches', 20, 1),
    ('watches', 'dress-watches', 30, 1),
    ('watches', 'sports-watches', 40, 1),
    ('watches', 'watch-accessories', 50, 1),
    ('watches', 'watch-care', 60, 1),

    ('drinks', 'coffee', 10, 1),
    ('drinks', 'tea', 20, 1),
    ('drinks', 'juice', 30, 1),
    ('drinks', 'soda', 40, 1),
    ('drinks', 'cocktails', 50, 1),
    ('drinks', 'spirits', 60, 1),

    ('clothing', 'tops', 10, 1),
    ('clothing', 'bottoms', 20, 1),
    ('clothing', 'outerwear', 30, 1),
    ('clothing', 'shoes', 40, 1),
    ('clothing', 'bags', 50, 1),
    ('clothing', 'accessories', 60, 1),

    ('news', 'breaking-news', 10, 1),
    ('news', 'product-launches', 20, 1),
    ('news', 'industry-news', 30, 1),
    ('news', 'company-news', 40, 1),
    ('news', 'policy', 50, 1),
    ('news', 'market-trends', 60, 1),

    ('lifestyle', 'home-living', 10, 1),
    ('lifestyle', 'wellness', 20, 1),
    ('lifestyle', 'travel', 30, 1),
    ('lifestyle', 'beauty', 40, 1),
    ('lifestyle', 'self-care', 50, 1),
    ('lifestyle', 'productivity', 60, 1)
)
INSERT OR IGNORE INTO posts_subcategories (
  posts_category_id,
  code,
  sort_order,
  is_active
)
SELECT
  pc.posts_category_id,
  s.subcategory_code,
  s.sort_order,
  s.is_active
FROM seed s
JOIN posts_categories pc
  ON pc.code = s.category_code
ORDER BY s.category_code, s.sort_order;



WITH seed (
  category_code,
  subcategory_code,
  locale,
  name,
  slug,
  description,
  sort_order
) AS (
  VALUES
    ('tech', 'phones', 'en', 'Phones', 'phones', NULL, 10),
    ('tech', 'computers', 'en', 'Computers', 'computers', NULL, 20),
    ('tech', 'audio', 'en', 'Audio', 'audio', NULL, 30),
    ('tech', 'cameras', 'en', 'Cameras', 'cameras', NULL, 40),
    ('tech', 'apps', 'en', 'Apps', 'apps', NULL, 50),
    ('tech', 'ai', 'en', 'AI', 'ai', NULL, 60),
    ('tech', 'smart-home', 'en', 'Smart Home', 'smart-home', NULL, 70),
    ('tech', 'accessories', 'en', 'Accessories', 'accessories', NULL, 80),

    ('gaming', 'console-gaming', 'en', 'Console Gaming', 'console-gaming', NULL, 10),
    ('gaming', 'pc-gaming', 'en', 'PC Gaming', 'pc-gaming', NULL, 20),
    ('gaming', 'handheld-gaming', 'en', 'Handheld Gaming', 'handheld-gaming', NULL, 30),
    ('gaming', 'mobile-gaming', 'en', 'Mobile Gaming', 'mobile-gaming', NULL, 40),
    ('gaming', 'gaming-accessories', 'en', 'Gaming Accessories', 'gaming-accessories', NULL, 50),
    ('gaming', 'video-games', 'en', 'Video Games', 'video-games', NULL, 60),

    ('toys', 'action-figures', 'en', 'Action Figures', 'action-figures', NULL, 10),
    ('toys', 'collectibles', 'en', 'Collectibles', 'collectibles', NULL, 20),
    ('toys', 'building-sets', 'en', 'Building Sets', 'building-sets', NULL, 30),
    ('toys', 'board-games', 'en', 'Board Games', 'board-games', NULL, 40),
    ('toys', 'educational-toys', 'en', 'Educational Toys', 'educational-toys', NULL, 50),
    ('toys', 'remote-control', 'en', 'Remote Control', 'remote-control', NULL, 60),

    ('automotive', 'cars', 'en', 'Cars', 'cars', NULL, 10),
    ('automotive', 'ev', 'en', 'EV', 'ev', NULL, 20),
    ('automotive', 'motorcycles', 'en', 'Motorcycles', 'motorcycles', NULL, 30),
    ('automotive', 'car-accessories', 'en', 'Car Accessories', 'car-accessories', NULL, 40),
    ('automotive', 'car-care', 'en', 'Car Care', 'car-care', NULL, 50),
    ('automotive', 'maintenance', 'en', 'Maintenance', 'maintenance', NULL, 60),

    ('food', 'recipes', 'en', 'Recipes', 'recipes', NULL, 10),
    ('food', 'restaurants', 'en', 'Restaurants', 'restaurants', NULL, 20),
    ('food', 'snacks', 'en', 'Snacks', 'snacks', NULL, 30),
    ('food', 'desserts', 'en', 'Desserts', 'desserts', NULL, 40),
    ('food', 'ingredients', 'en', 'Ingredients', 'ingredients', NULL, 50),
    ('food', 'cooking-tools', 'en', 'Cooking Tools', 'cooking-tools', NULL, 60),

    ('science', 'space', 'en', 'Space', 'space', NULL, 10),
    ('science', 'physics', 'en', 'Physics', 'physics', NULL, 20),
    ('science', 'biology', 'en', 'Biology', 'biology', NULL, 30),
    ('science', 'chemistry', 'en', 'Chemistry', 'chemistry', NULL, 40),
    ('science', 'earth-science', 'en', 'Earth Science', 'earth-science', NULL, 50),
    ('science', 'research', 'en', 'Research', 'research', NULL, 60),

    ('watches', 'luxury-watches', 'en', 'Luxury Watches', 'luxury-watches', NULL, 10),
    ('watches', 'smartwatches', 'en', 'Smartwatches', 'smartwatches', NULL, 20),
    ('watches', 'dress-watches', 'en', 'Dress Watches', 'dress-watches', NULL, 30),
    ('watches', 'sports-watches', 'en', 'Sports Watches', 'sports-watches', NULL, 40),
    ('watches', 'watch-accessories', 'en', 'Watch Accessories', 'watch-accessories', NULL, 50),
    ('watches', 'watch-care', 'en', 'Watch Care', 'watch-care', NULL, 60),

    ('drinks', 'coffee', 'en', 'Coffee', 'coffee', NULL, 10),
    ('drinks', 'tea', 'en', 'Tea', 'tea', NULL, 20),
    ('drinks', 'juice', 'en', 'Juice', 'juice', NULL, 30),
    ('drinks', 'soda', 'en', 'Soda', 'soda', NULL, 40),
    ('drinks', 'cocktails', 'en', 'Cocktails', 'cocktails', NULL, 50),
    ('drinks', 'spirits', 'en', 'Spirits', 'spirits', NULL, 60),

    ('clothing', 'tops', 'en', 'Tops', 'tops', NULL, 10),
    ('clothing', 'bottoms', 'en', 'Bottoms', 'bottoms', NULL, 20),
    ('clothing', 'outerwear', 'en', 'Outerwear', 'outerwear', NULL, 30),
    ('clothing', 'shoes', 'en', 'Shoes', 'shoes', NULL, 40),
    ('clothing', 'bags', 'en', 'Bags', 'bags', NULL, 50),
    ('clothing', 'accessories', 'en', 'Accessories', 'accessories', NULL, 60),

    ('news', 'breaking-news', 'en', 'Breaking News', 'breaking-news', NULL, 10),
    ('news', 'product-launches', 'en', 'Product Launches', 'product-launches', NULL, 20),
    ('news', 'industry-news', 'en', 'Industry News', 'industry-news', NULL, 30),
    ('news', 'company-news', 'en', 'Company News', 'company-news', NULL, 40),
    ('news', 'policy', 'en', 'Policy', 'policy', NULL, 50),
    ('news', 'market-trends', 'en', 'Market Trends', 'market-trends', NULL, 60),

    ('lifestyle', 'home-living', 'en', 'Home Living', 'home-living', NULL, 10),
    ('lifestyle', 'wellness', 'en', 'Wellness', 'wellness', NULL, 20),
    ('lifestyle', 'travel', 'en', 'Travel', 'travel', NULL, 30),
    ('lifestyle', 'beauty', 'en', 'Beauty', 'beauty', NULL, 40),
    ('lifestyle', 'self-care', 'en', 'Self Care', 'self-care', NULL, 50),
    ('lifestyle', 'productivity', 'en', 'Productivity', 'productivity', NULL, 60)
)
INSERT OR IGNORE INTO posts_subcategory_translations (
  posts_subcategory_id,
  locale,
  name,
  slug,
  description
)
SELECT
  psc.posts_subcategory_id,
  s.locale,
  s.name,
  s.slug,
  s.description
FROM seed s
JOIN posts_categories pc
  ON pc.code = s.category_code
JOIN posts_subcategories psc
  ON psc.posts_category_id = pc.posts_category_id
 AND psc.code = s.subcategory_code
ORDER BY s.category_code, s.sort_order;
