import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties, JSX } from "react";
import { PostDetailComments, type PostComment } from "@/app/post/[locale]/[slug]/post-detail-comments";
import { SiteFooter } from "@/app/components/site-footer";
import PostViewTracker from "@/app/p/[slug]/PostViewTracker";

export const dynamic = "force-dynamic";

const PRIMARY_CDN_ORIGIN = "https://cdn.paragify.com";
const DEFAULT_SITE_URL = "http://localhost:3000";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, "");
const SITE_NAME = "Paragify";
const DEFAULT_LOCALE: Locale = "en";
const HASHTAG_MATCH_PATTERN = /#[\p{L}\p{N}\p{M}_]+/gu;

type DbBindings = CloudflareEnv & { DB?: D1Database };
type Locale = "en" | "zh";

type PageProps = {
	params: Promise<{ slug: string }>;
};

type ArticleRow = {
	post_id: number;
	post_slug: string | null;
	locale: string | null;
	title: string | null;
	caption: string | null;
	prepare_content: string | null;
	like_count: number | null;
	comment_count: number | null;
	created_at: string | null;
	updated_at: string | null;
	author_name: string | null;
	author_id: string | null;
	author_avatar: string | null;
};

type RelatedPostRow = {
	post_id: number;
	post_slug: string | null;
	locale: string | null;
	title: string | null;
	caption: string | null;
	prepare_content: string | null;
	author_name: string | null;
	author_id: string | null;
	first_media_url: string | null;
};

type RelatedPostView = {
	postId: number;
	href: string;
	title: string;
	summary: string | null;
	authorName: string;
	authorHandle: string | null;
	heroImageUrl: string | null;
};

type PreparedParagraphType = "p" | "image" | "hashtags";

type PreparedHeadingImage = {
	slot: 1 | 2;
	url: string | null;
	heading: string | null;
	description: string | null;
};

type PreparedParagraph = {
	type: PreparedParagraphType;
	heading: string | null;
	content: string | null;
	url: string | null;
	hashtags: string[];
};

type PreparedContentView = {
	title: string | null;
	eyebrow: string | null;
	subtitle: string | null;
	footerLine: string | null;
	categoryLabel: string | null;
	subcategoryLabel: string | null;
	sourceHashtags: string[];
	keyLines: string[];
	headingHashtags: string[];
	hashtagsLocale: string[];
	coverPageUrl: string | null;
	headingImages: PreparedHeadingImage[];
	paragraphs: PreparedParagraph[];
};

const copy: Record<
	Locale,
	{
		back: string;
		published: string;
		noContent: string;
		articleMeta: string;
		category: string;
		subcategory: string;
		tags: string;
		relatedReading: string;
		noRelatedReading: string;
	}
> = {
	en: {
		back: "Back home",
		published: "Published",
		noContent: "This post does not have prepared article content yet.",
		articleMeta: "Article info",
		category: "Category",
		subcategory: "Subcategory",
		tags: "Tags",
		relatedReading: "Related posts",
		noRelatedReading: "No related posts found.",
	},
	zh: {
		back: "返回首頁",
		published: "發佈於",
		noContent: "這篇文章暫時未有整理好的內容。",
		articleMeta: "文章資料",
		category: "分類",
		subcategory: "子分類",
		tags: "標籤",
		relatedReading: "相關文章",
		noRelatedReading: "暫時未有相關文章。",
	},
};

function normalizeLocale(value: string | null): Locale {
	return value?.trim().toLowerCase() === "zh" ? "zh" : "en";
}

function toAbsoluteUrl(path: string): string {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${SITE_URL}${normalizedPath}`;
}

function getPostSlugRef(post: Pick<ArticleRow, "post_slug" | "post_id">): string {
	const slug = post.post_slug?.trim();
	return slug || String(post.post_id);
}

function formatPublishDate(value: string | null, locale: Locale): string {
	if (!value) {
		return locale === "en" ? "Unknown date" : "未知日期";
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return locale === "en" ? "Unknown date" : "未知日期";
	}

	return date.toLocaleDateString(locale === "en" ? "en-US" : "zh-HK", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function buildHashtagHref(hashtag: string, locale: Locale): string {
	const params = new URLSearchParams();
	if (locale !== DEFAULT_LOCALE) {
		params.set("locale", locale);
	}
	params.set("hashtag", hashtag);
	return `/?${params.toString()}`;
}

function buildAuthorPostsHref(authorHandle: string, locale: Locale): string {
	const normalizedHandle = authorHandle.trim().replace(/^@+/, "").toLowerCase();
	const params = new URLSearchParams();
	if (locale !== DEFAULT_LOCALE) {
		params.set("locale", locale);
	}
	params.set("author", normalizedHandle);
	return `/?${params.toString()}`;
}

function stripHashtags(value: string | null): string | null {
	const trimmed = value?.trim() ?? "";
	if (!trimmed) {
		return null;
	}

	const normalized = trimmed
		.replace(HASHTAG_MATCH_PATTERN, "")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n[ \t]+/g, "\n")
		.replace(/[ \t]{2,}/g, " ")
		.trim();

	return normalized || null;
}

function trimForMeta(value: string | null, maxLength: number): string | null {
	const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
	if (!normalized) {
		return null;
	}
	if (normalized.length <= maxLength) {
		return normalized;
	}
	return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
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

function normalizeTagToken(value: string): string {
	return value
		.normalize("NFKC")
		.replace(/^[^A-Za-z0-9\u00C0-\uFFFF_-]+/, "")
		.replace(/[^A-Za-z0-9\u00C0-\uFFFF_-]+$/, "")
		.toLowerCase();
}

function extractTagsFromList(value: unknown): string[] {
	if (Array.isArray(value)) {
		return Array.from(
			new Set(
				value
					.map((item) => (typeof item === "string" ? normalizeTagToken(item) : ""))
					.filter(Boolean),
			),
		);
	}

	const singleValue = toTrimmedText(value);
	return singleValue ? [normalizeTagToken(singleValue)].filter(Boolean) : [];
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

function normalizeR2MediaKey(value: string): string {
	return value.replace(/^\/+/, "");
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

function parsePrepareContent(value: string | null): PreparedContentView | null {
	if (!value) {
		return null;
	}

	const parsed = parsePossiblyEscapedJson(value, 4);
	const root = toObjectRecord(parsed);
	if (!root) {
		return null;
	}

	const srcOrg = toObjectRecord(root.src_org);
	const headingImages: PreparedHeadingImage[] = [];
	for (const [key, slot] of [
		["heading_image_1", 1],
		["heading_image_2", 2],
	] as const) {
		const imageRecord = toObjectRecord(root[key]);
		const resolvedImageUrl = toPrepareContentImageUrl(toTrimmedText(imageRecord?.url) ?? toTrimmedText(imageRecord?.src));
		if (!resolvedImageUrl) {
			continue;
		}

		headingImages.push({
			slot,
			url: resolvedImageUrl,
			heading: toTrimmedText(imageRecord?.heading),
			description: toTrimmedText(imageRecord?.desc),
		});
	}

	const rawParagraphs = Array.isArray(root.paragraphs) ? root.paragraphs : [];
	const paragraphs: PreparedParagraph[] = [];
	for (const rawParagraph of rawParagraphs) {
		const paragraphRecord = toObjectRecord(rawParagraph);
		if (!paragraphRecord) {
			continue;
		}

		const paragraphTypeRaw = toTrimmedText(paragraphRecord.type)?.toLowerCase();
		if (paragraphTypeRaw !== "p" && paragraphTypeRaw !== "image" && paragraphTypeRaw !== "hashtags") {
			continue;
		}

		const paragraphType = paragraphTypeRaw as PreparedParagraphType;
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
		});
	}

	const prepared: PreparedContentView = {
		title: toTrimmedText(root.title),
		eyebrow: toTrimmedText(root.eyeblow ?? root.eyebrow),
		subtitle: toTrimmedText(root.subtitle),
		footerLine: toTrimmedText(root.footer_line),
		categoryLabel: toTrimmedText(srcOrg?.category_locale) ?? toTrimmedText(srcOrg?.category),
		subcategoryLabel: toTrimmedText(srcOrg?.subcategory_locale) ?? toTrimmedText(srcOrg?.subcategory),
		sourceHashtags: Array.from(
			new Set([
				...extractTagsFromList(srcOrg?.hashtags),
				...extractTagsFromList(srcOrg?.hashtags_locale ?? srcOrg?.hashtag_locale),
			]),
		),
		keyLines: Array.isArray(root.key_lines)
			? root.key_lines
					.map((entry) => toTrimmedText(entry))
					.filter((entry): entry is string => Boolean(entry))
			: [],
		headingHashtags: toNormalizedHashtags(toTrimmedText(root.heading_hashtags)),
		hashtagsLocale: Array.from(
			new Set([
				...extractTagsFromList(root.hashtags_locale),
				...extractTagsFromList(srcOrg?.hashtags_locale ?? srcOrg?.hashtag_locale),
			]),
		).map((tag) => `#${tag}`),
		coverPageUrl: toPrepareContentImageUrl(toTrimmedText(root.cover_page_url)),
		headingImages,
		paragraphs,
	};

	if (
		!prepared.title &&
		!prepared.eyebrow &&
		!prepared.subtitle &&
		!prepared.footerLine &&
		!prepared.categoryLabel &&
		!prepared.subcategoryLabel &&
		prepared.sourceHashtags.length === 0 &&
		prepared.keyLines.length === 0 &&
		prepared.headingHashtags.length === 0 &&
		prepared.hashtagsLocale.length === 0 &&
		!prepared.coverPageUrl &&
		prepared.headingImages.length === 0 &&
		prepared.paragraphs.length === 0
	) {
		return null;
	}

	return prepared;
}

async function loadArticle(db: D1Database, slug: string): Promise<ArticleRow | null> {
	const normalizedSlug = slug.trim();
	if (!normalizedSlug) {
		return null;
	}

	const maybePostId = /^\d+$/.test(normalizedSlug) ? Number(normalizedSlug) : null;
	const whereClause = maybePostId ? "(p.post_slug = ? OR p.post_id = ?)" : "(p.post_slug = ?)";
	const bindings = maybePostId ? [normalizedSlug, maybePostId] : [normalizedSlug];

	return (
		(await db
			.prepare(
				`SELECT
					p.post_id,
					p.post_slug,
					p.locale,
					p.title,
					p.caption,
					p.prepare_content,
					p.like_count,
					p.comment_count,
					p.created_at,
					p.updated_at,
					u.name AS author_name,
					u.user_id AS author_id,
					u.avatar_url AS author_avatar
				FROM posts p
				JOIN users u
					ON u.user_pk = p.user_pk
				WHERE p.visibility = 'public'
					AND ${whereClause}
				LIMIT 1`,
			)
			.bind(...bindings)
			.first<ArticleRow>()) ?? null
	);
}

async function loadPostComments(db: D1Database, postId: number): Promise<PostComment[]> {
	return (
		(await db
			.prepare(
				`SELECT
					c.comment_id,
					c.post_id,
					c.user_pk,
					c.body,
					c.reply_to_comment_id,
					c.created_at,
					u.name AS user_name,
					u.user_id AS user_handle,
					u.avatar_url AS user_avatar
				FROM post_comments c
				JOIN users u
					ON u.user_pk = c.user_pk
				WHERE c.post_id = ?
				ORDER BY c.created_at ASC`,
			)
			.bind(postId)
			.all<PostComment>()).results ?? []
	);
}

async function loadPrimaryCategoryId(db: D1Database, postId: number): Promise<number | null> {
	const row = await db
		.prepare(
			`SELECT psc.posts_category_id
			 FROM posts_subcategory_assignments psa
			 JOIN posts_subcategories psc
			   ON psc.posts_subcategory_id = psa.posts_subcategory_id
			WHERE psa.post_id = ?
			  AND psa.is_primary = 1
			LIMIT 1`,
		)
		.bind(postId)
		.first<{ posts_category_id: number }>();

	return row?.posts_category_id ?? null;
}

function buildPublicPostHref(post: Pick<ArticleRow | RelatedPostRow, "post_slug" | "post_id">): string {
	return `/p/${encodeURIComponent(getPostSlugRef(post))}`;
}

function buildRelatedFallbackTitle(locale: Locale, postId: number): string {
	return locale === "en" ? `Post ${postId}` : `文章 ${postId}`;
}

function buildRelatedPostView(row: RelatedPostRow, locale: Locale): RelatedPostView {
	const prepared = parsePrepareContent(row.prepare_content);
	const fallbackTitle =
		trimForMeta(stripHashtags(row.caption), locale === "en" ? 70 : 42) ?? buildRelatedFallbackTitle(locale, row.post_id);
	const title = trimForMeta(prepared?.title ?? row.title?.trim() ?? fallbackTitle, locale === "en" ? 70 : 42) ?? fallbackTitle;
	const summary = trimForMeta(prepared?.subtitle ?? prepared?.footerLine ?? stripHashtags(row.caption), 120);
	const heroImageUrl =
		prepared?.headingImages.find((image) => image.slot === 1)?.url ??
		prepared?.coverPageUrl ??
		(row.first_media_url ? toPrepareContentImageUrl(row.first_media_url) : null);

	return {
		postId: row.post_id,
		href: buildPublicPostHref(row),
		title,
		summary,
		authorName: row.author_name?.trim() || row.author_id?.trim() || `user${row.post_id}`,
		authorHandle: row.author_id?.trim() || null,
		heroImageUrl,
	};
}

async function loadRelatedPosts(db: D1Database, postId: number, locale: Locale): Promise<RelatedPostView[]> {
	const primaryCategoryId = await loadPrimaryCategoryId(db, postId);
	if (!primaryCategoryId) {
		return [];
	}

	const result = await db
		.prepare(
			`SELECT
				p.post_id,
				p.post_slug,
				p.locale,
				p.title,
				p.caption,
				p.prepare_content,
				u.name AS author_name,
				u.user_id AS author_id,
				(
					SELECT pp.media_url
					FROM post_pages pp
					WHERE pp.post_id = p.post_id
					ORDER BY pp.page_num ASC
					LIMIT 1
				) AS first_media_url
			FROM posts_subcategories psc
			JOIN posts_subcategory_assignments psa
				ON psa.posts_subcategory_id = psc.posts_subcategory_id
				AND psa.is_primary = 1
			JOIN posts p
				ON p.post_id = psa.post_id
				AND p.visibility = 'public'
			JOIN users u
				ON u.user_pk = p.user_pk
			LEFT JOIN post_keywords pk
				ON pk.post_id = p.post_id
			LEFT JOIN post_keywords ck
				ON ck.post_id = ?
				AND ck.tag = pk.tag
			WHERE psc.posts_category_id = ?
				AND p.post_id <> ?
			GROUP BY
				p.post_id,
				p.post_slug,
				p.locale,
				p.title,
				p.caption,
				p.prepare_content,
				u.name,
				u.user_id
			ORDER BY
				CASE WHEN COUNT(DISTINCT ck.tag) > 0 THEN 0 ELSE 1 END ASC,
				COUNT(DISTINCT ck.tag) DESC,
				p.post_id DESC
			LIMIT 6`,
		)
		.bind(postId, primaryCategoryId, postId)
		.all<RelatedPostRow>();

	return (result.results ?? []).map((row) => buildRelatedPostView(row, locale));
}

function renderInlineHashtagLinks(value: string, locale: Locale) {
	const lines = value.split("\n");

	return lines.map((line, lineIndex) => {
		const matches = Array.from(line.matchAll(HASHTAG_MATCH_PATTERN));
		let cursor = 0;
		const children: Array<string | JSX.Element> = [];

		for (const [matchIndex, match] of matches.entries()) {
			const hashtag = match[0];
			const start = match.index ?? 0;
			if (start > cursor) {
				children.push(line.slice(cursor, start));
			}
			children.push(
				<Link
					key={`hashtag-${lineIndex}-${matchIndex}-${hashtag}`}
					href={buildHashtagHref(hashtag, locale)}
					className="font-semibold text-[color:var(--accent-1)] underline decoration-transparent underline-offset-4 transition hover:decoration-current"
				>
					{hashtag}
				</Link>,
			);
			cursor = start + hashtag.length;
		}

		if (cursor < line.length) {
			children.push(line.slice(cursor));
		}

		if (children.length === 0) {
			children.push(line);
		}

		return (
			<span key={`line-${lineIndex}`}>
				{children}
				{lineIndex < lines.length - 1 ? <br /> : null}
			</span>
		);
	});
}

function renderTextWithLineBreaks(value: string | null, className: string, locale: Locale, style?: CSSProperties) {
	if (!value) {
		return null;
	}

	return (
		<p className={className} style={style}>
			{renderInlineHashtagLinks(value, locale)}
		</p>
	);
}

function buildTagStyle(): CSSProperties {
	return {
		color: "var(--accent-2)",
		borderColor: "color-mix(in srgb, var(--accent-2) 28%, transparent)",
		backgroundColor: "color-mix(in srgb, var(--accent-2) 12%, transparent)",
	};
}

function buildSectionStyle(): CSSProperties {
	return {
		backgroundColor: "color-mix(in srgb, var(--cell-1) 96%, transparent)",
		borderColor: "color-mix(in srgb, var(--surface-border) 82%, transparent)",
	};
}

function getPrimarySeoImageUrl(prepared: PreparedContentView | null): string | null {
	return (
		prepared?.headingImages.find((image) => image.slot === 1)?.url ??
		prepared?.coverPageUrl ??
		prepared?.headingImages[0]?.url ??
		prepared?.paragraphs.find((paragraph) => paragraph.type === "image" && paragraph.url)?.url ??
		null
	);
}

function estimateArticleWordCount(value: string): number | undefined {
	const normalized = value.trim();
	if (!normalized) {
		return undefined;
	}

	const cjkCount = normalized.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)?.length ?? 0;
	const latinWordCount =
		normalized
			.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, " ")
			.match(/[\p{L}\p{N}'’-]+/gu)?.length ?? 0;
	const wordCount = cjkCount + latinWordCount;

	return wordCount > 0 ? wordCount : undefined;
}

function buildSeoTopicNames(prepared: PreparedContentView | null): string[] {
	const topicSource = new Set<string>();
	const pushTopic = (value: string | null) => {
		const normalized = value?.replace(/^#/, "").trim() ?? "";
		if (normalized) {
			topicSource.add(normalized);
		}
	};

	pushTopic(prepared?.categoryLabel ?? null);
	pushTopic(prepared?.subcategoryLabel ?? null);
	for (const tag of prepared?.headingHashtags ?? []) {
		pushTopic(tag);
	}
	for (const tag of prepared?.hashtagsLocale ?? []) {
		pushTopic(tag);
	}
	for (const tag of prepared?.sourceHashtags ?? []) {
		pushTopic(tag);
	}

	return Array.from(topicSource).slice(0, 8);
}

function renderHeadingImageSection(image: PreparedHeadingImage | null, title: string, locale: Locale) {
	if (!image?.url) {
		return null;
	}

	const hasCopy = Boolean(image.heading || image.description);

	return (
		<section
			className={
				hasCopy
					? "grid gap-5 overflow-hidden rounded-[1.75rem] border p-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start"
					: "overflow-hidden rounded-[1.75rem] border p-4"
			}
			style={buildSectionStyle()}
		>
			<div className="relative overflow-hidden rounded-[1.25rem]" style={{ aspectRatio: "4 / 3" }}>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={image.url} alt={image.heading ?? title} className="h-full w-full object-cover" loading="lazy" />
			</div>
			{hasCopy ? (
				<div className="min-w-0">
					{image.heading ? <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--txt-1)]">{image.heading}</h2> : null}
					{image.description
						? renderTextWithLineBreaks(image.description, "mt-4 whitespace-pre-line text-lg leading-8", locale, {
								color: "var(--txt-2)",
						  })
						: null}
				</div>
			) : null}
		</section>
	);
}

function buildArticleSeoSummary(
	article: Pick<ArticleRow, "post_id" | "title" | "caption" | "author_id">,
	prepared: PreparedContentView | null,
	locale: Locale,
) {
	const paragraphText = prepared
		? prepared.paragraphs
				.map((paragraph) => [paragraph.heading, paragraph.content].filter(Boolean).join("\n"))
				.filter((line) => line.trim().length > 0)
		: [];
	const headingImageText = prepared
		? prepared.headingImages
				.map((image) => [image.heading, image.description].filter(Boolean).join("\n"))
				.filter((line) => line.trim().length > 0)
		: [];
	const fallbackTitle = article.author_id?.trim()
		? locale === "en"
			? `Article by @${article.author_id.trim()}`
			: `@${article.author_id.trim()} 的文章`
		: locale === "en"
			? `Article ${article.post_id}`
			: `文章 ${article.post_id}`;
	const title =
		trimForMeta(prepared?.title ?? article.title?.trim() ?? paragraphText[0] ?? fallbackTitle, locale === "en" ? 70 : 42) ??
		fallbackTitle;
	const descriptionParts = [
		prepared?.subtitle ?? null,
		prepared?.footerLine ?? null,
		prepared?.keyLines[0] ?? null,
		headingImageText[0] ?? null,
		paragraphText[0] ?? null,
		stripHashtags(article.caption) ?? null,
	].filter((part): part is string => Boolean(part && part.trim().length > 0));
	const fallbackDescription = locale === "en" ? "Read this article on Paragify." : "在 Paragify 查看這篇文章。";
	const description = trimForMeta(descriptionParts.join(" ") || fallbackDescription, 160) ?? fallbackDescription;
	const articleBody = [
		prepared?.eyebrow ?? null,
		prepared?.title ?? null,
		prepared?.subtitle ?? null,
		prepared?.footerLine ?? null,
		...(prepared?.keyLines ?? []),
		...headingImageText,
		...paragraphText,
		stripHashtags(article.caption) ?? null,
	]
		.filter((line): line is string => Boolean(line && line.trim().length > 0))
		.join("\n\n")
		.trim();

	const keywordSource = new Set<string>();
	const pushKeyword = (value: string | null) => {
		const normalized = value?.replace(/^#/, "").trim().toLowerCase() ?? "";
		if (normalized) {
			keywordSource.add(normalized);
		}
	};

	pushKeyword(article.author_id?.trim() ?? null);
	pushKeyword(prepared?.categoryLabel ?? null);
	pushKeyword(prepared?.subcategoryLabel ?? null);
	for (const tag of prepared?.headingHashtags ?? []) {
		pushKeyword(tag);
	}
	for (const tag of prepared?.hashtagsLocale ?? []) {
		pushKeyword(tag);
	}
	for (const tag of prepared?.sourceHashtags ?? []) {
		pushKeyword(tag);
	}
	for (const paragraph of prepared?.paragraphs ?? []) {
		for (const tag of paragraph.hashtags) {
			pushKeyword(tag);
		}
	}
	pushKeyword(SITE_NAME);

	const keywords = Array.from(keywordSource).filter((keyword) => keyword.length > 0);
	if (!keywords.includes("paragify")) {
		keywords.unshift("paragify");
	}

	return {
		title,
		description,
		articleBody,
		keywords: keywords.slice(0, 16),
		section: prepared?.subcategoryLabel ?? prepared?.categoryLabel ?? undefined,
	};
}

function serializeJsonLd(value: unknown): string {
	return JSON.stringify(value).replace(/</g, "\\u003c");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug = "" } = await params;
	const { env } = await getCloudflareContext({ async: true });
	const db = (env as DbBindings).DB;
	if (!db) {
		return {
			title: `Article | ${SITE_NAME}`,
			description: "Read this article on Paragify.",
			robots: { index: false, follow: true },
		};
	}

	const article = await loadArticle(db, slug);
	if (!article) {
		return {
			title: `Article | ${SITE_NAME}`,
			description: "Read this article on Paragify.",
			robots: { index: false, follow: true },
		};
	}

	const locale = normalizeLocale(article.locale);
	const prepared = parsePrepareContent(article.prepare_content);
	const seoSummary = buildArticleSeoSummary(article, prepared, locale);
	const authorName = article.author_name?.trim() || article.author_id?.trim() || `user${article.post_id}`;
	const authorHandle = article.author_id?.trim() || null;
	const authorArchiveUrl = authorHandle ? toAbsoluteUrl(buildAuthorPostsHref(authorHandle, locale)) : null;
	const imageUrl = getPrimarySeoImageUrl(prepared);
	const canonicalUrl = toAbsoluteUrl(`/p/${encodeURIComponent(getPostSlugRef(article))}`);
	const title = `${seoSummary.title} | ${SITE_NAME}`;

	return {
		title,
		description: seoSummary.description,
		keywords: seoSummary.keywords,
		authors: [{ name: authorName, url: authorArchiveUrl ?? undefined }],
		creator: authorName,
		publisher: SITE_NAME,
		category: prepared?.categoryLabel ?? undefined,
		classification: seoSummary.section,
		referrer: "origin-when-cross-origin",
		alternates: {
			canonical: canonicalUrl,
		},
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
		openGraph: {
			type: "article",
			url: canonicalUrl,
			title,
			description: seoSummary.description,
			siteName: SITE_NAME,
			locale: locale === "en" ? "en_US" : "zh_HK",
			publishedTime: article.created_at ?? undefined,
			modifiedTime: article.updated_at ?? article.created_at ?? undefined,
			authors: [authorName],
			section: seoSummary.section,
			tags: seoSummary.keywords,
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
			creator: authorHandle ? `@${authorHandle}` : undefined,
			images: imageUrl ? [imageUrl] : undefined,
		},
	};
}

export default async function ShortPostDetailPage({ params }: PageProps) {
	const { slug = "" } = await params;
	const { env } = await getCloudflareContext({ async: true });
	const db = (env as DbBindings).DB;
	if (!db) {
		notFound();
	}

	const article = await loadArticle(db, slug);
	if (!article) {
		notFound();
	}

	const locale = normalizeLocale(article.locale);
	const t = copy[locale];
	const prepared = parsePrepareContent(article.prepare_content);
	const authorName = article.author_name?.trim() || article.author_id?.trim() || `user${article.post_id}`;
	const authorHandle = article.author_id?.trim() || null;
	const authorPostsHref = authorHandle ? buildAuthorPostsHref(authorHandle, locale) : null;
	const title = prepared?.title ?? article.title?.trim() ?? `Post ${article.post_id}`;
	const heroImage = prepared?.headingImages.find((image) => image.slot === 1) ?? null;
	const heroImageUrl = heroImage?.url ?? prepared?.coverPageUrl ?? null;
	const secondaryHeadingImage = prepared?.headingImages.find((image) => image.slot === 2) ?? null;
	const fallbackCaption = stripHashtags(article.caption);
	const comments = await loadPostComments(db, article.post_id);
	const relatedPosts = await loadRelatedPosts(db, article.post_id, locale);
	const canonicalUrl = toAbsoluteUrl(`/p/${encodeURIComponent(getPostSlugRef(article))}`);
	const seoSummary = buildArticleSeoSummary(article, prepared, locale);
	const primaryImageUrl = getPrimarySeoImageUrl(prepared);
	const seoTopics = buildSeoTopicNames(prepared);
	const articleWordCount = seoSummary.articleBody ? estimateArticleWordCount(seoSummary.articleBody) : undefined;
	const authorArchiveUrl = authorPostsHref ? toAbsoluteUrl(authorPostsHref) : undefined;
	const sourceHashtags = Array.from(new Set(prepared?.sourceHashtags ?? [])).slice(0, 10);
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
				name: seoSummary.title,
				item: canonicalUrl,
			},
		],
	};
	const articleJsonLd = {
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		"@id": canonicalUrl,
		mainEntityOfPage: {
			"@type": "WebPage",
			"@id": canonicalUrl,
		},
		isPartOf: {
			"@type": "WebSite",
			"@id": `${SITE_URL}/#website`,
			name: SITE_NAME,
			url: SITE_URL,
		},
		headline: seoSummary.title,
		alternativeHeadline: prepared?.subtitle ?? undefined,
		description: seoSummary.description,
		articleBody: seoSummary.articleBody || undefined,
		url: canonicalUrl,
		inLanguage: locale === "en" ? "en" : "zh-HK",
		datePublished: article.created_at || undefined,
		dateModified: article.updated_at || article.created_at || undefined,
		wordCount: articleWordCount,
		commentCount: article.comment_count ?? 0,
		isAccessibleForFree: true,
		genre: seoSummary.section ? [seoSummary.section] : undefined,
		author: {
			"@type": "Person",
			name: authorName,
			identifier: authorHandle ? `@${authorHandle}` : undefined,
			url: authorArchiveUrl,
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
		image: primaryImageUrl ? [primaryImageUrl] : undefined,
		articleSection: seoSummary.section,
		about:
			seoTopics.length > 0
				? seoTopics.map((topic) => ({
						"@type": "Thing",
						name: topic,
				  }))
				: undefined,
		keywords: seoSummary.keywords.join(", "),
		interactionStatistic: [
			{
				"@type": "InteractionCounter",
				interactionType: "https://schema.org/LikeAction",
				userInteractionCount: article.like_count ?? 0,
			},
			{
				"@type": "InteractionCounter",
				interactionType: "https://schema.org/CommentAction",
				userInteractionCount: article.comment_count ?? 0,
			},
		],
	};
	const relatedItemListJsonLd =
		relatedPosts.length > 0
			? {
					"@context": "https://schema.org",
					"@type": "ItemList",
					"@id": `${canonicalUrl}#related`,
					name: copy[locale].relatedReading,
					itemListElement: relatedPosts.map((post, index) => ({
						"@type": "ListItem",
						position: index + 1,
						url: toAbsoluteUrl(post.href),
						name: post.title,
					})),
			  }
			: null;

	return (
		<main className="min-h-screen pb-20" style={{ backgroundImage: "var(--page-bg-gradient)" }}>
			{article.post_slug ? <PostViewTracker postSlug={article.post_slug} /> : null}
			<div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
				<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
				<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }} />
				{relatedItemListJsonLd ? (
					<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(relatedItemListJsonLd) }} />
				) : null}
				<div className="mb-6">
					<Link
						href="/"
						className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors hover:bg-[color:var(--cell-3)]"
						style={{
							borderColor: "color-mix(in srgb, var(--surface-border) 85%, transparent)",
							backgroundColor: "color-mix(in srgb, var(--cell-1) 94%, transparent)",
							color: "var(--txt-1)",
						}}
					>
						{t.back}
					</Link>
				</div>

				<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
					<div className="space-y-6">
						<article
							className="overflow-hidden rounded-[2rem] border"
							style={{
								backgroundColor: "color-mix(in srgb, var(--cell-1) 96%, transparent)",
								borderColor: "color-mix(in srgb, var(--surface-border) 84%, transparent)",
								boxShadow: "var(--shadow-elev-1)",
							}}
						>
							<header className="border-b px-4 py-4 sm:px-8 sm:py-5" style={{ borderColor: "color-mix(in srgb, var(--surface-border) 82%, transparent)" }}>
								<div className="flex flex-wrap items-center justify-between gap-4">
									{authorPostsHref ? (
										<Link href={authorPostsHref} className="flex items-center gap-3 rounded-full transition-opacity hover:opacity-85">
											{article.author_avatar ? (
												// eslint-disable-next-line @next/next/no-img-element
												<img
													src={article.author_avatar}
													alt={`${authorName} avatar`}
													className="h-11 w-11 rounded-full object-cover"
													referrerPolicy="no-referrer"
												/>
											) : (
												<div className="grid h-11 w-11 place-items-center rounded-full border text-sm font-semibold text-[color:var(--txt-1)]">
													{authorName.slice(0, 2).toUpperCase()}
												</div>
											)}
											<div>
												<p className="text-sm font-semibold text-[color:var(--txt-1)]">{authorName}</p>
												<p className="mt-1 text-sm text-[color:var(--txt-3)]">
													{authorHandle ? `@${authorHandle} · ` : ""}
													{t.published} {formatPublishDate(article.created_at, locale)}
												</p>
											</div>
										</Link>
									) : (
										<div className="flex items-center gap-3">
											{article.author_avatar ? (
												// eslint-disable-next-line @next/next/no-img-element
												<img
													src={article.author_avatar}
													alt={`${authorName} avatar`}
													className="h-11 w-11 rounded-full object-cover"
													referrerPolicy="no-referrer"
												/>
											) : (
												<div className="grid h-11 w-11 place-items-center rounded-full border text-sm font-semibold text-[color:var(--txt-1)]">
													{authorName.slice(0, 2).toUpperCase()}
												</div>
											)}
											<div>
												<p className="text-sm font-semibold text-[color:var(--txt-1)]">{authorName}</p>
												<p className="mt-1 text-sm text-[color:var(--txt-3)]">
													{authorHandle ? `@${authorHandle} · ` : ""}
													{t.published} {formatPublishDate(article.created_at, locale)}
												</p>
											</div>
										</div>
									)}
									<span
										className="rounded-full border px-3 py-1 text-xs font-medium text-[color:var(--txt-3)]"
										style={{ borderColor: "var(--surface-border)" }}
									>
										/{getPostSlugRef(article)}
									</span>
								</div>
							</header>

							<div className="px-4 py-4 sm:px-8 sm:py-8">
								<div className="space-y-8">
									{heroImageUrl ? (
										<div
											className="relative overflow-hidden rounded-[1.5rem] border"
											style={{
												...buildSectionStyle(),
												aspectRatio: "16 / 9",
											}}
										>
											{/* eslint-disable-next-line @next/next/no-img-element */}
											<img src={heroImageUrl} alt={heroImage?.heading ?? title} className="h-full w-full object-cover" />
										</div>
									) : null}

									<div className="max-w-3xl">
										{prepared?.eyebrow ? (
											<p className="text-sm font-semibold uppercase tracking-[0.28em] text-[color:var(--txt-3)]">{prepared.eyebrow}</p>
										) : null}

										<h1 className="mt-3 text-4xl font-semibold tracking-tight text-[color:var(--txt-1)] sm:text-5xl">{title}</h1>

										{prepared?.subtitle
											? renderTextWithLineBreaks(prepared.subtitle, "mt-4 text-lg leading-8", locale, {
													color: "var(--txt-2)",
											  })
											: null}

										{prepared?.headingHashtags.length ? (
											<div className="mt-5 flex flex-wrap gap-2">
												{prepared.headingHashtags.map((tag) => (
													<Link
														key={`hero-heading-${tag}`}
														href={buildHashtagHref(tag, locale)}
														className="rounded-full border px-3 py-1 text-sm font-medium transition-opacity hover:opacity-85"
														style={buildTagStyle()}
													>
														{tag}
													</Link>
												))}
											</div>
										) : null}

										{prepared?.footerLine
											? renderTextWithLineBreaks(prepared.footerLine, "mt-4 text-base font-medium leading-7", locale, {
													color: "var(--txt-2)",
											  })
											: null}
									</div>

									{heroImage ? renderHeadingImageSection(heroImage, title, locale) : null}

									{prepared?.keyLines.length ? (
										<div
											className="max-w-3xl space-y-3 border-l-2 pl-4"
											style={{ borderColor: "color-mix(in srgb, var(--accent-2) 24%, transparent)" }}
										>
											{prepared.keyLines.map((line, index) => (
												<p key={`key-line-${index}`} className="text-lg font-semibold leading-8 text-[color:var(--txt-1)]">
													{line}
												</p>
											))}
										</div>
									) : null}

									{renderHeadingImageSection(secondaryHeadingImage, title, locale)}
								</div>

								<div className="mt-10 space-y-4">
									{prepared?.paragraphs.map((paragraph, index) => {
										if (paragraph.type === "image") {
											return (
												<figure
													key={`paragraph-${index}`}
													className="overflow-hidden rounded-[1.75rem]"
													style={buildSectionStyle()}
												>
													{paragraph.url ? (
														<div className="relative overflow-hidden rounded-[1.25rem]" style={{ aspectRatio: "4 / 3" }}>
															{/* eslint-disable-next-line @next/next/no-img-element */}
															<img src={paragraph.url} alt={paragraph.heading ?? title} className="h-full w-full object-cover" loading="lazy" />
														</div>
													) : null}
													{paragraph.heading || paragraph.content ? (
														<figcaption className="px-2 pb-2 pt-4">
															{paragraph.heading ? <p className="text-xl font-semibold text-[color:var(--txt-1)]">{paragraph.heading}</p> : null}
															{paragraph.content
																? renderTextWithLineBreaks(paragraph.content, "mt-3 whitespace-pre-line text-base leading-8", locale, {
																		color: "var(--txt-2)",
																  })
																: null}
														</figcaption>
													) : null}
												</figure>
											);
										}

										if (paragraph.type === "hashtags") {
											return (
												<section
													key={`paragraph-${index}`}
													className="rounded-[1.75rem] px-5 py-5"
													style={buildSectionStyle()}
												>
													<div className="flex flex-wrap gap-2">
														{paragraph.hashtags.map((tag) => (
															<Link
																key={`${index}-${tag}`}
																href={buildHashtagHref(tag, locale)}
																className="rounded-full border px-3 py-1 text-sm font-medium transition-opacity hover:opacity-85"
																style={buildTagStyle()}
															>
																{tag}
															</Link>
														))}
													</div>
												</section>
											);
										}

										return (
											<section
												key={`paragraph-${index}`}
												className="rounded-[1.75rem]"
												style={buildSectionStyle()}
											>
												{paragraph.heading ? <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--txt-1)]">{paragraph.heading}</h2> : null}
												{renderTextWithLineBreaks(
													paragraph.content,
													`${paragraph.heading ? "mt-4 " : ""}whitespace-pre-line text-lg leading-8`,
													locale,
													{ color: "var(--txt-2)" },
												)}
											</section>
										);
									})}

									{prepared?.hashtagsLocale.length ? (
										<div className="flex flex-wrap gap-2">
											{prepared.hashtagsLocale.map((tag) => (
												<Link
													key={`locale-tag-${tag}`}
													href={buildHashtagHref(tag, locale)}
													className="rounded-full border px-3 py-1 text-sm font-medium transition-opacity hover:opacity-85"
													style={{
														color: "var(--accent-1)",
														borderColor: "color-mix(in srgb, var(--accent-1) 28%, transparent)",
														backgroundColor: "color-mix(in srgb, var(--accent-1) 12%, transparent)",
													}}
												>
													{tag}
												</Link>
											))}
										</div>
									) : null}

									{!prepared && fallbackCaption ? (
										<section
											className="rounded-[1.75rem] border px-5 py-5 sm:px-6 sm:py-6"
											style={buildSectionStyle()}
										>
											{renderTextWithLineBreaks(fallbackCaption, "whitespace-pre-line text-lg leading-8", locale, {
												color: "var(--txt-2)",
											})}
										</section>
									) : null}

									{!prepared && !fallbackCaption ? (
										<section
											className="rounded-[1.75rem] border px-5 py-5 text-base text-[color:var(--txt-2)] sm:px-6 sm:py-6"
											style={buildSectionStyle()}
										>
											{t.noContent}
										</section>
									) : null}
								</div>
							</div>
						</article>

						<div id="comments" className="scroll-mt-24">
							<PostDetailComments locale={locale} postId={article.post_id} initialComments={comments} />
						</div>
					</div>

					<aside className="xl:sticky xl:top-24 xl:self-start">
						<section
							className="rounded-[2rem] border p-5"
							style={{
								backgroundColor: "color-mix(in srgb, var(--cell-1) 96%, transparent)",
								borderColor: "color-mix(in srgb, var(--surface-border) 84%, transparent)",
								boxShadow: "var(--shadow-elev-1)",
							}}
						>
							<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--txt-3)]">
								{copy[locale].articleMeta}
							</p>
							<div className="mt-4 space-y-4 text-sm text-[color:var(--txt-2)]">
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--txt-3)]">{t.published}</p>
									<p className="mt-2 text-base font-semibold text-[color:var(--txt-1)]">{formatPublishDate(article.created_at, locale)}</p>
								</div>
								{prepared?.categoryLabel ? (
									<div>
										<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--txt-3)]">{copy[locale].category}</p>
										<p className="mt-2 text-base font-semibold text-[color:var(--txt-1)]">{prepared.categoryLabel}</p>
									</div>
								) : null}
								{prepared?.subcategoryLabel ? (
									<div>
										<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--txt-3)]">{copy[locale].subcategory}</p>
										<p className="mt-2 text-base font-semibold text-[color:var(--txt-1)]">{prepared.subcategoryLabel}</p>
									</div>
								) : null}
								{sourceHashtags.length > 0 ? (
									<div>
										<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--txt-3)]">{copy[locale].tags}</p>
										<div className="mt-3 flex flex-wrap gap-2">
											{sourceHashtags.map((tag) => (
												<Link
													key={`aside-#${tag}`}
													href={buildHashtagHref(`#${tag}`, locale)}
													className="rounded-full border px-3 py-1 text-sm font-medium transition-opacity hover:opacity-85"
													style={buildTagStyle()}
												>
													#{tag}
												</Link>
											))}
										</div>
									</div>
								) : null}
							</div>

							<div
								className="border-t pt-5"
								style={{ borderColor: "color-mix(in srgb, var(--surface-border) 82%, transparent)" }}
							>
								<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--txt-3)]">
									{copy[locale].relatedReading}
								</p>
								{relatedPosts.length > 0 ? (
									<div className="mt-4 space-y-3">
										{relatedPosts.map((relatedPost) => (
											<Link
												key={relatedPost.postId}
												href={relatedPost.href}
												className="block rounded-[1.35rem] border p-3 transition-transform hover:-translate-y-0.5"
												style={{
													backgroundColor: "color-mix(in srgb, var(--cell-2) 92%, transparent)",
													borderColor: "color-mix(in srgb, var(--surface-border) 82%, transparent)",
												}}
											>
												{relatedPost.heroImageUrl ? (
													<div
														className="relative overflow-hidden rounded-[1rem] border"
														style={{
															aspectRatio: "4 / 3",
															borderColor: "color-mix(in srgb, var(--surface-border) 78%, transparent)",
														}}
													>
														{/* eslint-disable-next-line @next/next/no-img-element */}
														<img src={relatedPost.heroImageUrl} alt={relatedPost.title} className="h-full w-full object-cover" loading="lazy" />
													</div>
												) : null}
												<p className={`${relatedPost.heroImageUrl ? "mt-3 " : ""}text-sm font-semibold leading-6 text-[color:var(--txt-1)]`}>
													{relatedPost.title}
												</p>
												{relatedPost.summary ? (
													<p className="mt-2 text-sm leading-6 text-[color:var(--txt-2)]">{relatedPost.summary}</p>
												) : null}
												<p className="mt-3 text-xs text-[color:var(--txt-3)]">
													<span className="font-medium text-[color:var(--txt-1)]">{relatedPost.authorName}</span>
													{relatedPost.authorHandle ? ` · @${relatedPost.authorHandle}` : ""}
												</p>
											</Link>
										))}
									</div>
								) : (
									<p className="mt-3 text-sm leading-7 text-[color:var(--txt-2)]">{copy[locale].noRelatedReading}</p>
								)}
							</div>
						</section>
					</aside>
				</div>

				<SiteFooter locale={locale} />
			</div>
		</main>
	);
}
