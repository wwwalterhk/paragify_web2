export type FeedPageScale = "4:5" | "3:4" | "1:1";

type PostRow = {
	post_id: number;
	post_slug: string | null;
	title: string | null;
	caption: string | null;
	like_count: number;
	comment_count: number;
	liked: number;
	saved: number;
	created_at: string | null;
	author_name: string | null;
	author_id: string | null;
	author_avatar: string | null;
	cover_img_url: string | null;
	generate_cover_img: number | null;
	cover_media_url: string | null;
	cover_raw_media_url: string | null;
	cover_media_type: string | null;
	cover_layout_json: string | null;
	page_count: number;
};

type PostPageRow = {
	post_id: number;
	page_num: number;
	media_url: string | null;
	raw_media_url: string | null;
	media_type: string | null;
};

export type FeedMediaItem = {
	page_num: number;
	media_type: "image" | "video";
	source_url: string | null;
	transformed_image_url: string | null;
};

export type FeedPost = {
	post_id: number;
	post_slug: string | null;
	title: string | null;
	caption: string | null;
	like_count: number;
	comment_count: number;
	liked: boolean;
	saved: boolean;
	created_at: string | null;
	author_name: string | null;
	author_id: string | null;
	author_avatar: string | null;
	cover_media_url: string | null;
	cover_raw_media_url: string | null;
	cover_media_type: string | null;
	cover_layout_json: string | null;
	page_count: number;
	media_items: FeedMediaItem[];
};

export type FeedCursor = {
	created_at: string;
	post_id: number;
};

export type LoadFeedPostsOptions = {
	limit?: number;
	cursorCreatedAt?: string | null;
	cursorPostId?: number | null;
	viewerUserPk?: number | null;
	tag?: string | null;
	authorUserId?: string | null;
};

export type LoadFeedPostsResult = {
	posts: FeedPost[];
	hasMore: boolean;
	nextCursor: FeedCursor | null;
};

const FEED_IMAGE_WIDTH = 1080;
const IMAGE_CDN_ORIGINS = ["https://cdn.paragify.com", "https://cdn2.paragify.com", "https://cdn3.paragify.com"] as const;
const PRIMARY_CDN_ORIGIN = IMAGE_CDN_ORIGINS[0];
const IMAGE_CDN_HOSTNAMES = new Set(IMAGE_CDN_ORIGINS.map((origin) => new URL(origin).hostname));
const compactNumberFormatter = new Intl.NumberFormat("en-US", {
	notation: "compact",
	maximumFractionDigits: 1,
});

export const DEFAULT_FEED_PAGE_SIZE = 12;
const MAX_FEED_PAGE_SIZE = 30;

function isFeedPageScale(value: unknown): value is FeedPageScale {
	return value === "4:5" || value === "3:4" || value === "1:1";
}

function normalizeR2MediaKey(source: string): string {
	return source.replace(/^\/+/, "");
}

function extractMediaKeyFromCdnPath(pathname: string): string | null {
	const normalizedPath = pathname.trim();
	if (!normalizedPath) {
		return null;
	}

	const cdnImagePrefix = "/cdn-cgi/image/";
	if (!normalizedPath.startsWith(cdnImagePrefix)) {
		return normalizeR2MediaKey(normalizedPath);
	}

	const remainder = normalizedPath.slice(cdnImagePrefix.length);
	const separatorIndex = remainder.indexOf("/");
	if (separatorIndex < 0) {
		return null;
	}
	const encodedMediaKey = remainder.slice(separatorIndex + 1);
	if (!encodedMediaKey) {
		return null;
	}

	try {
		return normalizeR2MediaKey(decodeURIComponent(encodedMediaKey));
	} catch {
		return normalizeR2MediaKey(encodedMediaKey);
	}
}

export function parseFeedCoverPageScale(layoutJson: string | null): FeedPageScale {
	if (!layoutJson) {
		return "4:5";
	}

	let current: unknown = layoutJson;
	for (let depth = 0; depth < 4; depth += 1) {
		if (typeof current !== "string") {
			break;
		}
		const trimmed = current.trim();
		if (!trimmed) {
			return "4:5";
		}
		try {
			current = JSON.parse(trimmed) as unknown;
		} catch {
			return "4:5";
		}
	}

	if (!current || typeof current !== "object") {
		return "4:5";
	}

	const pageScale = (current as Record<string, unknown>).page_scale;
	return isFeedPageScale(pageScale) ? pageScale : "4:5";
}

function selectImageCdnOrigin(mediaKey: string): string {
	const normalizedKey = normalizeR2MediaKey(mediaKey);
	let hash = 0;

	for (let index = 0; index < normalizedKey.length; index += 1) {
		hash = (hash + normalizedKey.charCodeAt(index)) % 2147483647;
	}

	return IMAGE_CDN_ORIGINS[hash % IMAGE_CDN_ORIGINS.length];
}

function getR2MediaKeyFromSources(mediaUrl: string | null, rawMediaUrl: string | null): string | null {
	const source = mediaUrl;
	if (source) {
		if (source.startsWith("/api/media?")) {
			try {
				const url = new URL(source, PRIMARY_CDN_ORIGIN);
				const key = url.searchParams.get("key");
				if (key) {
					return normalizeR2MediaKey(decodeURIComponent(key));
				}
			} catch {
				// Fall through to generic handling.
			}
		}

		if (source.startsWith("/cdn-cgi/image/")) {
			const mediaKey = extractMediaKeyFromCdnPath(source);
			if (mediaKey) {
				return mediaKey;
			}
		}

		if (source.startsWith("http://") || source.startsWith("https://")) {
			try {
				const url = new URL(source);
				if (IMAGE_CDN_HOSTNAMES.has(url.hostname)) {
					const mediaKey = extractMediaKeyFromCdnPath(url.pathname);
					if (mediaKey) {
						return mediaKey;
					}
				}
			} catch {
				return null;
			}
		}

		if (source.startsWith("data:") || source.startsWith("blob:")) {
			return null;
		}

		return normalizeR2MediaKey(source);
	}

	if (rawMediaUrl) {
		return normalizeR2MediaKey(rawMediaUrl);
	}

	return null;
}

function getFeedImageTransformOptions(): string {
	return `width=${FEED_IMAGE_WIDTH},quality=85,format=auto`;
}

function getCloudflareTransformedImageUrl(mediaKey: string | null): string | null {
	if (!mediaKey) {
		return null;
	}

	const cdnOrigin = selectImageCdnOrigin(mediaKey);
	const transformOptions = getFeedImageTransformOptions();
	return `${cdnOrigin}/cdn-cgi/image/${transformOptions}/${normalizeR2MediaKey(mediaKey)}`;
}

function toFeedMediaType(value: string | null): "image" | "video" {
	const normalized = value?.toLowerCase().trim() ?? "";
	return normalized.startsWith("video") ? "video" : "image";
}

function buildFeedMediaItem(
	pageNum: number,
	mediaUrl: string | null,
	rawMediaUrl: string | null,
	mediaType: string | null,
): FeedMediaItem | null {
	const mediaKey = getR2MediaKeyFromSources(mediaUrl, rawMediaUrl);
	if (!mediaKey) {
		return null;
	}

	const mediaTypeNormalized = toFeedMediaType(mediaType);
	const cdnOrigin = selectImageCdnOrigin(mediaKey);
	return {
		page_num: pageNum,
		media_type: mediaTypeNormalized,
		source_url: `${cdnOrigin}/${mediaKey}`,
			transformed_image_url:
				mediaTypeNormalized === "video"
					? null
					: getCloudflareTransformedImageUrl(mediaKey),
		};
}

function buildPreferredCoverMediaItem(coverImgUrl: string | null): FeedMediaItem | null {
	const normalizedUrl = coverImgUrl?.trim() ?? "";
	if (!normalizedUrl) {
		return null;
	}

	const transformedMediaItem = buildFeedMediaItem(1, normalizedUrl, normalizedUrl, "image");
	if (transformedMediaItem) {
		return transformedMediaItem;
	}

	if (normalizedUrl.startsWith("http://") || normalizedUrl.startsWith("https://") || normalizedUrl.startsWith("/")) {
		return {
			page_num: 1,
			media_type: "image",
			source_url: normalizedUrl,
			transformed_image_url: null,
		};
	}

	return null;
}

function toSafeLimit(limit: number | undefined): number {
	if (!Number.isFinite(limit)) {
		return DEFAULT_FEED_PAGE_SIZE;
	}
	return Math.min(MAX_FEED_PAGE_SIZE, Math.max(1, Math.floor(limit ?? DEFAULT_FEED_PAGE_SIZE)));
}

function normalizeFeedTag(value: string | null | undefined): string | null {
	if (!value) {
		return null;
	}
	const normalized = value
		.replace(/^#+/, "")
		.normalize("NFKC")
		.replace(/^[^A-Za-z0-9\u00C0-\uFFFF_-]+/, "")
		.replace(/[^A-Za-z0-9\u00C0-\uFFFF_-]+$/, "")
		.trim()
		.toLowerCase();
	return normalized || null;
}

function normalizeFeedUserId(value: string | null | undefined): string | null {
	if (!value) {
		return null;
	}
	const normalized = value.replace(/^@+/, "").normalize("NFKC").trim().toLowerCase();
	if (!normalized || !/^[a-z0-9._-]+$/.test(normalized)) {
		return null;
	}
	return normalized;
}

async function hasTable(db: D1Database, tableName: string): Promise<boolean> {
	try {
		const row = await db
			.prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
			.bind(tableName)
			.first<{ present: number }>();
		return Boolean(row?.present);
	} catch {
		return false;
	}
}

function buildFeedPosts(postRows: PostRow[], pageRows: PostPageRow[]): FeedPost[] {
	const pagesByPostId = new Map<number, PostPageRow[]>();
	for (const pageRow of pageRows) {
		const bucket = pagesByPostId.get(pageRow.post_id);
		if (bucket) {
			bucket.push(pageRow);
		} else {
			pagesByPostId.set(pageRow.post_id, [pageRow]);
		}
	}

	return postRows.map((post) => {
		const mediaItems: FeedMediaItem[] = [];
		const relatedPageRows = pagesByPostId.get(post.post_id) ?? [];
		for (const pageRow of relatedPageRows) {
			const mediaItem = buildFeedMediaItem(
				pageRow.page_num,
				pageRow.media_url,
				pageRow.raw_media_url,
				pageRow.media_type,
			);
			if (mediaItem) {
				mediaItems.push(mediaItem);
			}
		}

		if (mediaItems.length === 0) {
			const coverMedia = buildFeedMediaItem(
				1,
				post.cover_media_url,
				post.cover_raw_media_url,
				post.cover_media_type,
			);
			if (coverMedia) {
				mediaItems.push(coverMedia);
			}
		}

		const shouldUseGeneratedCover =
			Number(post.generate_cover_img ?? 0) === 2 &&
			(post.cover_img_url?.trim() ?? "").length > 0;
		if (shouldUseGeneratedCover) {
			const generatedCoverMedia = buildPreferredCoverMediaItem(post.cover_img_url);
			if (generatedCoverMedia) {
				for (let index = 0; index < mediaItems.length; index += 1) {
					mediaItems[index] = {
						...mediaItems[index],
						page_num: mediaItems[index].page_num + 1,
					};
				}
				mediaItems.unshift({
					...generatedCoverMedia,
					page_num: 1,
				});
			}
		}

		return {
			...post,
			liked: Boolean(post.liked),
			saved: Boolean(post.saved),
			media_items: mediaItems,
		};
	});
}

export async function loadFeedPosts(db: D1Database, options?: LoadFeedPostsOptions): Promise<LoadFeedPostsResult> {
	const limit = toSafeLimit(options?.limit);
	const queryLimit = limit + 1;
	const cursorCreatedAt = options?.cursorCreatedAt?.trim() || null;
	const cursorPostId =
		typeof options?.cursorPostId === "number" && Number.isFinite(options.cursorPostId)
			? Math.floor(options.cursorPostId)
			: null;
	const viewerUserPk =
		typeof options?.viewerUserPk === "number" && Number.isFinite(options.viewerUserPk) && options.viewerUserPk > 0
			? Math.floor(options.viewerUserPk)
			: null;
	const tag = normalizeFeedTag(options?.tag);
	const authorUserId = normalizeFeedUserId(options?.authorUserId);
	const hasCursor = Boolean(cursorCreatedAt && cursorPostId && cursorPostId > 0);
	const [likesTableAvailable, savesTableAvailable] = viewerUserPk
		? await Promise.all([hasTable(db, "post_likes"), hasTable(db, "post_saves")])
		: [false, false];

	const likedSelect =
		viewerUserPk && likesTableAvailable
			? "EXISTS (SELECT 1 FROM post_likes pl WHERE pl.post_id = p.post_id AND pl.user_pk = ?) AS liked"
			: "0 AS liked";
	const savedSelect =
		viewerUserPk && savesTableAvailable
			? "EXISTS (SELECT 1 FROM post_saves ps WHERE ps.post_id = p.post_id AND ps.user_pk = ?) AS saved"
			: "0 AS saved";

	const query = `
		SELECT
			p.post_id,
			p.post_slug,
			p.title,
			p.caption,
			p.like_count,
			p.comment_count,
			${likedSelect},
			${savedSelect},
			p.created_at,
			u.name AS author_name,
			u.user_id AS author_id,
			u.avatar_url AS author_avatar,
			p.cover_img_url,
			p.generate_cover_img,
			cp.media_url AS cover_media_url,
			cp.raw_media_url AS cover_raw_media_url,
			cp.media_type AS cover_media_type,
			cp.layout_json AS cover_layout_json,
			COUNT(pp.page_id) AS page_count
		FROM posts p
		LEFT JOIN users u ON u.user_pk = p.user_pk
		LEFT JOIN post_pages cp
			ON cp.post_id = p.post_id
			AND cp.page_num = p.cover_page
		LEFT JOIN post_pages pp ON pp.post_id = p.post_id
		WHERE p.visibility = 'public'
			${tag ? "AND EXISTS (SELECT 1 FROM post_hashtags ph WHERE ph.post_id = p.post_id AND ph.tag = ?)" : ""}
			${authorUserId ? "AND lower(u.user_id) = ?" : ""}
			${hasCursor ? "AND (p.created_at < ? OR (p.created_at = ? AND p.post_id < ?))" : ""}
		GROUP BY
			p.post_id,
			p.post_slug,
			p.title,
			p.caption,
			p.like_count,
			p.comment_count,
			p.created_at,
			u.name,
			u.user_id,
			u.avatar_url,
			p.cover_img_url,
			p.generate_cover_img,
			cp.media_url,
			cp.raw_media_url,
			cp.media_type,
			cp.layout_json
		ORDER BY p.created_at DESC, p.post_id DESC
		LIMIT ?
	`;

	const queryBindings: Array<number | string> = [];
	if (viewerUserPk && likesTableAvailable) {
		queryBindings.push(viewerUserPk);
	}
	if (viewerUserPk && savesTableAvailable) {
		queryBindings.push(viewerUserPk);
	}
	if (tag) {
		queryBindings.push(tag);
	}
	if (authorUserId) {
		queryBindings.push(authorUserId);
	}
	if (hasCursor) {
		queryBindings.push(cursorCreatedAt as string, cursorCreatedAt as string, cursorPostId as number);
	}
	queryBindings.push(queryLimit);

	const result = await db.prepare(query).bind(...queryBindings).all<PostRow>();
	const allRows = result.results ?? [];
	const hasMore = allRows.length > limit;
	const selectedRows = hasMore ? allRows.slice(0, limit) : allRows;

	if (selectedRows.length === 0) {
		return {
			posts: [],
			hasMore: false,
			nextCursor: null,
		};
	}

	const postIds = selectedRows.map((post) => post.post_id);
	const pagePlaceholders = postIds.map(() => "?").join(", ");
	const pagesQuery = `
		SELECT
			post_id,
			page_num,
			media_url,
			raw_media_url,
			media_type
		FROM post_pages
		WHERE post_id IN (${pagePlaceholders})
		ORDER BY post_id DESC, page_num ASC
	`;
	const pagesResult = await db.prepare(pagesQuery).bind(...postIds).all<PostPageRow>();
	const posts = buildFeedPosts(selectedRows, pagesResult.results ?? []);

	const lastPost = selectedRows[selectedRows.length - 1];
	const nextCursor =
		lastPost && lastPost.created_at
			? {
					created_at: lastPost.created_at,
					post_id: lastPost.post_id,
			  }
			: null;

	return {
		posts,
		hasMore: hasMore && Boolean(nextCursor),
		nextCursor,
	};
}

export function formatFeedDate(value: string | null): string {
	if (!value) {
		return "just now";
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "just now";
	}

	const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
	if (diffMinutes < 1) {
		return "just now";
	}
	if (diffMinutes < 60) {
		return `${diffMinutes}m`;
	}
	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) {
		return `${diffHours}h`;
	}
	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) {
		return `${diffDays}d`;
	}

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

export function formatFeedCount(value: number): string {
	return compactNumberFormatter.format(Math.max(0, value));
}

export function getFeedHandle(post: Pick<FeedPost, "post_id" | "author_id" | "author_name">): string {
	const raw = post.author_id || post.author_name || `user${post.post_id}`;
	return raw.trim() || `user${post.post_id}`;
}

export function getFeedAvatarInitials(value: string): string {
	const parts = value
		.trim()
		.replace(/[_\-.]+/g, " ")
		.split(/\s+/)
		.filter(Boolean);
	if (parts.length === 0) {
		return "IG";
	}
	if (parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase();
	}
	return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}
