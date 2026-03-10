import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import type { CSSProperties, ReactNode } from "react";
import { authOptions } from "@/lib/auth-options";
import { FeedPostMediaCarousel } from "@/app/components/feed-post-media-carousel";
import { PostComment, PostDetailComments } from "./post-detail-comments";

export const dynamic = "force-dynamic";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type PageProps = {
	params: Promise<{ locale: string; slug: string }>;
};

type FeedPageScale = "4:5" | "3:4" | "1:1";

type PostRow = {
	post_id: number;
	post_slug: string | null;
	title: string | null;
	caption: string | null;
	prepare_content: string | null;
	like_count: number;
	comment_count: number;
	created_at: string | null;
	author_name: string | null;
	author_id: string | null;
	author_avatar: string | null;
	cover_media_url: string | null;
	cover_raw_media_url: string | null;
	cover_media_type: string | null;
	cover_layout_json: string | null;
	liked_by_me: number | null;
};

type PostPageRow = {
	post_id: number;
	page_num: number;
	media_url: string | null;
	raw_media_url: string | null;
	media_type: string | null;
};

type FeedMediaItem = {
	page_num: number;
	media_type: "image" | "video";
	source_url: string | null;
	transformed_image_url: string | null;
};

type PostDetail = {
	post: PostRow;
	pageScale: FeedPageScale;
	pageCount: number;
	mediaItems: FeedMediaItem[];
	comments: PostComment[];
};

type PrepareContentParagraphType = "p" | "image" | "hashtags";

type PrepareContentParagraph = {
	type: PrepareContentParagraphType;
	heading: string | null;
	content: string | null;
	url: string | null;
	hashtags: string[];
	backgroundColor: string | null;
	headingColor: string | null;
	textColor: string | null;
};

type PrepareContentHeadingImage = {
	slot: 1 | 2;
	url: string;
	heading: string | null;
	description: string | null;
	backgroundColor: string | null;
	headingColor: string | null;
	textColor: string | null;
};

type PrepareContentView = {
	title: string | null;
	eyebrow: string | null;
	subtitle: string | null;
	footerLine: string | null;
	headingHashtags: string[];
	headingImages: PrepareContentHeadingImage[];
	paragraphs: PrepareContentParagraph[];
};

type Locale = "en" | "zh";

const copy: Record<
	Locale,
	{
		back: string;
		likes: string;
		comments: string;
		pages: string;
		noCaption: string;
		posted: string;
	}
> = {
	en: {
		back: "Back to feed",
		likes: "likes",
		comments: "comments",
		pages: "pages",
		noCaption: "No caption.",
		posted: "Posted",
	},
	zh: {
		back: "返回首頁",
		likes: "讚好",
		comments: "留言",
		pages: "頁",
		noCaption: "沒有內文。",
		posted: "發佈於",
	},
};

const FEED_IMAGE_WIDTH = 1080;
const FEED_PAGE_SCALE_DIMENSIONS: Record<FeedPageScale, { width: number; height: number }> = {
	"4:5": { width: 4, height: 5 },
	"3:4": { width: 3, height: 4 },
	"1:1": { width: 1, height: 1 },
};
const IMAGE_CDN_ORIGINS = ["https://cdn.paragify.com", "https://cdn2.paragify.com", "https://cdn3.paragify.com"] as const;
const PRIMARY_CDN_ORIGIN = IMAGE_CDN_ORIGINS[0];
const IMAGE_CDN_HOSTNAMES = new Set(IMAGE_CDN_ORIGINS.map((origin) => new URL(origin).hostname));
const HASHTAG_MATCH_PATTERN = /#[\p{L}\p{N}\p{M}_]+/gu;
const PREPARE_CONTENT_HASHTAG_LINK_CLASSNAME =
	"inline-flex items-center rounded-full px-2 py-0.5 font-semibold leading-tight ring-1 transition-opacity hover:opacity-90";
const PREPARE_CONTENT_HASHTAG_LINK_STYLE: CSSProperties = {
	backgroundColor: "color-mix(in srgb, var(--accent-2) 14%, var(--surface))",
	color: "var(--accent-2)",
	borderColor: "color-mix(in srgb, var(--accent-2) 35%, transparent)",
};
const SITE_NAME = "Paragify";
const DEFAULT_SITE_URL = "http://localhost:3000";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, "");

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
	notation: "compact",
	maximumFractionDigits: 1,
});

function mapLocale(rawLocale: string): Locale {
	return rawLocale.toLowerCase() === "en" ? "en" : "zh";
}

function formatDate(value: string | null): string {
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

function formatCount(value: number): string {
	return compactNumberFormatter.format(Math.max(0, value));
}

function getHandle(post: Pick<PostRow, "post_id" | "author_name" | "author_id">): string {
	const raw = post.author_id || post.author_name || `user${post.post_id}`;
	return raw.trim() || `user${post.post_id}`;
}

function getAvatarInitials(value: string): string {
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

function parseCaption(caption: string): { content: string; hashtags: string[] } {
	const hashtags = caption.match(HASHTAG_MATCH_PATTERN) ?? [];
	const content = caption
		.replace(HASHTAG_MATCH_PATTERN, "")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n[ \t]+/g, "\n")
		.replace(/[ \t]{2,}/g, " ")
		.trim();
	return { content, hashtags };
}

function toObjectRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toTrimmedText(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function toPrepareContentHexColor(value: unknown): string | null {
	const trimmed = toTrimmedText(value);
	if (!trimmed) {
		return null;
	}

	const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
	if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(normalized)) {
		return null;
	}

	return normalized;
}

function toTextColorStyle(value: string | null): CSSProperties | undefined {
	return value ? { color: value } : undefined;
}

function toBackgroundColorStyle(value: string | null): CSSProperties | undefined {
	return value ? { backgroundColor: value } : undefined;
}

function renderTextWithHashtagLinks(
	value: string,
	getFeedTagHref: (hashtag: string) => string,
	keyPrefix: string,
): ReactNode {
	const nodes: ReactNode[] = [];
	const hashtagMatches = Array.from(value.matchAll(/#[\p{L}\p{N}\p{M}_]+/gu));
	let cursor = 0;

	for (let index = 0; index < hashtagMatches.length; index += 1) {
		const match = hashtagMatches[index];
		const hashtag = match[0];
		const startIndex = match.index ?? 0;

		if (startIndex > cursor) {
			nodes.push(value.slice(cursor, startIndex));
		}

		nodes.push(
			<Link
				key={`${keyPrefix}-hashtag-${index}-${startIndex}`}
				href={getFeedTagHref(hashtag)}
				className={PREPARE_CONTENT_HASHTAG_LINK_CLASSNAME}
				style={PREPARE_CONTENT_HASHTAG_LINK_STYLE}
			>
				{hashtag}
			</Link>,
		);

		cursor = startIndex + hashtag.length;
	}

	if (cursor < value.length) {
		nodes.push(value.slice(cursor));
	}

	return nodes.length > 0 ? nodes : value;
}

function parsePossiblyEscapedJson(value: unknown, maxDepth = 4): unknown {
	let current: unknown = value;

	for (let depth = 0; depth < maxDepth; depth += 1) {
		if (typeof current !== "string") {
			return current;
		}
		const trimmed = current.trim();
		if (!trimmed) {
			return null;
		}

		try {
			const parsed = JSON.parse(trimmed) as unknown;
			if (parsed === current) {
				return parsed;
			}
			current = parsed;
		} catch {
			return current;
		}
	}

	return current;
}

function toNormalizedHashtags(value: string | null): string[] {
	if (!value) {
		return [];
	}

	const matches = value.match(HASHTAG_MATCH_PATTERN) ?? [];
	if (matches.length > 0) {
		return Array.from(new Set(matches));
	}

	return Array.from(
		new Set(
			value
				.split(/\s+/)
				.map((token) => token.trim())
				.filter(Boolean)
				.map((token) => (token.startsWith("#") ? token : `#${token}`)),
		),
	);
}

function parsePrepareContent(value: string | null): PrepareContentView | null {
	if (!value) {
		return null;
	}

	const parsed = parsePossiblyEscapedJson(value, 4);
	const root = toObjectRecord(parsed);
	if (!root) {
		return null;
	}

	const headingImages: PrepareContentHeadingImage[] = [];
	for (const [key, slot] of [
		["heading_image_1", 1],
		["heading_image_2", 2],
	] as const) {
		const imageRecord = toObjectRecord(root[key]);
		const url = toPrepareContentImageUrl(toTrimmedText(imageRecord?.url));
		if (!url) {
			continue;
		}
		headingImages.push({
			slot,
			url,
			heading: toTrimmedText(imageRecord?.heading),
			description: toTrimmedText(imageRecord?.desc),
			backgroundColor: toPrepareContentHexColor(imageRecord?.background_color),
			headingColor: toPrepareContentHexColor(imageRecord?.heading_color),
			textColor: toPrepareContentHexColor(imageRecord?.text_color ?? imageRecord?.content_color),
		});
	}

	const rawParagraphs = Array.isArray(root.paragraphs) ? root.paragraphs : [];
	const paragraphs: PrepareContentParagraph[] = [];
	for (const rawParagraph of rawParagraphs) {
		const paragraphRecord = toObjectRecord(rawParagraph);
		if (!paragraphRecord) {
			continue;
		}
		const paragraphTypeRaw = toTrimmedText(paragraphRecord.type)?.toLowerCase();
		if (paragraphTypeRaw !== "p" && paragraphTypeRaw !== "image" && paragraphTypeRaw !== "hashtags") {
			continue;
		}

		const paragraphType = paragraphTypeRaw as PrepareContentParagraphType;
		const heading = toTrimmedText(paragraphRecord.heading);
		const content = toTrimmedText(paragraphRecord.content);
		const rawUrl = toTrimmedText(paragraphRecord.url);
		const url = paragraphType === "image" ? toPrepareContentImageUrl(rawUrl) : rawUrl;
		const hashtags = paragraphType === "hashtags" ? toNormalizedHashtags(content) : [];

		if (paragraphType === "p" && !heading && !content) {
			continue;
		}
		if (paragraphType === "image" && !heading && !content && !url) {
			continue;
		}
		if (paragraphType === "hashtags" && hashtags.length === 0) {
			continue;
		}

		paragraphs.push({
			type: paragraphType,
			heading,
			content,
			url,
			hashtags,
			backgroundColor: toPrepareContentHexColor(paragraphRecord.background_color),
			headingColor: toPrepareContentHexColor(paragraphRecord.heading_color),
			textColor: toPrepareContentHexColor(paragraphRecord.text_color ?? paragraphRecord.content_color),
		});
	}

	const prepared = {
		title: toTrimmedText(root.title),
		eyebrow: toTrimmedText(root.eyeblow ?? root.eyebrow),
		subtitle: toTrimmedText(root.subtitle),
		footerLine: toTrimmedText(root.footer_line),
		headingHashtags: toNormalizedHashtags(toTrimmedText(root.heading_hashtags)),
		headingImages,
		paragraphs,
	};

	if (
		!prepared.title &&
		!prepared.eyebrow &&
		!prepared.subtitle &&
		!prepared.footerLine &&
		prepared.headingHashtags.length === 0 &&
		prepared.headingImages.length === 0 &&
		prepared.paragraphs.length === 0
	) {
		return null;
	}

	return prepared;
}

function toPrepareContentImageUrl(value: string | null): string | null {
	if (!value) {
		return null;
	}
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}
	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		return trimmed;
	}
	return `${PRIMARY_CDN_ORIGIN}/${normalizeR2MediaKey(trimmed)}`;
}

function trimForMeta(value: string, maxLength: number): string {
	const normalized = value.replace(/\s+/g, " ").trim();
	if (normalized.length <= maxLength) {
		return normalized;
	}

	const sliced = normalized.slice(0, maxLength);
	const breakPoint = sliced.lastIndexOf(" ");
	if (breakPoint > Math.floor(maxLength * 0.6)) {
		return `${sliced.slice(0, breakPoint).trimEnd()}…`;
	}
	return `${sliced.trimEnd()}…`;
}

function getPostSlugRef(post: Pick<PostRow, "post_slug" | "post_id">): string {
	const slug = post.post_slug?.trim();
	if (slug) {
		return slug;
	}
	return String(post.post_id);
}

function buildPostPath(locale: Locale, slugRef: string): string {
	return `/post/${locale}/${encodeURIComponent(slugRef)}`;
}

function toAbsoluteUrl(path: string): string {
	if (path.startsWith("http://") || path.startsWith("https://")) {
		return path;
	}
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${SITE_URL}${normalizedPath}`;
}

function getPrimarySeoImageUrl(post: PostRow, mediaItems: FeedMediaItem[]): string | null {
	const firstMedia = mediaItems[0];
	const mediaItemImage = firstMedia?.transformed_image_url || firstMedia?.source_url || null;
	if (mediaItemImage) {
		return mediaItemImage;
	}

	const pageScale = parseFeedCoverPageScale(post.cover_layout_json);
	const coverMedia = buildFeedMediaItem(
		1,
		post.cover_media_url,
		post.cover_raw_media_url,
		post.cover_media_type,
		pageScale,
	);
	return coverMedia?.transformed_image_url || coverMedia?.source_url || null;
}

function buildSeoSummary(
	post: Pick<PostRow, "post_id" | "title" | "caption" | "prepare_content" | "author_name" | "author_id">,
	prepareContent: PrepareContentView | null,
	locale: Locale,
): { title: string; description: string; articleBody: string; keywords: string[] } {
	const handle = getHandle(post);
	const captionText = post.caption?.trim() ?? "";
	const parsedCaption = parseCaption(captionText);

	const paragraphText = prepareContent
		? prepareContent.paragraphs
				.map((paragraph) => [paragraph.heading, paragraph.content].filter(Boolean).join("\n"))
				.filter((line) => line.trim().length > 0)
		: [];

	const derivedTitle = prepareContent?.title || post.title?.trim() || paragraphText[0] || parsedCaption.content.split("\n")[0] || "";
	const fallbackTitle = locale === "en" ? `Post by ${handle}` : `${handle} 的貼文`;
	const title = trimForMeta(derivedTitle || fallbackTitle, locale === "en" ? 70 : 42);

	const descriptionParts = [
		prepareContent?.subtitle || null,
		prepareContent?.footerLine || null,
		paragraphText[0] || null,
		parsedCaption.content || null,
	].filter((part): part is string => Boolean(part && part.trim().length > 0));

	const fallbackDescription = locale === "en" ? "Read this post on Paragify." : "在 Paragify 查看這則貼文。";
	const description = trimForMeta(descriptionParts.join(" ") || fallbackDescription, 160);

	const articleBodySource = prepareContent
		? [
				prepareContent.eyebrow,
				prepareContent.title,
				prepareContent.subtitle,
				prepareContent.footerLine,
				...paragraphText,
		  ]
		: [parsedCaption.content];
	const articleBody = articleBodySource
		.filter((line): line is string => Boolean(line && line.trim().length > 0))
		.join("\n\n")
		.trim();

	const keywordSource = new Set<string>();
	for (const tag of prepareContent?.headingHashtags ?? []) {
		keywordSource.add(tag.replace(/^#/, "").trim().toLowerCase());
	}
	for (const paragraph of prepareContent?.paragraphs ?? []) {
		for (const tag of paragraph.hashtags) {
			keywordSource.add(tag.replace(/^#/, "").trim().toLowerCase());
		}
	}
	for (const tag of parsedCaption.hashtags) {
		keywordSource.add(tag.replace(/^#/, "").trim().toLowerCase());
	}

	const keywords = Array.from(keywordSource)
		.filter((keyword) => keyword.length > 0)
		.slice(0, 12);
	if (!keywords.includes("paragify")) {
		keywords.unshift("paragify");
	}

	return {
		title,
		description,
		articleBody,
		keywords,
	};
}

function serializeJsonLd(value: unknown): string {
	return JSON.stringify(value).replace(/</g, "\\u003c");
}

function isFeedPageScale(value: unknown): value is FeedPageScale {
	return value === "4:5" || value === "3:4" || value === "1:1";
}

function parseFeedCoverPageScale(layoutJson: string | null): FeedPageScale {
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

function selectImageCdnOrigin(mediaKey: string): string {
	const normalizedKey = normalizeR2MediaKey(mediaKey);
	let hash = 0;

	for (let index = 0; index < normalizedKey.length; index += 1) {
		hash = (hash + normalizedKey.charCodeAt(index)) % 2147483647;
	}

	return IMAGE_CDN_ORIGINS[hash % IMAGE_CDN_ORIGINS.length];
}

function getFeedImageTransformOptions(pageScale: FeedPageScale): string {
	const dimensions = FEED_PAGE_SCALE_DIMENSIONS[pageScale];
	const imageHeight = Math.round((FEED_IMAGE_WIDTH * dimensions.height) / dimensions.width);
	return `width=${FEED_IMAGE_WIDTH},height=${imageHeight},fit=cover,quality=85,format=auto`;
}

function getCloudflareTransformedImageUrl(mediaKey: string | null, pageScale: FeedPageScale): string | null {
	if (!mediaKey) {
		return null;
	}

	const cdnOrigin = selectImageCdnOrigin(mediaKey);
	const transformOptions = getFeedImageTransformOptions(pageScale);
	return `${cdnOrigin}/cdn-cgi/image/${transformOptions}/${normalizeR2MediaKey(mediaKey)}`;
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

function toFeedMediaType(value: string | null): "image" | "video" {
	const normalized = value?.toLowerCase().trim() ?? "";
	return normalized.startsWith("video") ? "video" : "image";
}

function buildFeedMediaItem(
	pageNum: number,
	mediaUrl: string | null,
	rawMediaUrl: string | null,
	mediaType: string | null,
	pageScale: FeedPageScale,
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
				: getCloudflareTransformedImageUrl(mediaKey, pageScale),
	};
}

async function resolveViewerPk(db: D1Database, email: string | null): Promise<number | null> {
	if (!email) {
		return null;
	}

	const row = await db
		.prepare("SELECT user_pk FROM users WHERE lower(email)=? LIMIT 1")
		.bind(email.toLowerCase())
		.first<{ user_pk: number }>();
	return row?.user_pk ?? null;
}

type LoadPostDetailOptions = {
	includeComments?: boolean;
};

async function loadPostDetail(
	db: D1Database,
	slug: string,
	viewerPk: number | null,
	options?: LoadPostDetailOptions,
): Promise<PostDetail | null> {
	const includeComments = options?.includeComments ?? true;
	const normalizedSlug = slug.trim();
	if (!normalizedSlug) {
		return null;
	}

	const maybePostId = /^\d+$/.test(normalizedSlug) ? Number(normalizedSlug) : null;
	const whereClause = maybePostId ? "(p.post_slug = ? OR p.post_id = ?)" : "(p.post_slug = ?)";
	const whereBindings = maybePostId ? [normalizedSlug, maybePostId] : [normalizedSlug];

	const postQuery = `
		SELECT
			p.post_id,
			p.post_slug,
			p.title,
			p.caption,
			p.prepare_content,
			p.like_count,
			p.comment_count,
			p.created_at,
			u.name AS author_name,
			u.user_id AS author_id,
			u.avatar_url AS author_avatar,
			cp.media_url AS cover_media_url,
			cp.raw_media_url AS cover_raw_media_url,
			cp.media_type AS cover_media_type,
			cp.layout_json AS cover_layout_json,
			${viewerPk ? "EXISTS (SELECT 1 FROM post_likes pl WHERE pl.post_id = p.post_id AND pl.user_pk = ?) AS liked_by_me" : "0 AS liked_by_me"}
		FROM posts p
		JOIN users u ON u.user_pk = p.user_pk
		LEFT JOIN post_pages cp
			ON cp.post_id = p.post_id
			AND cp.page_num = CASE WHEN p.cover_page IS NOT NULL AND p.cover_page > 0 THEN p.cover_page ELSE 1 END
		WHERE p.visibility = 'public'
			AND ${whereClause}
		LIMIT 1
	`;

	const post = await db
		.prepare(postQuery)
		.bind(...(viewerPk ? [viewerPk, ...whereBindings] : whereBindings))
		.first<PostRow>();
	if (!post?.post_id) {
		return null;
	}

	const pagesResult = await db
		.prepare(
			`SELECT post_id, page_num, media_url, raw_media_url, media_type
			 FROM post_pages
			 WHERE post_id = ?
			 ORDER BY page_num ASC`,
		)
		.bind(post.post_id)
		.all<PostPageRow>();
	const pageRows = pagesResult.results ?? [];
	const pageScale = parseFeedCoverPageScale(post.cover_layout_json);

	const mediaItems: FeedMediaItem[] = [];
	for (const pageRow of pageRows) {
		const mediaItem = buildFeedMediaItem(
			pageRow.page_num,
			pageRow.media_url,
			pageRow.raw_media_url,
			pageRow.media_type,
			pageScale,
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
			pageScale,
		);
		if (coverMedia) {
			mediaItems.push(coverMedia);
		}
	}

	const comments = includeComments
		? (
				await db
					.prepare(
						`SELECT c.comment_id,
						        c.post_id,
						        c.user_pk,
						        c.body,
						        c.reply_to_comment_id,
						        c.created_at,
						        u.name AS user_name,
						        u.user_id AS user_handle,
						        u.avatar_url AS user_avatar
						   FROM post_comments c
						   JOIN users u ON u.user_pk = c.user_pk
						  WHERE c.post_id = ?
						  ORDER BY c.created_at ASC`,
					)
					.bind(post.post_id)
					.all<PostComment>()
		  ).results ?? []
		: [];

	return {
		post,
		pageScale,
		pageCount: Math.max(pageRows.length, mediaItems.length, 1),
		mediaItems,
		comments,
	};
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { locale = "zh", slug = "" } = await params;
	const lang = mapLocale(locale);
	const fallbackTitle = lang === "en" ? `Post | ${SITE_NAME}` : `貼文 | ${SITE_NAME}`;
	const fallbackDescription = lang === "en" ? "Read this post on Paragify." : "在 Paragify 查看這則貼文。";

	if (!slug.trim()) {
		return {
			title: fallbackTitle,
			description: fallbackDescription,
			robots: { index: false, follow: true },
		};
	}

	const { env } = await getCloudflareContext({ async: true });
	const db = (env as DbBindings).DB;
	if (!db) {
		return {
			title: fallbackTitle,
			description: fallbackDescription,
			robots: { index: false, follow: true },
		};
	}

	const detail = await loadPostDetail(db, slug, null, { includeComments: false });
	if (!detail) {
		return {
			title: fallbackTitle,
			description: fallbackDescription,
			robots: { index: false, follow: true },
		};
	}

	const { post, mediaItems } = detail;
	const prepareContent = parsePrepareContent(post.prepare_content);
	const slugRef = getPostSlugRef(post);
	const canonicalPath = buildPostPath(lang, slugRef);
	const canonicalUrl = toAbsoluteUrl(canonicalPath);
	const seoSummary = buildSeoSummary(post, prepareContent, lang);
	const title = `${seoSummary.title} | ${SITE_NAME}`;
	const imageUrl = getPrimarySeoImageUrl(post, mediaItems);

	return {
		title,
		description: seoSummary.description,
		keywords: seoSummary.keywords,
		robots: {
			index: true,
			follow: true,
			googleBot: {
				index: true,
				follow: true,
				"max-image-preview": "large",
				"max-snippet": -1,
				"max-video-preview": -1,
			},
		},
		alternates: {
			canonical: canonicalUrl,
			languages: {
				en: toAbsoluteUrl(buildPostPath("en", slugRef)),
				zh: toAbsoluteUrl(buildPostPath("zh", slugRef)),
				"zh-HK": toAbsoluteUrl(buildPostPath("zh", slugRef)),
			},
		},
		openGraph: {
			type: "article",
			url: canonicalUrl,
			title,
			description: seoSummary.description,
			siteName: SITE_NAME,
			locale: lang === "en" ? "en_US" : "zh_HK",
			publishedTime: post.created_at ?? undefined,
			images: imageUrl
				? [
						{
							url: imageUrl,
							alt: seoSummary.title,
						},
				  ]
				: undefined,
		},
		twitter: {
			card: imageUrl ? "summary_large_image" : "summary",
			title,
			description: seoSummary.description,
			images: imageUrl ? [imageUrl] : undefined,
		},
	};
}

export default async function PostDetailPage({ params }: PageProps) {
	const { locale = "zh", slug = "" } = await params;
	const lang = mapLocale(locale);
	const t = copy[lang];

	const { env } = await getCloudflareContext({ async: true });
	const db = (env as DbBindings).DB;
	if (!db) {
		notFound();
	}

	const session = await getServerSession(authOptions);
	const sessionEmail = session?.user?.email?.toLowerCase() || null;
	const viewerPk = await resolveViewerPk(db, sessionEmail);

	const detail = await loadPostDetail(db, slug, viewerPk);
	if (!detail) {
		notFound();
	}

	const { post, pageScale, pageCount, mediaItems, comments } = detail;
	const handle = getHandle(post);
	const initials = getAvatarInitials(handle);
	const trimmedCaption = post.caption?.trim() ?? "";
	const prepareContent = parsePrepareContent(post.prepare_content);
	const headingImages = prepareContent?.headingImages ?? [];
	const { content } = parseCaption(trimmedCaption);
	const getFeedTagHref = (hashtag: string) => `/?tag=${encodeURIComponent(hashtag.replace(/^#/, ""))}`;
	const slugRef = getPostSlugRef(post);
	const canonicalUrl = toAbsoluteUrl(buildPostPath(lang, slugRef));
	const seoSummary = buildSeoSummary(post, prepareContent, lang);
	const primarySeoImageUrl = getPrimarySeoImageUrl(post, mediaItems);
	const authorHandleRaw = post.author_id?.trim() || null;
	const authorHandleLabel = authorHandleRaw ? `@${authorHandleRaw}` : null;
	const authorName = post.author_name?.trim() || authorHandleLabel || handle;
	const showAuthorHandleLine = Boolean(authorHandleLabel && post.author_name?.trim());
	const breadcrumbJsonLd = {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: [
			{
				"@type": "ListItem",
				position: 1,
				name: SITE_NAME,
				item: toAbsoluteUrl("/"),
			},
			{
				"@type": "ListItem",
				position: 2,
				name: lang === "en" ? "Post" : "貼文",
				item: canonicalUrl,
			},
		],
	};
	const postJsonLd = {
		"@context": "https://schema.org",
		"@type": "SocialMediaPosting",
		mainEntityOfPage: canonicalUrl,
		headline: seoSummary.title,
		description: seoSummary.description,
		articleBody: seoSummary.articleBody || undefined,
		url: canonicalUrl,
		datePublished: post.created_at || undefined,
		author: {
			"@type": "Person",
			name: authorName,
			identifier: post.author_id ? `@${post.author_id}` : undefined,
		},
		publisher: {
			"@type": "Organization",
			name: SITE_NAME,
			url: SITE_URL,
			logo: {
				"@type": "ImageObject",
				url: toAbsoluteUrl("/favicon.svg"),
			},
		},
		image: primarySeoImageUrl ? [primarySeoImageUrl] : undefined,
		keywords: seoSummary.keywords.join(", "),
		interactionStatistic: [
			{
				"@type": "InteractionCounter",
				interactionType: "https://schema.org/LikeAction",
				userInteractionCount: post.like_count ?? 0,
			},
			{
				"@type": "InteractionCounter",
				interactionType: "https://schema.org/CommentAction",
				userInteractionCount: post.comment_count ?? 0,
			},
		],
	};

	return (
		<main className="min-h-screen pb-12 text-[color:var(--txt-1)]">
			<div
				className="pointer-events-none fixed inset-0 -z-10"
				style={{
					backgroundColor: "var(--bg-1)",
					backgroundImage: "var(--page-bg-gradient)",
				}}
			/>
			<div className="mx-auto w-full max-w-xl px-3 pt-6">
				<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
				<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(postJsonLd) }} />
				<div className="mb-4">
					<Link
						href="/"
						className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-[color:var(--cell-2)]"
						style={{
							borderColor: "var(--surface-border)",
							backgroundColor: "var(--surface)",
							color: "var(--txt-2)",
						}}
					>
						{t.back}
					</Link>
				</div>

				<article
					className="overflow-hidden rounded-[22px] border"
					style={{
						borderColor: "var(--surface-border)",
						backgroundColor: "var(--surface)",
						boxShadow: "var(--shadow-elev-1)",
					}}
				>
					<div className="flex items-center justify-between px-4 py-3">
						<div className="flex items-center gap-3">
							{post.author_avatar ? (
								<Image
									src={post.author_avatar}
									alt={`${handle} avatar`}
									width={36}
									height={36}
									sizes="36px"
									className="h-9 w-9 rounded-full object-cover"
									referrerPolicy="no-referrer"
								/>
							) : (
								<div className="grid h-9 w-9 place-items-center rounded-full bg-[linear-gradient(135deg,#0ea5e9_0%,#f43f5e_100%)] text-[11px] font-semibold text-white">
									{initials}
								</div>
							)}
							<div className="leading-tight">
								<p className="max-w-[14rem] truncate text-sm font-semibold text-[color:var(--txt-1)]">{authorName}</p>
								{showAuthorHandleLine ? (
									<p className="max-w-[14rem] truncate text-xs font-medium text-[color:var(--txt-2)]">
										{authorHandleLabel}
									</p>
								) : null}
								<p className="text-[11px] uppercase tracking-wide text-[color:var(--txt-3)]">
									{formatDate(post.created_at)}
								</p>
							</div>
						</div>
						{post.post_slug ? (
							<span
								className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--txt-3)]"
								style={{ borderColor: "var(--surface-border)" }}
							>
								/{post.post_slug}
							</span>
						) : null}
					</div>

					<FeedPostMediaCarousel
						postId={post.post_id}
						postTitle={post.title}
						pageScale={pageScale}
						pageCount={pageCount}
						mediaItems={mediaItems}
					/>

					<div className="space-y-3 px-4 pb-4 pt-3">
						<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-wide text-[color:var(--txt-3)]">
							<span>
								{formatCount(post.like_count)} {t.likes}
							</span>
							<span>
								{formatCount(post.comment_count)} {t.comments}
							</span>
							<span>
								{pageCount} {t.pages}
							</span>
							{post.created_at ? (
								<span>
									{t.posted} {new Date(post.created_at).toLocaleDateString(lang === "en" ? "en-US" : "zh-HK")}
								</span>
							) : null}
						</div>

						{prepareContent ? (
							<div className="space-y-4 text-[15px] leading-6 text-[color:var(--txt-2)]">
								{prepareContent.eyebrow ||
								prepareContent.title ||
								prepareContent.subtitle ||
								prepareContent.footerLine ||
								prepareContent.headingHashtags.length > 0 ? (
									<header
										className="relative overflow-hidden rounded-2xl border px-4 py-3.5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.9)] sm:px-5 sm:py-4"
										style={{
											borderColor: "color-mix(in srgb, var(--surface-border) 92%, transparent)",
											backgroundImage:
												"linear-gradient(145deg, color-mix(in srgb, var(--surface) 88%, var(--bg-3) 12%) 0%, color-mix(in srgb, var(--cell-3) 78%, var(--surface) 22%) 100%)",
										}}
									>
										<div
											className="pointer-events-none absolute -right-12 -top-14 h-32 w-32 rounded-full blur-2xl"
											style={{ backgroundColor: "color-mix(in srgb, var(--accent-2) 24%, transparent)" }}
											aria-hidden
										/>
										<div className="relative space-y-2.5">
											{prepareContent.eyebrow ? (
												<p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--accent-2)]">
													{renderTextWithHashtagLinks(prepareContent.eyebrow, getFeedTagHref, "prepare-eyebrow")}
												</p>
											) : null}
											{prepareContent.title ? (
												<p className="text-[1.95rem] font-black leading-[1.15] tracking-[-0.015em] text-[color:var(--txt-1)] sm:text-[2.1rem]">
													{renderTextWithHashtagLinks(prepareContent.title, getFeedTagHref, "prepare-title")}
												</p>
											) : null}
											{prepareContent.subtitle ? (
												<p className="whitespace-pre-line break-words text-[1.02rem] leading-7 text-[color:var(--txt-2)]">
													{renderTextWithHashtagLinks(prepareContent.subtitle, getFeedTagHref, "prepare-subtitle")}
												</p>
											) : null}
											{prepareContent.footerLine ? (
												<p className="whitespace-pre-line break-words text-[0.8rem] font-medium leading-5 text-[color:var(--txt-3)]">
													{renderTextWithHashtagLinks(prepareContent.footerLine, getFeedTagHref, "prepare-footer")}
												</p>
											) : null}
											{prepareContent.headingHashtags.length > 0 ? (
												<p className="flex flex-wrap gap-1.5 pt-0.5">
													{prepareContent.headingHashtags.map((hashtag, index) => (
														<Link
															key={`heading-hashtag-${hashtag}-${index}`}
															href={getFeedTagHref(hashtag)}
															className={PREPARE_CONTENT_HASHTAG_LINK_CLASSNAME}
															style={PREPARE_CONTENT_HASHTAG_LINK_STYLE}
														>
															{hashtag}
														</Link>
													))}
												</p>
											) : null}
										</div>
									</header>
								) : null}

								{headingImages.map((headingImage) => {
									const headingStyle = toTextColorStyle(headingImage.headingColor);
									const textStyle = toTextColorStyle(headingImage.textColor);
									const containerStyle = toBackgroundColorStyle(headingImage.backgroundColor);

									return (
										<div
											key={`heading-image-${headingImage.slot}`}
											className="space-y-2 rounded-2xl border p-4"
											style={{
												borderColor: "var(--surface-border)",
												backgroundColor: "var(--cell-2)",
												...containerStyle,
											}}
										>
											<Image
												src={headingImage.url}
												alt={headingImage.heading || headingImage.description || prepareContent.title || "Heading image"}
												width={1200}
												height={900}
												sizes="(max-width: 640px) calc(100vw - 2rem), 600px"
												className="h-auto w-full rounded-lg border object-cover"
												style={{ borderColor: "var(--surface-border)" }}
											/>
											{headingImage.heading ? (
												<p className="text-lg font-semibold leading-tight text-[color:var(--txt-1)]" style={headingStyle}>
													{renderTextWithHashtagLinks(
														headingImage.heading,
														getFeedTagHref,
														`heading-image-${headingImage.slot}-heading`,
													)}
												</p>
											) : null}
											{headingImage.description ? (
												<p
													className="whitespace-pre-line break-words text-base leading-7 text-[color:var(--txt-2)]"
													style={textStyle}
												>
													{renderTextWithHashtagLinks(
														headingImage.description,
														getFeedTagHref,
														`heading-image-${headingImage.slot}-description`,
													)}
												</p>
											) : null}
										</div>
									);
								})}

								{prepareContent.paragraphs.length > 0 ? (
									<div className="space-y-3 border-t pt-3" style={{ borderColor: "var(--surface-border)" }}>
										{prepareContent.paragraphs.map((paragraph, index) => {
											const headingStyle = toTextColorStyle(paragraph.headingColor);
											const textStyle = toTextColorStyle(paragraph.textColor);
											const containerStyle = toBackgroundColorStyle(paragraph.backgroundColor);
											const paragraphClassName = paragraph.backgroundColor
												? "space-y-1 rounded-xl px-3 py-2.5"
												: "space-y-1";

											return (
												<div key={`paragraph-${index}`} className={paragraphClassName} style={containerStyle}>
													{paragraph.heading ? (
														<p
															className="whitespace-pre-line break-words text-lg font-semibold leading-tight text-[color:var(--txt-1)]"
															style={headingStyle}
														>
															{renderTextWithHashtagLinks(
																paragraph.heading,
																getFeedTagHref,
																`paragraph-${index}-heading`,
															)}
														</p>
													) : null}

													{paragraph.type === "hashtags" ? (
														<p className="flex flex-wrap gap-x-1 gap-y-0.5">
															{paragraph.hashtags.map((hashtag, hashtagIndex) => (
																<Link
																	key={`paragraph-hashtag-${index}-${hashtagIndex}`}
																	href={getFeedTagHref(hashtag)}
																	className={PREPARE_CONTENT_HASHTAG_LINK_CLASSNAME}
																	style={PREPARE_CONTENT_HASHTAG_LINK_STYLE}
																>
																	{hashtag}
																</Link>
															))}
														</p>
													) : (
														<>
															{paragraph.type === "image" && paragraph.url ? (
																<Image
																	src={paragraph.url}
																	alt={paragraph.heading || paragraph.content || "Paragraph image"}
																	width={1200}
																	height={900}
																	sizes="(max-width: 640px) calc(100vw - 2rem), 600px"
																	className="h-auto w-full rounded-lg border object-cover"
																	style={{ borderColor: "var(--surface-border)" }}
																/>
															) : null}
															{paragraph.content ? (
																<p className="whitespace-pre-line break-words text-base leading-7 sm:text-[1.05rem]" style={textStyle}>
																	{renderTextWithHashtagLinks(
																		paragraph.content,
																		getFeedTagHref,
																		`paragraph-${index}-content`,
																	)}
																</p>
															) : null}
															{paragraph.url && paragraph.type !== "image" ? (
																<Link
																	href={paragraph.url}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="block break-all text-xs font-semibold transition-opacity hover:opacity-85"
																	style={textStyle ?? { color: "var(--accent-2)" }}
																>
																	{paragraph.url}
																</Link>
															) : null}
														</>
													)}
												</div>
											);
										})}
									</div>
								) : null}

							</div>
						) : trimmedCaption ? (
							<div className="space-y-1 text-[15px] leading-6 text-[color:var(--txt-2)]">
								<p className="whitespace-pre-line break-words">
									<span className="mr-1 font-semibold text-[color:var(--txt-1)]">{handle}</span>
									{content || trimmedCaption}
								</p>
							</div>
						) : (
							<p className="text-sm italic text-[color:var(--txt-3)]">{t.noCaption}</p>
						)}
					</div>
				</article>

				<div id="comments" className="mt-4 scroll-mt-24">
					<PostDetailComments locale={lang} postId={post.post_id} initialComments={comments} />
				</div>
			</div>
		</main>
	);
}
