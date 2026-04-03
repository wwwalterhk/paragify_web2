import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SiteFooter } from "./components/site-footer";
import {
	DEFAULT_POST_COUNTRY_CODE,
	getPostCountryLocaleValues,
	getPostCountryPageLocale,
	normalizePostLocaleFilterValue,
	POST_COUNTRY_COOKIE_KEY,
	resolvePostCountrySelection,
	type PostCountryCode,
} from "@/lib/post-country-filter";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;
const DEFAULT_LOCALE = "en";
const SITE_NAME = "Paragify";
const DEFAULT_SITE_URL = "http://localhost:3000";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, "");
const PRIMARY_CDN_ORIGIN = "https://cdn.paragify.com";
const PUBLIC_POSTS_WHERE = "p.visibility = 'public'";
const HASHTAG_MATCH_PATTERN = /#[\p{L}\p{N}\p{M}_]+/gu;

type Locale = "en" | "zh" | "ja";

type HomePageCopy = {
	searchBadge: string;
	searchTitle: string;
	searchQueryLabel: string;
	searchPlaceholder: string;
	searchAction: string;
	clearAction: string;
	homeLabel: string;
	feedLabel: string;
	navCategoriesAria: string;
	hashtagFilterLabel: string;
	authorFilterLabel: string;
	dataUnavailableLabel: string;
	noPublicPostsLabel: string;
	headingImageFallbackLabel: string;
	fallbackPostTitle: (postId: number) => string;
	unknownDate: string;
	unknownAuthor: string;
	publishedLabel: string;
	openPostLabel: string;
	pageNumbersAria: string;
	previousAction: string;
	nextAction: string;
	resultCount: (count: number) => string;
	pageSummary: (page: number, totalPages: number) => string;
	noMatchSearchQuery: (value: string) => string;
	noMatchHashtag: (value: string) => string;
	noMatchSubcategory: (value: string) => string;
	noMatchAuthor: (value: string) => string;
	noMatchCategory: (value: string) => string;
	noMatchFallback: string;
	relatedResultsTitle: string;
	hashtagOnlyFallback: (hashtag: string, scope: string, count: string) => string;
	hashtagOnlyFallbackSectionTitle: (hashtag: string) => string;
	dbUnavailableError: string;
	loadFailedError: string;
};

const HOME_PAGE_COPY: Record<Locale, HomePageCopy> = {
	en: {
		searchBadge: "Search",
		searchTitle: "Find public posts",
		searchQueryLabel: "Search query",
		searchPlaceholder: "Title, caption, or content",
		searchAction: "Search",
		clearAction: "Clear",
		homeLabel: "Home",
		feedLabel: "Feed",
		navCategoriesAria: "Homepage categories",
		hashtagFilterLabel: "Hashtag filter",
		authorFilterLabel: "Author filter",
		dataUnavailableLabel: "Data unavailable",
		noPublicPostsLabel: "No public posts",
		headingImageFallbackLabel: "Heading image 1",
		fallbackPostTitle: (postId) => `Public post ${postId}`,
		unknownDate: "Unknown date",
		unknownAuthor: "Unknown author",
		publishedLabel: "Published",
		openPostLabel: "Open post",
		pageNumbersAria: "Page numbers",
		previousAction: "Previous",
		nextAction: "Next",
		resultCount: (count) => `${count} matches`,
		pageSummary: (page, totalPages) => (totalPages > 0 ? `Page ${page} of ${totalPages}` : `Page ${page}`),
		noMatchSearchQuery: (value) => `Nothing matched the current search query: ${value}.`,
		noMatchHashtag: (value) => `Nothing matched the current hashtag filter: ${value}.`,
		noMatchSubcategory: (value) => `Nothing matched the current subcategory filter: ${value}.`,
		noMatchAuthor: (value) => `Nothing matched the current author filter: @${value}.`,
		noMatchCategory: (value) => `Nothing matched the current category filter: ${value}.`,
		noMatchFallback: "Nothing matched the current public-post query.",
		relatedResultsTitle: "Related results",
		hashtagOnlyFallback: (hashtag, scope, count) =>
			`No matches were found for ${hashtag} in ${scope}, but there are still ${count} public posts with this hashtag across all categories.`,
		hashtagOnlyFallbackSectionTitle: (hashtag) => `Results for ${hashtag} across all categories`,
		dbUnavailableError: "D1 binding `DB` is not available in this environment.",
		loadFailedError: "Failed to load public posts.",
	},
	zh: {
		searchBadge: "搜尋",
		searchTitle: "搜尋公開文章",
		searchQueryLabel: "搜尋內容",
		searchPlaceholder: "標題、摘要或內容",
		searchAction: "搜尋",
		clearAction: "清除",
		homeLabel: "主頁",
		feedLabel: "動態",
		navCategoriesAria: "首頁分類導覽",
		hashtagFilterLabel: "Hashtag 篩選",
		authorFilterLabel: "作者篩選",
		dataUnavailableLabel: "資料暫時無法讀取",
		noPublicPostsLabel: "沒有公開文章",
		headingImageFallbackLabel: "標題圖片 1",
		fallbackPostTitle: (postId) => `公開文章 ${postId}`,
		unknownDate: "未知日期",
		unknownAuthor: "未知作者",
		publishedLabel: "發佈於",
		openPostLabel: "閱讀文章",
		pageNumbersAria: "頁碼",
		previousAction: "上一頁",
		nextAction: "下一頁",
		resultCount: (count) => `${count} 個結果`,
		pageSummary: (page, totalPages) => (totalPages > 0 ? `第 ${page} 頁，共 ${totalPages} 頁` : `第 ${page} 頁`),
		noMatchSearchQuery: (value) => `沒有結果符合目前的搜尋關鍵字：${value}。`,
		noMatchHashtag: (value) => `沒有結果符合目前的 Hashtag 篩選：${value}。`,
		noMatchSubcategory: (value) => `沒有結果符合目前的子分類篩選：${value}。`,
		noMatchAuthor: (value) => `沒有結果符合目前的作者篩選：@${value}。`,
		noMatchCategory: (value) => `沒有結果符合目前的分類篩選：${value}。`,
		noMatchFallback: "沒有結果符合目前的公開文章篩選。",
		relatedResultsTitle: "其他相關結果",
		hashtagOnlyFallback: (hashtag, scope, count) =>
			`在「${scope}」下找不到 ${hashtag} 的結果，但在不限制分類的情況下，仍有 ${count} 篇與 ${hashtag} 相關的公開文章。`,
		hashtagOnlyFallbackSectionTitle: (hashtag) => `${hashtag} 的跨分類結果`,
		dbUnavailableError: "目前環境未提供 D1 `DB` 綁定。",
		loadFailedError: "載入公開文章失敗。",
	},
	ja: {
		searchBadge: "検索",
		searchTitle: "公開記事を探す",
		searchQueryLabel: "検索キーワード",
		searchPlaceholder: "タイトル、要約、または本文",
		searchAction: "検索",
		clearAction: "クリア",
		homeLabel: "ホーム",
		feedLabel: "フィード",
		navCategoriesAria: "ホームページのカテゴリ",
		hashtagFilterLabel: "ハッシュタグ絞り込み",
		authorFilterLabel: "投稿者絞り込み",
		dataUnavailableLabel: "データを読み込めません",
		noPublicPostsLabel: "公開記事はありません",
		headingImageFallbackLabel: "見出し画像 1",
		fallbackPostTitle: (postId) => `公開記事 ${postId}`,
		unknownDate: "日付不明",
		unknownAuthor: "投稿者不明",
		publishedLabel: "公開日",
		openPostLabel: "記事を開く",
		pageNumbersAria: "ページ番号",
		previousAction: "前へ",
		nextAction: "次へ",
		resultCount: (count) => `${count} 件`,
		pageSummary: (page, totalPages) => (totalPages > 0 ? `${page} / ${totalPages} ページ` : `${page} ページ`),
		noMatchSearchQuery: (value) => `現在の検索キーワード「${value}」に一致する記事はありません。`,
		noMatchHashtag: (value) => `現在のハッシュタグ絞り込み「${value}」に一致する記事はありません。`,
		noMatchSubcategory: (value) => `現在のサブカテゴリ絞り込み「${value}」に一致する記事はありません。`,
		noMatchAuthor: (value) => `現在の投稿者絞り込み「@${value}」に一致する記事はありません。`,
		noMatchCategory: (value) => `現在のカテゴリ絞り込み「${value}」に一致する記事はありません。`,
		noMatchFallback: "現在の公開記事条件に一致する記事はありません。",
		relatedResultsTitle: "関連する結果",
		hashtagOnlyFallback: (hashtag, scope, count) =>
			`${scope} では ${hashtag} に一致する記事はありませんが、カテゴリを限定しない条件では ${count} 件の公開記事があります。`,
		hashtagOnlyFallbackSectionTitle: (hashtag) => `${hashtag} のカテゴリ横断結果`,
		dbUnavailableError: "この環境では D1 の `DB` バインディングを利用できません。",
		loadFailedError: "公開記事の読み込みに失敗しました。",
	},
};

type HomePageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function resolveSelectedCountryCode(countryParam: string | string[] | undefined): Promise<PostCountryCode> {
	const cookieStore = await cookies();
	return resolvePostCountrySelection(countryParam, cookieStore.get(POST_COUNTRY_COOKIE_KEY)?.value);
}

type PreparedPostRow = {
	post_id: number;
	post_slug: string | null;
	locale: string | null;
	title: string | null;
	caption: string | null;
	prepare_content: string | null;
	created_at: string | null;
	updated_at: string | null;
	author_name: string | null;
	author_id: string | null;
};

type PostAssignmentRow = {
	post_id: number;
	category_code: string;
	category_name: string | null;
	subcategory_code: string;
	subcategory_name: string | null;
	is_primary: number;
	sort_order: number;
};

type TaxonomyRow = {
	category_code: string;
	category_name: string | null;
	category_description: string | null;
	subcategory_code: string | null;
	subcategory_name: string | null;
	subcategory_description: string | null;
	post_count: number | null;
};

type PreparedContentParagraphType = "p" | "image" | "hashtags";

type PreparedContentParagraph = {
	type: PreparedContentParagraphType;
	heading: string | null;
	content: string | null;
	url: string | null;
	hashtags: string[];
};

type PreparedContentHeadingImage = {
	slot: 1 | 2;
	url: string | null;
	heading: string | null;
	description: string | null;
};

type PreparedContentView = {
	title: string | null;
	eyebrow: string | null;
	subtitle: string | null;
	footerLine: string | null;
	hashtagsLocale: string[];
	keyLines: string[];
	headingHashtags: string[];
	headingImages: PreparedContentHeadingImage[];
	paragraphs: PreparedContentParagraph[];
};

type PostAssignmentTag = {
	code: string;
	name: string;
	isPrimary: boolean;
};

type PostAssignmentGroup = {
	categoryCode: string;
	categoryName: string;
	subcategories: PostAssignmentTag[];
};

type TaxonomySubcategory = {
	code: string;
	name: string;
	description: string | null;
	postCount: number;
};

type TaxonomyCategory = {
	code: string;
	name: string;
	description: string | null;
	subcategories: TaxonomySubcategory[];
};

type PreparedPostView = {
	postId: number;
	href: string;
	locale: Locale;
	taxonomyLabel: string | null;
	title: string;
	eyebrow: string | null;
	subtitle: string | null;
	footerLine: string | null;
	keyLines: string[];
	headingImage1Src: string | null;
	hashtagsLocale: string[];
	headingHashtags: string[];
	hashtags: string[];
	authorName: string;
	authorHandle: string | null;
	createdAt: string | null;
	assignments: PostAssignmentGroup[];
};

type HomePageData = {
	error: string | null;
	page: number;
	totalPages: number;
	totalPosts: number;
	posts: PreparedPostView[];
	taxonomy: TaxonomyCategory[];
	hashtagOnlyFallbackCount: number;
	hashtagOnlyFallbackPosts: PreparedPostView[];
};

type HomeSeoContext = {
	title: string;
	description: string;
	keywords: string[];
	canonicalPath: string;
	indexable: boolean;
};

function toAbsoluteUrl(path: string): string {
	if (path.startsWith("http://") || path.startsWith("https://")) {
		return path;
	}

	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${SITE_URL}${normalizedPath}`;
}

function serializeJsonLd(value: unknown): string {
	return JSON.stringify(value).replace(/</g, "\\u003c");
}

function getHomePageCopy(locale: Locale): HomePageCopy {
	return HOME_PAGE_COPY[locale];
}

function toSeoLabel(value: string | null): string | null {
	if (!value) {
		return null;
	}

	const acronymMap = new Map([
		["ai", "AI"],
		["ev", "EV"],
		["pc", "PC"],
		["tv", "TV"],
		["vr", "VR"],
		["ar", "AR"],
		["ux", "UX"],
		["ui", "UI"],
	]);

	const parts = value
		.trim()
		.toLowerCase()
		.split(/[-_]+/)
		.filter(Boolean)
		.map((part) => acronymMap.get(part) ?? `${part.charAt(0).toUpperCase()}${part.slice(1)}`);

	return parts.length > 0 ? parts.join(" ") : null;
}

function readStringParam(value: string | string[] | undefined): string | null {
	const raw = Array.isArray(value) ? value[0] : value;
	if (typeof raw !== "string") {
		return null;
	}
	const trimmed = raw.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function readPageParam(value: string | string[] | undefined): number {
	const raw = readStringParam(value);
	if (!raw) {
		return 1;
	}
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function readLocaleParam(value: string | string[] | undefined, countryCode: PostCountryCode): Locale {
	const rawLocale = readStringParam(value)?.toLowerCase();
	if (rawLocale === "zh") {
		return "zh";
	}
	if (rawLocale === "ja") {
		return "ja";
	}
	if (rawLocale === "en") {
		return "en";
	}
	return getPostCountryPageLocale(countryCode);
}

function readCategoryParam(value: string | string[] | undefined): string | null {
	const raw = readStringParam(value);
	return raw ? raw.toLowerCase() : null;
}

function readSubcategoryParam(value: string | string[] | undefined): string | null {
	const raw = readStringParam(value);
	return raw ? raw.toLowerCase() : null;
}

function readHashtagParam(value: string | string[] | undefined): string | null {
	const raw = readStringParam(value);
	if (!raw) {
		return null;
	}
	return raw.startsWith("#") ? raw : `#${raw}`;
}

function readSearchQueryParam(value: string | string[] | undefined): string | null {
	return readStringParam(value);
}

function readAuthorParam(value: string | string[] | undefined): string | null {
	const raw = readStringParam(value);
	return raw ? raw.toLowerCase() : null;
}

function toPostLocale(value: string | null): Locale {
	return value?.trim().toLowerCase() === "zh" ? "zh" : DEFAULT_LOCALE;
}

function buildPageHref(
	page: number,
	locale: Locale,
	categoryCode: string | null = null,
	subcategoryCode: string | null = null,
	hashtag: string | null = null,
	searchQuery: string | null = null,
	authorHandle: string | null = null,
	countryCode: PostCountryCode = DEFAULT_POST_COUNTRY_CODE,
): string {
	const params = new URLSearchParams();
	if (page > 1) {
		params.set("page", String(page));
	}
	if (locale !== DEFAULT_LOCALE) {
		params.set("locale", locale);
	}
	if (categoryCode) {
		params.set("category", categoryCode);
	}
	if (subcategoryCode) {
		params.set("subcategory", subcategoryCode);
	}
	if (hashtag) {
		params.set("hashtag", hashtag);
	}
	if (searchQuery) {
		params.set("q", searchQuery);
	}
	if (authorHandle) {
		params.set("author", authorHandle);
	}
	if (countryCode !== DEFAULT_POST_COUNTRY_CODE) {
		params.set("country", countryCode);
	}
	const query = params.toString();
	return query ? `/?${query}` : "/";
}

function buildCategoryHref(
	categoryCode: string,
	locale: Locale,
	hashtag: string | null = null,
	searchQuery: string | null = null,
	authorHandle: string | null = null,
	countryCode: PostCountryCode = DEFAULT_POST_COUNTRY_CODE,
): string {
	return buildPageHref(1, locale, categoryCode, null, hashtag, searchQuery, authorHandle, countryCode);
}

function buildSubcategoryHref(
	categoryCode: string,
	subcategoryCode: string,
	locale: Locale,
	hashtag: string | null = null,
	searchQuery: string | null = null,
	authorHandle: string | null = null,
	countryCode: PostCountryCode = DEFAULT_POST_COUNTRY_CODE,
): string {
	return buildPageHref(1, locale, categoryCode, subcategoryCode, hashtag, searchQuery, authorHandle, countryCode);
}

function buildNoResultsMessage(
	locale: Locale,
	filters: {
		searchQuery: string | null;
		hashtag: string | null;
		subcategory: string | null;
		author: string | null;
		category: string | null;
	},
): string {
	const copy = getHomePageCopy(locale);
	if (filters.searchQuery) {
		return copy.noMatchSearchQuery(filters.searchQuery);
	}
	if (filters.hashtag) {
		return copy.noMatchHashtag(filters.hashtag);
	}
	if (filters.subcategory) {
		return copy.noMatchSubcategory(filters.subcategory);
	}
	if (filters.author) {
		return copy.noMatchAuthor(filters.author);
	}
	if (filters.category) {
		return copy.noMatchCategory(filters.category);
	}
	return copy.noMatchFallback;
}

function getHomeSeoContext({
	locale,
	page,
	categoryCode,
	subcategoryCode,
	hashtag,
	searchQuery,
	authorHandle,
	countryCode,
}: {
	locale: Locale;
	page: number;
	categoryCode: string | null;
	subcategoryCode: string | null;
	hashtag: string | null;
	searchQuery: string | null;
	authorHandle: string | null;
	countryCode: PostCountryCode;
}): HomeSeoContext {
	const categoryLabel = toSeoLabel(categoryCode);
	const subcategoryLabel = toSeoLabel(subcategoryCode);
	const hashtagLabel = hashtag?.trim() || null;
	const searchQueryLabel = searchQuery?.trim() || null;
	const normalizedAuthorHandle = authorHandle?.trim().replace(/^@+/, "") || null;
	const authorLabel = normalizedAuthorHandle ? `@${normalizedAuthorHandle}` : null;
	const authorKeyword = normalizedAuthorHandle ? normalizedAuthorHandle.toLowerCase() : null;
	const scopeLabel =
		subcategoryLabel && categoryLabel
			? `${subcategoryLabel} in ${categoryLabel}`
			: subcategoryLabel ?? categoryLabel;
	const pageSuffix = page > 1 ? ` - Page ${page}` : "";
	const canonicalPath = buildPageHref(page, locale, categoryCode, subcategoryCode, hashtag, searchQuery, normalizedAuthorHandle, countryCode);

	if (searchQueryLabel) {
		return {
			title: `${authorLabel ? `Search "${searchQueryLabel}" by ${authorLabel}` : `Search "${searchQueryLabel}"`} | ${SITE_NAME}${pageSuffix}`,
			description: authorLabel
				? `Search ${SITE_NAME} public posts by ${authorLabel} for ${searchQueryLabel}.`
				: `Search ${SITE_NAME} public posts and topic pages for ${searchQueryLabel}.`,
			keywords: [
				SITE_NAME.toLowerCase(),
				searchQueryLabel.toLowerCase(),
				...(normalizedAuthorHandle ? [normalizedAuthorHandle.toLowerCase()] : []),
				"search",
				"public posts",
				"topic index",
			],
			canonicalPath,
			indexable: false,
		};
	}

	if (authorLabel && authorKeyword && hashtagLabel && scopeLabel) {
		return {
			title: `${hashtagLabel} ${scopeLabel} posts by ${authorLabel} | ${SITE_NAME}${pageSuffix}`,
			description: `Browse public ${scopeLabel} posts published by ${authorLabel} and tagged ${hashtagLabel} on ${SITE_NAME}.`,
			keywords: [
				SITE_NAME.toLowerCase(),
				authorKeyword,
				hashtagLabel.replace(/^#/, "").toLowerCase(),
				scopeLabel.toLowerCase(),
				"public posts",
			],
			canonicalPath,
			indexable: true,
		};
	}

	if (authorLabel && authorKeyword && hashtagLabel) {
		return {
			title: `Posts by ${authorLabel} tagged ${hashtagLabel} | ${SITE_NAME}${pageSuffix}`,
			description: `Browse public posts published by ${authorLabel} and tagged ${hashtagLabel} on ${SITE_NAME}.`,
			keywords: [
				SITE_NAME.toLowerCase(),
				authorKeyword,
				hashtagLabel.replace(/^#/, "").toLowerCase(),
				"public posts",
			],
			canonicalPath,
			indexable: true,
		};
	}

	if (authorLabel && authorKeyword && scopeLabel) {
		return {
			title: `${scopeLabel} posts by ${authorLabel} | ${SITE_NAME}${pageSuffix}`,
			description: `Browse public ${scopeLabel} posts published by ${authorLabel} on ${SITE_NAME}.`,
			keywords: [SITE_NAME.toLowerCase(), authorKeyword, scopeLabel.toLowerCase(), "public posts"],
			canonicalPath,
			indexable: true,
		};
	}

	if (authorLabel && authorKeyword) {
		return {
			title: `Posts by ${authorLabel} | ${SITE_NAME}${pageSuffix}`,
			description: `Browse public posts published by ${authorLabel} on ${SITE_NAME}.`,
			keywords: [SITE_NAME.toLowerCase(), authorKeyword, "author posts", "public posts"],
			canonicalPath,
			indexable: true,
		};
	}

	if (hashtagLabel && scopeLabel) {
		return {
			title: `${hashtagLabel} ${scopeLabel} posts | ${SITE_NAME}${pageSuffix}`,
			description: `Browse public posts tagged ${hashtagLabel} in ${scopeLabel} on ${SITE_NAME}.`,
			keywords: [SITE_NAME.toLowerCase(), hashtagLabel.replace(/^#/, "").toLowerCase(), scopeLabel.toLowerCase(), "public posts"],
			canonicalPath,
			indexable: true,
		};
	}

	if (hashtagLabel) {
		return {
			title: `${hashtagLabel} posts | ${SITE_NAME}${pageSuffix}`,
			description: `Browse public posts tagged ${hashtagLabel} on ${SITE_NAME}.`,
			keywords: [SITE_NAME.toLowerCase(), hashtagLabel.replace(/^#/, "").toLowerCase(), "hashtag", "public posts"],
			canonicalPath,
			indexable: true,
		};
	}

	if (subcategoryLabel && categoryLabel) {
		return {
			title: `${subcategoryLabel} posts in ${categoryLabel} | ${SITE_NAME}${pageSuffix}`,
			description: `Browse public ${subcategoryLabel} posts within ${categoryLabel} on ${SITE_NAME}.`,
			keywords: [SITE_NAME.toLowerCase(), subcategoryLabel.toLowerCase(), categoryLabel.toLowerCase(), "public posts"],
			canonicalPath,
			indexable: true,
		};
	}

	if (categoryLabel) {
		return {
			title: `${categoryLabel} posts and subcategories | ${SITE_NAME}${pageSuffix}`,
			description: `Browse public ${categoryLabel} posts, active subcategories, and related topics on ${SITE_NAME}.`,
			keywords: [SITE_NAME.toLowerCase(), categoryLabel.toLowerCase(), "public posts", "subcategories", "topic index"],
			canonicalPath,
			indexable: true,
		};
	}

	return {
		title: `${SITE_NAME} | Topic Index and Public Posts${pageSuffix}`,
		description:
			"Browse Paragify topics, active categories, and the latest public posts across tech, watches, food, gaming, lifestyle, and more.",
		keywords: [
			SITE_NAME.toLowerCase(),
			"topic index",
			"public posts",
			"tech",
			"watches",
			"food",
			"gaming",
			"lifestyle",
		],
		canonicalPath,
		indexable: true,
	};
}

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
	const resolvedSearchParams = (await searchParams) || {};
	const countryCode = await resolveSelectedCountryCode(resolvedSearchParams.country);
	const locale = readLocaleParam(resolvedSearchParams.locale, countryCode);
	const categoryCode = readCategoryParam(resolvedSearchParams.category);
	const subcategoryCode = readSubcategoryParam(resolvedSearchParams.subcategory);
	const hashtag = readHashtagParam(resolvedSearchParams.hashtag);
	const searchQuery = readSearchQueryParam(resolvedSearchParams.q);
	const authorHandle = readAuthorParam(resolvedSearchParams.author);
	const page = readPageParam(resolvedSearchParams.page);
	const seoContext = getHomeSeoContext({
		locale,
		page,
		categoryCode,
		subcategoryCode,
		hashtag,
		searchQuery,
		authorHandle,
		countryCode,
	});
	const canonicalUrl = toAbsoluteUrl(seoContext.canonicalPath);

	return {
		title: seoContext.title,
		description: seoContext.description,
		keywords: seoContext.keywords,
		alternates: {
			canonical: canonicalUrl,
		},
		openGraph: {
			type: "website",
			url: canonicalUrl,
			title: seoContext.title,
			description: seoContext.description,
			siteName: SITE_NAME,
			locale: locale === "zh" ? "zh_HK" : locale === "ja" ? "ja_JP" : "en_US",
		},
		twitter: {
			card: "summary",
			title: seoContext.title,
			description: seoContext.description,
		},
		robots: {
			index: seoContext.indexable,
			follow: true,
			googleBot: {
				index: seoContext.indexable,
				follow: true,
				"max-image-preview": "large",
				"max-snippet": -1,
				"max-video-preview": -1,
			},
		},
	};
}

function formatDate(value: string | null, locale: Locale): string {
	const copy = getHomePageCopy(locale);
	if (!value) {
		return copy.unknownDate;
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return copy.unknownDate;
	}

	return date.toLocaleDateString(locale === "zh" ? "zh-HK" : locale === "ja" ? "ja-JP" : "en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function formatInt(value: number, locale: Locale): string {
	return new Intl.NumberFormat(locale === "zh" ? "zh-HK" : locale === "ja" ? "ja-JP" : "en-US").format(Math.max(0, value));
}

function truncateText(value: string | null, maxLength: number): string | null {
	const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
	if (!normalized) {
		return null;
	}
	if (normalized.length <= maxLength) {
		return normalized;
	}
	return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function getPostSlugRef(post: Pick<PreparedPostRow, "post_slug" | "post_id">): string {
	const slug = post.post_slug?.trim();
	return slug || String(post.post_id);
}

function buildPostHref(post: Pick<PreparedPostRow, "post_slug" | "post_id">): string {
	return `/p/${encodeURIComponent(getPostSlugRef(post))}`;
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

	return `${PRIMARY_CDN_ORIGIN}/${trimmed.replace(/^\/+/, "")}`;
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

	const headingImages: PreparedContentHeadingImage[] = [];
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
	const paragraphs: PreparedContentParagraph[] = [];
	for (const rawParagraph of rawParagraphs) {
		const record = toObjectRecord(rawParagraph);
		if (!record) {
			continue;
		}

		const paragraphTypeRaw = toTrimmedText(record.type)?.toLowerCase();
		if (paragraphTypeRaw !== "p" && paragraphTypeRaw !== "image" && paragraphTypeRaw !== "hashtags") {
			continue;
		}

		const type = paragraphTypeRaw as PreparedContentParagraphType;
		const heading = toTrimmedText(record.heading);
		const content = toTrimmedText(record.content);
		const url = type === "image" ? toPrepareContentImageUrl(toTrimmedText(record.url)) : toTrimmedText(record.url);
		const hashtags = type === "hashtags" ? toNormalizedHashtags(content) : [];

		if (type === "p" && !heading && !content) {
			continue;
		}
		if (type === "image" && !heading && !content && !url) {
			continue;
		}
		if (type === "hashtags" && hashtags.length === 0) {
			continue;
		}

		paragraphs.push({
			type,
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
		hashtagsLocale: Array.from(
			new Set([
				...extractTagsFromList(root.hashtags_locale),
				...extractTagsFromList(srcOrg?.hashtags_locale ?? srcOrg?.hashtag_locale),
			]),
		).map((tag) => `#${tag}`),
		keyLines: Array.isArray(root.key_lines)
			? root.key_lines
					.map((entry) => toTrimmedText(entry))
					.filter((entry): entry is string => Boolean(entry))
			: [],
		headingHashtags: toNormalizedHashtags(toTrimmedText(root.heading_hashtags)),
		headingImages,
		paragraphs,
	};

	if (
		!prepared.title &&
		!prepared.eyebrow &&
		!prepared.subtitle &&
		!prepared.footerLine &&
		prepared.hashtagsLocale.length === 0 &&
		prepared.keyLines.length === 0 &&
		prepared.headingHashtags.length === 0 &&
		prepared.headingImages.length === 0 &&
		prepared.paragraphs.length === 0
	) {
		return null;
	}

	return prepared;
}

function buildPostAssignments(rows: PostAssignmentRow[]): Map<number, PostAssignmentGroup[]> {
	const assignmentMap = new Map<number, PostAssignmentGroup[]>();

	for (const row of rows) {
		const currentGroups = assignmentMap.get(row.post_id) ?? [];
		let group = currentGroups.find((entry) => entry.categoryCode === row.category_code);
		if (!group) {
			group = {
				categoryCode: row.category_code,
				categoryName: row.category_name ?? row.category_code,
				subcategories: [],
			};
			currentGroups.push(group);
			assignmentMap.set(row.post_id, currentGroups);
		}

		group.subcategories.push({
			code: row.subcategory_code,
			name: row.subcategory_name ?? row.subcategory_code,
			isPrimary: Boolean(row.is_primary),
		});
	}

	return assignmentMap;
}

function buildTaxonomy(rows: TaxonomyRow[]): TaxonomyCategory[] {
	const categories: TaxonomyCategory[] = [];

	for (const row of rows) {
		let category = categories.find((entry) => entry.code === row.category_code);
		if (!category) {
			category = {
				code: row.category_code,
				name: row.category_name ?? row.category_code,
				description: row.category_description,
				subcategories: [],
			};
			categories.push(category);
		}

		if (!row.subcategory_code) {
			continue;
		}

		category.subcategories.push({
			code: row.subcategory_code,
			name: row.subcategory_name ?? row.subcategory_code,
			description: row.subcategory_description,
			postCount: row.post_count ?? 0,
		});
	}

	return categories;
}

function buildPostView(post: PreparedPostRow, assignments: PostAssignmentGroup[], locale: Locale): PreparedPostView {
	const copy = getHomePageCopy(locale);
	const prepared = parsePrepareContent(post.prepare_content);
	const keyLines = (prepared?.keyLines ?? [])
		.map((line) => truncateText(line, 180))
		.filter((line): line is string => Boolean(line));
	const headingImage1 = prepared?.headingImages.find((entry) => entry.slot === 1) ?? null;
	const footerLine = truncateText(prepared?.footerLine ?? null, 120);
	const headingHashtags = (prepared?.headingHashtags ?? []).slice(0, 6);
	const primaryAssignmentGroup =
		assignments.find((group) => group.subcategories.some((subcategory) => subcategory.isPrimary)) ?? assignments[0] ?? null;
	const primarySubcategory =
		primaryAssignmentGroup?.subcategories.find((subcategory) => subcategory.isPrimary) ??
		primaryAssignmentGroup?.subcategories[0] ??
		null;
	const taxonomyLabel = primaryAssignmentGroup
		? [primaryAssignmentGroup.categoryName, primarySubcategory?.name ?? null]
				.filter((entry, index, values): entry is string => Boolean(entry) && values.indexOf(entry) === index)
				.join(" / ")
		: null;
	const hashtags = Array.from(
		new Set(
			prepared?.paragraphs.filter((paragraph) => paragraph.type === "hashtags").flatMap((paragraph) => paragraph.hashtags) ?? [],
		),
	).slice(0, 6);

	return {
		postId: post.post_id,
		href: buildPostHref(post),
		locale: toPostLocale(post.locale),
		taxonomyLabel,
		title:
			truncateText(prepared?.title ?? null, 120) ??
			truncateText(post.title, 120) ??
			truncateText(prepared?.keyLines[0] ?? null, 120) ??
			copy.fallbackPostTitle(post.post_id),
		eyebrow: truncateText(prepared?.eyebrow ?? null, 80),
		subtitle: truncateText(prepared?.subtitle ?? null, 120),
		footerLine,
		keyLines,
		headingImage1Src: headingImage1?.url ?? null,
		hashtagsLocale: prepared?.hashtagsLocale ?? [],
		headingHashtags,
		hashtags,
		authorName: post.author_name?.trim() || post.author_id?.trim() || copy.unknownAuthor,
		authorHandle: post.author_id?.trim() || null,
		createdAt: post.created_at,
		assignments,
	};
}

async function buildPreparedPostViews(db: D1Database, rows: PreparedPostRow[], locale: Locale): Promise<PreparedPostView[]> {
	if (rows.length === 0) {
		return [];
	}

	const postIds = rows.map((row) => row.post_id);
	const placeholders = postIds.map(() => "?").join(", ");
	const assignmentsResult = await db
		.prepare(
			`SELECT
				psa.post_id,
				pc.code AS category_code,
				COALESCE(pct_local.name, pct_en.name, pc.code) AS category_name,
				psc.code AS subcategory_code,
				COALESCE(psct_local.name, psct_en.name, psc.code) AS subcategory_name,
				psa.is_primary,
				psa.sort_order
			FROM posts_subcategory_assignments psa
			JOIN posts_subcategories psc
				ON psc.posts_subcategory_id = psa.posts_subcategory_id
			JOIN posts_categories pc
				ON pc.posts_category_id = psc.posts_category_id
			LEFT JOIN posts_category_translations pct_local
				ON pct_local.posts_category_id = pc.posts_category_id
				AND lower(pct_local.locale) = ?
			LEFT JOIN posts_category_translations pct_en
				ON pct_en.posts_category_id = pc.posts_category_id
				AND lower(pct_en.locale) = 'en'
			LEFT JOIN posts_subcategory_translations psct_local
				ON psct_local.posts_subcategory_id = psc.posts_subcategory_id
				AND lower(psct_local.locale) = ?
			LEFT JOIN posts_subcategory_translations psct_en
				ON psct_en.posts_subcategory_id = psc.posts_subcategory_id
				AND lower(psct_en.locale) = 'en'
			WHERE psa.post_id IN (${placeholders})
			ORDER BY psa.post_id ASC, pc.sort_order ASC, psa.is_primary DESC, psa.sort_order ASC, psc.sort_order ASC`,
		)
		.bind(locale, locale, ...postIds)
		.all<PostAssignmentRow>();

	const assignmentMap = buildPostAssignments(assignmentsResult.results ?? []);
	return rows.map((row) => buildPostView(row, assignmentMap.get(row.post_id) ?? [], locale));
}

async function loadHomePageData(
	pageRequest: number,
	locale: Locale,
	categoryCode: string | null,
	subcategoryCode: string | null,
	hashtag: string | null,
	searchQuery: string | null,
	authorHandle: string | null,
	countryCode: PostCountryCode,
): Promise<HomePageData> {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const db = (env as CloudflareEnv & { DB?: D1Database }).DB;
		if (!db) {
			return {
				error: getHomePageCopy(locale).dbUnavailableError,
				page: 1,
				totalPages: 0,
				totalPosts: 0,
				posts: [],
				taxonomy: [],
				hashtagOnlyFallbackCount: 0,
				hashtagOnlyFallbackPosts: [],
			};
		}

		const countryLocaleValues = getPostCountryLocaleValues(countryCode).map((value) => normalizePostLocaleFilterValue(value));
		const countryLocalePlaceholders = countryLocaleValues.map(() => "?").join(", ");
		const countryFilterClause = ` AND lower(replace(COALESCE(p.locale, ''), '_', '-')) IN (${countryLocalePlaceholders})`;
		const categoryFilterClause = categoryCode
			? ` AND EXISTS (
				SELECT 1
				FROM posts_subcategory_assignments psa_filter
				JOIN posts_subcategories psc_filter
					ON psc_filter.posts_subcategory_id = psa_filter.posts_subcategory_id
				JOIN posts_categories pc_filter
					ON pc_filter.posts_category_id = psc_filter.posts_category_id
				WHERE psa_filter.post_id = p.post_id
					AND pc_filter.code = ?
			)`
			: "";
		const categoryFilterBindings = categoryCode ? [categoryCode] : [];
		const subcategoryFilterClause = subcategoryCode
			? ` AND EXISTS (
				SELECT 1
				FROM posts_subcategory_assignments psa_sub_filter
				JOIN posts_subcategories psc_sub_filter
					ON psc_sub_filter.posts_subcategory_id = psa_sub_filter.posts_subcategory_id
				WHERE psa_sub_filter.post_id = p.post_id
					AND psc_sub_filter.code = ?
			)`
			: "";
		const subcategoryFilterBindings = subcategoryCode ? [subcategoryCode] : [];
		const hashtagFilterClause = hashtag
			? ` AND (
				instr(COALESCE(p.prepare_content, ''), ?) > 0
				OR instr(COALESCE(p.caption, ''), ?) > 0
				OR instr(COALESCE(p.title, ''), ?) > 0
			)`
			: "";
		const hashtagFilterBindings = hashtag ? [hashtag, hashtag, hashtag] : [];
		const searchFilterClause = searchQuery
			? ` AND (
				instr(COALESCE(p.title, ''), ?) > 0
				OR instr(COALESCE(p.caption, ''), ?) > 0
				OR instr(COALESCE(p.prepare_content, ''), ?) > 0
			)`
			: "";
		const searchFilterBindings = searchQuery ? [searchQuery, searchQuery, searchQuery] : [];
		const authorFilterClause = authorHandle
			? ` AND EXISTS (
				SELECT 1
				FROM users u_filter
				WHERE u_filter.user_pk = p.user_pk
					AND lower(COALESCE(u_filter.user_id, '')) = ?
			)`
			: "";
		const authorFilterBindings = authorHandle ? [authorHandle] : [];
		const filterBindings = [
			...countryLocaleValues,
			...categoryFilterBindings,
			...subcategoryFilterBindings,
			...hashtagFilterBindings,
			...searchFilterBindings,
			...authorFilterBindings,
		];

		const totalRow = await db
			.prepare(
				`SELECT COUNT(1) AS total
				FROM posts p
				WHERE ${PUBLIC_POSTS_WHERE}${countryFilterClause}${categoryFilterClause}${subcategoryFilterClause}${hashtagFilterClause}${searchFilterClause}${authorFilterClause}`,
			)
			.bind(...filterBindings)
			.first<{ total: number }>();
		const totalPosts = totalRow?.total ?? 0;
		const totalPages = totalPosts > 0 ? Math.ceil(totalPosts / PAGE_SIZE) : 0;
		const page = totalPages > 0 ? Math.min(pageRequest, totalPages) : 1;
		const offset = (page - 1) * PAGE_SIZE;

		const postsResult = await db
			.prepare(
				`SELECT
					p.post_id,
					p.post_slug,
					p.locale,
					p.title,
					p.caption,
					p.prepare_content,
					p.created_at,
					p.updated_at,
					u.name AS author_name,
					u.user_id AS author_id
				FROM posts p
				LEFT JOIN users u
					ON u.user_pk = p.user_pk
				WHERE ${PUBLIC_POSTS_WHERE}${countryFilterClause}${categoryFilterClause}${subcategoryFilterClause}${hashtagFilterClause}${searchFilterClause}${authorFilterClause}
				ORDER BY p.post_id DESC
				LIMIT ? OFFSET ?`,
			)
			.bind(...filterBindings, PAGE_SIZE, offset)
			.all<PreparedPostRow>();
		const postRows = postsResult.results ?? [];
		const posts = await buildPreparedPostViews(db, postRows, locale);
		let hashtagOnlyFallbackCount = 0;
		let hashtagOnlyFallbackPosts: PreparedPostView[] = [];

		if (totalPosts === 0 && hashtag && (categoryCode || subcategoryCode) && !searchQuery && !authorHandle) {
			const fallbackRow = await db
				.prepare(
					`SELECT COUNT(1) AS total
					FROM posts p
					WHERE ${PUBLIC_POSTS_WHERE}${countryFilterClause}${hashtagFilterClause}`,
				)
				.bind(...countryLocaleValues, ...hashtagFilterBindings)
				.first<{ total: number }>();
			hashtagOnlyFallbackCount = fallbackRow?.total ?? 0;

			if (hashtagOnlyFallbackCount > 0) {
				const fallbackPostsResult = await db
					.prepare(
						`SELECT
							p.post_id,
							p.post_slug,
							p.locale,
							p.title,
							p.caption,
							p.prepare_content,
							p.created_at,
							p.updated_at,
							u.name AS author_name,
							u.user_id AS author_id
						FROM posts p
						LEFT JOIN users u
							ON u.user_pk = p.user_pk
						WHERE ${PUBLIC_POSTS_WHERE}${countryFilterClause}${hashtagFilterClause}
						ORDER BY p.post_id DESC
						LIMIT ?`,
					)
					.bind(...countryLocaleValues, ...hashtagFilterBindings, PAGE_SIZE)
					.all<PreparedPostRow>();

				hashtagOnlyFallbackPosts = await buildPreparedPostViews(db, fallbackPostsResult.results ?? [], locale);
			}
		}

		const taxonomyResult = await db
			.prepare(
				`SELECT
					pc.code AS category_code,
					COALESCE(pct_local.name, pct_en.name, pc.code) AS category_name,
					COALESCE(pct_local.description, pct_en.description) AS category_description,
					psc.code AS subcategory_code,
					COALESCE(psct_local.name, psct_en.name, psc.code) AS subcategory_name,
					COALESCE(psct_local.description, psct_en.description) AS subcategory_description,
					COUNT(DISTINCT p.post_id) AS post_count
				FROM posts_categories pc
				LEFT JOIN posts_category_translations pct_local
					ON pct_local.posts_category_id = pc.posts_category_id
					AND lower(pct_local.locale) = ?
				LEFT JOIN posts_category_translations pct_en
					ON pct_en.posts_category_id = pc.posts_category_id
					AND lower(pct_en.locale) = 'en'
				LEFT JOIN posts_subcategories psc
					ON psc.posts_category_id = pc.posts_category_id
					AND psc.is_active = 1
				LEFT JOIN posts_subcategory_translations psct_local
					ON psct_local.posts_subcategory_id = psc.posts_subcategory_id
					AND lower(psct_local.locale) = ?
				LEFT JOIN posts_subcategory_translations psct_en
					ON psct_en.posts_subcategory_id = psc.posts_subcategory_id
					AND lower(psct_en.locale) = 'en'
				LEFT JOIN posts_subcategory_assignments psa
					ON psa.posts_subcategory_id = psc.posts_subcategory_id
				LEFT JOIN posts p
					ON p.post_id = psa.post_id
					AND p.visibility = 'public'
					AND lower(replace(COALESCE(p.locale, ''), '_', '-')) IN (${countryLocalePlaceholders})
				WHERE pc.is_active = 1
				GROUP BY
					pc.posts_category_id,
					pc.code,
					pct_local.name,
					pct_en.name,
					pct_local.description,
					pct_en.description,
					psc.posts_subcategory_id,
					psc.code,
					psct_local.name,
					psct_en.name,
					psct_local.description,
					psct_en.description
				ORDER BY pc.sort_order ASC, psc.sort_order ASC, psc.posts_subcategory_id ASC`,
			)
			.bind(locale, locale, ...countryLocaleValues)
			.all<TaxonomyRow>();

		return {
			error: null,
			page,
			totalPages,
			totalPosts,
			posts,
			taxonomy: buildTaxonomy(taxonomyResult.results ?? []),
			hashtagOnlyFallbackCount,
			hashtagOnlyFallbackPosts,
		};
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : getHomePageCopy(locale).loadFailedError,
			page: 1,
			totalPages: 0,
			totalPosts: 0,
			posts: [],
			taxonomy: [],
			hashtagOnlyFallbackCount: 0,
			hashtagOnlyFallbackPosts: [],
		};
	}
}

function SearchPanel({
	locale,
	selectedCategory,
	selectedSubcategory,
	selectedHashtag,
	selectedSearchQuery,
	selectedAuthor,
	selectedCountry,
	totalPosts,
}: {
	locale: Locale;
	selectedCategory: string | null;
	selectedSubcategory: string | null;
	selectedHashtag: string | null;
	selectedSearchQuery: string | null;
	selectedAuthor: string | null;
	selectedCountry: PostCountryCode;
	totalPosts: number;
}) {
	const copy = getHomePageCopy(locale);

	return (
		<div
			className="rounded-[1.75rem] border p-5 shadow-sm"
			style={{
				backgroundColor: "color-mix(in srgb, var(--cell-1) 94%, transparent)",
				borderColor: "color-mix(in srgb, var(--surface-border) 88%, transparent)",
				boxShadow: "var(--shadow-elev-1)",
			}}
		>
			<div className="mb-4 flex items-end justify-between gap-4">
				<div>
					<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--txt-3)]">{copy.searchBadge}</p>
					<h2 className="mt-2 text-xl font-semibold tracking-tight text-[color:var(--txt-1)]">{copy.searchTitle}</h2>
				</div>
				<p className="text-right text-xs text-[color:var(--txt-3)]">{copy.resultCount(totalPosts)}</p>
			</div>
			<form action="/" method="get" className="space-y-4">
				{locale !== DEFAULT_LOCALE ? <input type="hidden" name="locale" value={locale} /> : null}
				{selectedCountry !== DEFAULT_POST_COUNTRY_CODE ? <input type="hidden" name="country" value={selectedCountry} /> : null}
				{selectedCategory ? <input type="hidden" name="category" value={selectedCategory} /> : null}
				{selectedSubcategory ? <input type="hidden" name="subcategory" value={selectedSubcategory} /> : null}
				{selectedHashtag ? <input type="hidden" name="hashtag" value={selectedHashtag} /> : null}
				{selectedAuthor ? <input type="hidden" name="author" value={selectedAuthor} /> : null}
				<div>
					<label htmlFor="homepage-search" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--txt-3)]">
						{copy.searchQueryLabel}
					</label>
					<input
						id="homepage-search"
						name="q"
						type="search"
						defaultValue={selectedSearchQuery ?? ""}
						placeholder={copy.searchPlaceholder}
						className="mt-3 w-full rounded-[1.15rem] border px-4 py-3 text-sm outline-none transition-colors focus:border-[color:var(--accent-1)]"
						style={{
							backgroundColor: "color-mix(in srgb, var(--cell-2) 92%, transparent)",
							borderColor: "color-mix(in srgb, var(--surface-border) 82%, transparent)",
							color: "var(--txt-1)",
						}}
					/>
				</div>
				<div className="flex flex-wrap gap-2">
					<button
						type="submit"
						className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors hover:bg-[color:var(--cell-3)]"
						style={{
							borderColor: "color-mix(in srgb, var(--accent-1) 30%, transparent)",
							backgroundColor: "color-mix(in srgb, var(--accent-1) 12%, transparent)",
							color: "var(--accent-1)",
						}}
					>
						{copy.searchAction}
					</button>
					<Link
						href={buildPageHref(1, locale, selectedCategory, selectedSubcategory, selectedHashtag, null, selectedAuthor, selectedCountry)}
						className="rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-[color:var(--cell-3)]"
						style={{
							borderColor: "color-mix(in srgb, var(--surface-border) 85%, transparent)",
							color: "var(--txt-1)",
						}}
					>
						{copy.clearAction}
					</Link>
				</div>
			</form>
		</div>
	);
}

function Pagination({
	page,
	totalPages,
	locale,
	selectedCategory,
	selectedSubcategory,
	selectedHashtag,
	selectedSearchQuery,
	selectedAuthor,
	selectedCountry,
}: {
	page: number;
	totalPages: number;
	locale: Locale;
	selectedCategory: string | null;
	selectedSubcategory: string | null;
	selectedHashtag: string | null;
	selectedSearchQuery: string | null;
	selectedAuthor: string | null;
	selectedCountry: PostCountryCode;
}) {
	const copy = getHomePageCopy(locale);
	const previousHref = buildPageHref(
		Math.max(1, page - 1),
		locale,
		selectedCategory,
		selectedSubcategory,
		selectedHashtag,
		selectedSearchQuery,
		selectedAuthor,
		selectedCountry,
	);
	const nextHref = buildPageHref(page + 1, locale, selectedCategory, selectedSubcategory, selectedHashtag, selectedSearchQuery, selectedAuthor, selectedCountry);
	const hasPrevious = page > 1;
	const hasNext = totalPages > 0 && page < totalPages;
	const pageItems: Array<{ type: "page"; value: number } | { type: "ellipsis"; key: string }> = [];

	if (totalPages > 0) {
		if (totalPages <= 7) {
			for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
				pageItems.push({ type: "page", value: pageNumber });
			}
		} else {
			const windowStart = Math.max(2, page - 1);
			const windowEnd = Math.min(totalPages - 1, page + 1);

			pageItems.push({ type: "page", value: 1 });
			if (windowStart > 2) {
				pageItems.push({ type: "ellipsis", key: "start" });
			}
			for (let pageNumber = windowStart; pageNumber <= windowEnd; pageNumber += 1) {
				pageItems.push({ type: "page", value: pageNumber });
			}
			if (windowEnd < totalPages - 1) {
				pageItems.push({ type: "ellipsis", key: "end" });
			}
			pageItems.push({ type: "page", value: totalPages });
		}
	}

	return (
		<div
			className="flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border px-4 py-3"
			style={{
				backgroundColor: "color-mix(in srgb, var(--cell-1) 94%, transparent)",
				borderColor: "color-mix(in srgb, var(--surface-border) 82%, transparent)",
			}}
		>
			<p className="text-sm text-[color:var(--txt-2)]">{copy.pageSummary(page, totalPages)}</p>
			<div className="flex flex-wrap items-center justify-end gap-2">
				{hasPrevious ? (
					<Link
						href={previousHref}
						className="rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-[color:var(--cell-3)]"
						style={{ borderColor: "var(--surface-border)", color: "var(--txt-1)" }}
					>
						{copy.previousAction}
					</Link>
				) : (
					<span className="rounded-full border px-4 py-2 text-sm" style={{ borderColor: "var(--surface-border)", color: "var(--txt-3)" }}>
						{copy.previousAction}
					</span>
				)}
				{hasNext ? (
					<Link
						href={nextHref}
						className="rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-[color:var(--cell-3)]"
						style={{ borderColor: "var(--surface-border)", color: "var(--txt-1)" }}
					>
						{copy.nextAction}
					</Link>
				) : (
					<span className="rounded-full border px-4 py-2 text-sm" style={{ borderColor: "var(--surface-border)", color: "var(--txt-3)" }}>
						{copy.nextAction}
					</span>
				)}
				{pageItems.length > 0 ? (
					<div className="flex flex-wrap items-center gap-2" aria-label={copy.pageNumbersAria}>
						{pageItems.map((item) =>
							item.type === "page" ? (
								item.value === page ? (
									<span
										key={`page-${item.value}`}
										aria-current="page"
										className="rounded-full border px-3 py-2 text-sm font-semibold"
										style={{
											borderColor: "color-mix(in srgb, var(--accent-1) 30%, transparent)",
											backgroundColor: "color-mix(in srgb, var(--accent-1) 12%, transparent)",
											color: "var(--accent-1)",
										}}
									>
										{item.value}
									</span>
								) : (
									<Link
										key={`page-${item.value}`}
										href={buildPageHref(
											item.value,
											locale,
											selectedCategory,
											selectedSubcategory,
											selectedHashtag,
											selectedSearchQuery,
											selectedAuthor,
											selectedCountry,
										)}
										className="rounded-full border px-3 py-2 text-sm font-medium transition-colors hover:bg-[color:var(--cell-3)]"
										style={{ borderColor: "var(--surface-border)", color: "var(--txt-1)" }}
									>
										{item.value}
									</Link>
								)
							) : (
								<span key={item.key} className="px-1 text-sm text-[color:var(--txt-3)]" aria-hidden="true">
									...
								</span>
							),
						)}
					</div>
				) : null}
			</div>
		</div>
	);
}

function buildHashtagOnlyFallbackScope(categoryName: string | null, subcategoryName: string | null): string | null {
	if (categoryName && subcategoryName) {
		return `${categoryName} / ${subcategoryName}`;
	}

	return subcategoryName ?? categoryName ?? null;
}

function PostCards({ posts, locale }: { posts: PreparedPostView[]; locale: Locale }) {
	const copy = getHomePageCopy(locale);

	return (
		<>
			{posts.map((post) => (
				<Link key={post.postId} href={post.href} className="group block">
					<article
						className="flex flex-col gap-5 rounded-[1.85rem] border p-4 transition-transform duration-200 hover:-translate-y-0.5 sm:p-5"
						style={{
							backgroundColor: "color-mix(in srgb, var(--cell-1) 94%, transparent)",
							borderColor: "color-mix(in srgb, var(--surface-border) 85%, transparent)",
							boxShadow: "var(--shadow-elev-1)",
						}}
					>
						<div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
							<div
								className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.35rem] border"
								style={{
									background:
										"linear-gradient(135deg, color-mix(in srgb, var(--accent-3) 65%, transparent), color-mix(in srgb, var(--cell-2) 92%, transparent))",
									borderColor: "color-mix(in srgb, var(--surface-border) 82%, transparent)",
								}}
							>
								{post.headingImage1Src ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img
										src={post.headingImage1Src}
										alt={post.title}
										className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
										loading="lazy"
									/>
								) : (
									<div className="flex h-full items-end p-5">
										<div>
											<p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color:var(--txt-3)]">{copy.headingImageFallbackLabel}</p>
											<p className="mt-3 text-xl font-semibold leading-tight text-[color:var(--txt-1)]">{post.title}</p>
										</div>
									</div>
								)}
							</div>

							<div className="min-w-0">
								{post.taxonomyLabel || post.eyebrow ? (
									<div className="flex flex-wrap items-center gap-2">
										{post.taxonomyLabel ? (
											<span
												className="rounded-full px-3 py-1 text-[11px] font-semibold"
												style={{
													backgroundColor: "color-mix(in srgb, var(--accent-1) 12%, transparent)",
													color: "var(--accent-1)",
												}}
											>
												{post.taxonomyLabel}
											</span>
										) : null}
										{post.eyebrow ? <span className="text-sm font-medium text-[color:var(--txt-3)]">{post.eyebrow}</span> : null}
									</div>
								) : null}

								<h2 className="mt-4 text-2xl font-semibold tracking-tight text-[color:var(--txt-1)] sm:text-[2rem]">{post.title}</h2>

								{post.subtitle ? <p className="mt-3 text-lg leading-7 text-[color:var(--txt-2)]">{post.subtitle}</p> : null}

								{post.headingHashtags.length > 0 ? (
									<div className="mt-3 flex flex-wrap gap-2">
										{post.headingHashtags.map((hashtag) => (
											<span
												key={`${post.postId}-heading-${hashtag}`}
												className="rounded-full border px-3 py-1 text-sm font-medium"
												style={{
													borderColor: "color-mix(in srgb, var(--accent-2) 24%, transparent)",
													color: "var(--accent-2)",
													backgroundColor: "color-mix(in srgb, var(--accent-2) 10%, transparent)",
												}}
											>
												{hashtag}
											</span>
										))}
									</div>
								) : null}

								{post.footerLine ? <p className="mt-3 text-base font-medium leading-7 text-[color:var(--txt-2)]">{post.footerLine}</p> : null}
							</div>
						</div>

						{post.keyLines.length > 0 ? (
							<div className="space-y-2 border-l-2 pl-3" style={{ borderColor: "color-mix(in srgb, var(--accent-2) 24%, transparent)" }}>
								{post.keyLines.map((keyLine, index) => (
									<p key={`${post.postId}-key-line-${index}`} className="text-lg font-semibold leading-8 text-[color:var(--txt-1)]">
										{keyLine}
									</p>
								))}
							</div>
						) : null}

						{post.hashtagsLocale.length > 0 ? (
							<div className="mt-5">
								<div className="flex flex-wrap gap-2">
									{post.hashtagsLocale.map((hashtag) => (
										<span
											key={`${post.postId}-locale-${hashtag}`}
											className="rounded-full border px-3 py-1 text-sm font-medium"
											style={{
												borderColor: "color-mix(in srgb, var(--accent-1) 26%, transparent)",
												color: "var(--accent-1)",
												backgroundColor: "color-mix(in srgb, var(--accent-1) 10%, transparent)",
											}}
										>
											{hashtag}
										</span>
									))}
								</div>
							</div>
						) : null}

						{post.hashtags.length > 0 ? (
							<div className="mt-5 flex flex-wrap gap-2">
								{post.hashtags.map((hashtag) => (
									<span
										key={`${post.postId}-${hashtag}`}
										className="rounded-full border px-3 py-1 text-sm font-medium"
										style={{
											borderColor: "color-mix(in srgb, var(--accent-2) 24%, transparent)",
											color: "var(--accent-2)",
											backgroundColor: "color-mix(in srgb, var(--accent-2) 10%, transparent)",
										}}
									>
										{hashtag}
									</span>
								))}
							</div>
						) : null}

						<div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
							<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[color:var(--txt-3)]">
								<span className="font-medium text-[color:var(--txt-1)]">{post.authorName}</span>
								{post.authorHandle ? <span>@{post.authorHandle}</span> : null}
								<span>{copy.publishedLabel} {formatDate(post.createdAt, locale)}</span>
							</div>
							<span className="font-semibold text-[color:var(--accent-1)]">{copy.openPostLabel}</span>
						</div>
					</article>
				</Link>
			))}
		</>
	);
}

export default async function HomePage({ searchParams }: HomePageProps) {
	const resolvedSearchParams = (await searchParams) || {};
	const selectedCountry = await resolveSelectedCountryCode(resolvedSearchParams.country);
	const locale = readLocaleParam(resolvedSearchParams.locale, selectedCountry);
	const copy = getHomePageCopy(locale);
	const selectedCategory = readCategoryParam(resolvedSearchParams.category);
	const selectedSubcategory = readSubcategoryParam(resolvedSearchParams.subcategory);
	const selectedHashtag = readHashtagParam(resolvedSearchParams.hashtag);
	const selectedSearchQuery = readSearchQueryParam(resolvedSearchParams.q);
	const selectedAuthor = readAuthorParam(resolvedSearchParams.author);
	const requestedPage = readPageParam(resolvedSearchParams.page);
	const seoContext = getHomeSeoContext({
		locale,
		page: requestedPage,
		categoryCode: selectedCategory,
		subcategoryCode: selectedSubcategory,
		hashtag: selectedHashtag,
		searchQuery: selectedSearchQuery,
		authorHandle: selectedAuthor,
		countryCode: selectedCountry,
	});
	const { error, page, totalPages, totalPosts, posts, taxonomy, hashtagOnlyFallbackCount, hashtagOnlyFallbackPosts } = await loadHomePageData(
		requestedPage,
		locale,
		selectedCategory,
		selectedSubcategory,
		selectedHashtag,
		selectedSearchQuery,
		selectedAuthor,
		selectedCountry,
	);
	const selectedTaxonomyCategory =
		(selectedCategory ? taxonomy.find((category) => category.code === selectedCategory) : null) ??
		(selectedSubcategory ? taxonomy.find((category) => category.subcategories.some((subcategory) => subcategory.code === selectedSubcategory)) : null) ??
		null;
	const selectedTaxonomySubcategory =
		selectedTaxonomyCategory?.subcategories.find((subcategory) => subcategory.code === selectedSubcategory) ?? null;
	const hashtagOnlyFallbackScope = buildHashtagOnlyFallbackScope(
		selectedTaxonomyCategory?.name ?? toSeoLabel(selectedCategory),
		selectedTaxonomySubcategory?.name ?? toSeoLabel(selectedSubcategory),
	);
	const canonicalUrl = toAbsoluteUrl(
		buildPageHref(page, locale, selectedCategory, selectedSubcategory, selectedHashtag, selectedSearchQuery, selectedAuthor, selectedCountry),
	);
	const collectionDescription =
		selectedTaxonomySubcategory?.description ??
		selectedTaxonomyCategory?.description ??
		seoContext.description;
	const websiteJsonLd = {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": `${SITE_URL}/#website`,
		name: SITE_NAME,
		url: SITE_URL,
		potentialAction: {
			"@type": "SearchAction",
			target: `${SITE_URL}/?q={search_term_string}`,
			"query-input": "required name=search_term_string",
		},
	};
	const collectionPageJsonLd = {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		"@id": canonicalUrl,
		url: canonicalUrl,
		name: seoContext.title,
		description: collectionDescription,
		inLanguage: locale === "zh" ? "zh-HK" : locale === "ja" ? "ja-JP" : "en",
		isPartOf: {
			"@type": "WebSite",
			"@id": `${SITE_URL}/#website`,
			name: SITE_NAME,
			url: SITE_URL,
		},
	};
	const breadcrumbItems = [
		{
			"@type": "ListItem",
			position: 1,
			name: SITE_NAME,
			item: toAbsoluteUrl("/"),
		},
		selectedTaxonomyCategory
			? {
					"@type": "ListItem",
					position: 2,
					name: selectedTaxonomyCategory.name,
					item: toAbsoluteUrl(
						buildPageHref(1, locale, selectedTaxonomyCategory.code, null, selectedHashtag, selectedSearchQuery, selectedAuthor, selectedCountry),
					),
			  }
			: null,
		selectedTaxonomySubcategory
			? {
					"@type": "ListItem",
					position: selectedTaxonomyCategory ? 3 : 2,
					name: selectedTaxonomySubcategory.name,
					item: toAbsoluteUrl(
						buildPageHref(
							1,
							locale,
							selectedTaxonomyCategory?.code ?? null,
							selectedTaxonomySubcategory.code,
							selectedHashtag,
							selectedSearchQuery,
							selectedAuthor,
							selectedCountry,
						),
					),
			  }
			: null,
		selectedAuthor
			? {
					"@type": "ListItem",
					position: selectedTaxonomySubcategory ? 4 : selectedTaxonomyCategory ? 3 : 2,
					name: `@${selectedAuthor}`,
					item: canonicalUrl,
			  }
			: null,
		selectedHashtag
			? {
					"@type": "ListItem",
					position: selectedAuthor ? (selectedTaxonomySubcategory ? 5 : selectedTaxonomyCategory ? 4 : 3) : selectedTaxonomySubcategory ? 4 : selectedTaxonomyCategory ? 3 : 2,
					name: selectedHashtag,
					item: canonicalUrl,
			  }
			: null,
		selectedSearchQuery
			? {
					"@type": "ListItem",
					position: selectedHashtag
						? selectedAuthor
							? 6
							: 5
						: selectedAuthor
							? selectedTaxonomySubcategory
								? 5
								: selectedTaxonomyCategory
									? 4
									: 3
							: selectedTaxonomySubcategory
								? 4
								: selectedTaxonomyCategory
									? 3
									: 2,
					name: `Search: ${selectedSearchQuery}`,
					item: canonicalUrl,
			  }
			: null,
	].filter(Boolean);
	const breadcrumbJsonLd =
		breadcrumbItems.length > 1
			? {
					"@context": "https://schema.org",
					"@type": "BreadcrumbList",
					itemListElement: breadcrumbItems,
			  }
			: null;
	const itemListJsonLd =
		posts.length > 0
			? {
					"@context": "https://schema.org",
					"@type": "ItemList",
					name: seoContext.title,
					itemListOrder: "https://schema.org/ItemListOrderDescending",
					numberOfItems: posts.length,
					itemListElement: posts.map((post, index) => ({
						"@type": "ListItem",
						position: index + 1,
						url: toAbsoluteUrl(post.href),
						name: post.title,
					})),
			  }
			: null;

	return (
		<main className="min-h-screen pb-12" style={{ backgroundImage: "var(--page-bg-gradient)" }}>
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
				<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }} />
				<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionPageJsonLd) }} />
				{breadcrumbJsonLd ? (
					<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
				) : null}
				{itemListJsonLd ? (
					<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }} />
				) : null}
				<section
					className="relative overflow-hidden rounded-[2rem] border px-6 py-8 shadow-sm"
					style={{
						background:
							"linear-gradient(135deg, color-mix(in srgb, var(--cell-1) 95%, transparent), color-mix(in srgb, var(--accent-3) 50%, var(--cell-2)))",
						borderColor: "color-mix(in srgb, var(--surface-border) 86%, transparent)",
						boxShadow: "var(--shadow-elev-1)",
					}}
				>
					<div className="flex flex-col gap-5">
						<nav className="flex flex-wrap gap-2" aria-label={copy.navCategoriesAria}>
							<Link
								href={buildPageHref(1, locale, null, null, selectedHashtag, selectedSearchQuery, selectedAuthor, selectedCountry)}
								aria-current={selectedCategory ? undefined : "page"}
								className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors hover:bg-[color:var(--cell-3)]"
								style={{
									borderColor: selectedCategory
										? "color-mix(in srgb, var(--surface-border) 85%, transparent)"
										: "color-mix(in srgb, var(--accent-1) 30%, transparent)",
									backgroundColor: selectedCategory
										? "color-mix(in srgb, var(--cell-1) 90%, transparent)"
										: "color-mix(in srgb, var(--accent-1) 12%, transparent)",
									color: selectedCategory ? "var(--txt-1)" : "var(--accent-1)",
								}}
							>
								{copy.homeLabel}
							</Link>
							<Link
								href="/feed"
								className="rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-[color:var(--cell-3)]"
								style={{
									borderColor: "color-mix(in srgb, var(--surface-border) 85%, transparent)",
									backgroundColor: "color-mix(in srgb, var(--cell-1) 90%, transparent)",
									color: "var(--txt-1)",
								}}
							>
								{copy.feedLabel}
							</Link>
							{taxonomy.map((category) => (
								<Link
									key={category.code}
									href={buildCategoryHref(category.code, locale, selectedHashtag, selectedSearchQuery, selectedAuthor, selectedCountry)}
									aria-current={selectedCategory === category.code ? "page" : undefined}
									className="rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-[color:var(--cell-3)]"
									style={{
										borderColor:
											selectedCategory === category.code
												? "color-mix(in srgb, var(--accent-1) 30%, transparent)"
												: "color-mix(in srgb, var(--surface-border) 85%, transparent)",
										backgroundColor:
											selectedCategory === category.code
												? "color-mix(in srgb, var(--accent-1) 12%, transparent)"
												: "color-mix(in srgb, var(--cell-1) 90%, transparent)",
										color: selectedCategory === category.code ? "var(--accent-1)" : "var(--txt-1)",
									}}
								>
									{category.name}
								</Link>
							))}
						</nav>

						{selectedTaxonomyCategory && selectedTaxonomyCategory.subcategories.length > 0 ? (
							<div
								className="rounded-[1.35rem] border p-4"
								style={{
									backgroundColor: "color-mix(in srgb, var(--cell-1) 90%, transparent)",
									borderColor: "color-mix(in srgb, var(--surface-border) 85%, transparent)",
								}}
							>
								<div className="flex flex-wrap gap-2">
									{selectedTaxonomyCategory.subcategories.map((subcategory) => (
										<Link
											key={`${selectedTaxonomyCategory.code}-${subcategory.code}`}
											href={buildSubcategoryHref(
												selectedTaxonomyCategory.code,
												subcategory.code,
												locale,
												selectedHashtag,
												selectedSearchQuery,
												selectedAuthor,
												selectedCountry,
											)}
											aria-current={selectedSubcategory === subcategory.code ? "page" : undefined}
											className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
											style={{
												backgroundColor:
													selectedSubcategory === subcategory.code
														? "color-mix(in srgb, var(--accent-2) 12%, transparent)"
														: "color-mix(in srgb, var(--cell-2) 92%, transparent)",
												borderColor:
													selectedSubcategory === subcategory.code
														? "color-mix(in srgb, var(--accent-2) 24%, transparent)"
														: "color-mix(in srgb, var(--surface-border) 82%, transparent)",
												color: selectedSubcategory === subcategory.code ? "var(--accent-2)" : "var(--txt-2)",
											}}
										>
											<span className="font-medium">{subcategory.name}</span>
											<span className="text-[color:var(--txt-3)]">{subcategory.postCount}</span>
										</Link>
									))}
								</div>
							</div>
						) : null}

						{selectedHashtag ? (
							<div
								className="rounded-[1.35rem] border px-4 py-3"
								style={{
									backgroundColor: "color-mix(in srgb, var(--cell-1) 90%, transparent)",
									borderColor: "color-mix(in srgb, var(--surface-border) 85%, transparent)",
								}}
							>
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--txt-3)]">{copy.hashtagFilterLabel}</p>
										<p className="mt-2 text-base font-semibold text-[color:var(--accent-1)]">{selectedHashtag}</p>
									</div>
									<Link
										href={buildPageHref(1, locale, selectedCategory, selectedSubcategory, null, selectedSearchQuery, selectedAuthor, selectedCountry)}
										className="rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-[color:var(--cell-3)]"
										style={{
											borderColor: "color-mix(in srgb, var(--surface-border) 85%, transparent)",
											color: "var(--txt-1)",
										}}
									>
										{copy.clearAction}
									</Link>
								</div>
							</div>
						) : null}

						{selectedAuthor ? (
							<div
								className="rounded-[1.35rem] border px-4 py-3"
								style={{
									backgroundColor: "color-mix(in srgb, var(--cell-1) 90%, transparent)",
									borderColor: "color-mix(in srgb, var(--surface-border) 85%, transparent)",
								}}
							>
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--txt-3)]">{copy.authorFilterLabel}</p>
										<p className="mt-2 text-base font-semibold text-[color:var(--accent-1)]">@{selectedAuthor}</p>
									</div>
									<Link
										href={buildPageHref(1, locale, selectedCategory, selectedSubcategory, selectedHashtag, selectedSearchQuery, null, selectedCountry)}
										className="rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-[color:var(--cell-3)]"
										style={{
											borderColor: "color-mix(in srgb, var(--surface-border) 85%, transparent)",
											color: "var(--txt-1)",
										}}
									>
										{copy.clearAction}
									</Link>
								</div>
							</div>
						) : null}
					</div>
				</section>

				<div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
					<div className="xl:sticky xl:top-24 xl:self-start">
						<SearchPanel
							locale={locale}
							selectedCategory={selectedCategory}
							selectedSubcategory={selectedSubcategory}
							selectedHashtag={selectedHashtag}
							selectedSearchQuery={selectedSearchQuery}
							selectedAuthor={selectedAuthor}
							selectedCountry={selectedCountry}
							totalPosts={totalPosts}
						/>
					</div>

					<div className="flex min-w-0 flex-col gap-4">
						<Pagination
							page={page}
							totalPages={totalPages}
							locale={locale}
							selectedCategory={selectedCategory}
							selectedSubcategory={selectedSubcategory}
							selectedHashtag={selectedHashtag}
							selectedSearchQuery={selectedSearchQuery}
							selectedAuthor={selectedAuthor}
							selectedCountry={selectedCountry}
						/>

						{error ? (
							<section
								className="rounded-[1.75rem] border p-6"
								style={{
									backgroundColor: "color-mix(in srgb, var(--cell-1) 94%, transparent)",
									borderColor: "color-mix(in srgb, var(--surface-border) 85%, transparent)",
								}}
							>
								<p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-1)]">{copy.dataUnavailableLabel}</p>
								<p className="mt-3 text-base leading-7 text-[color:var(--txt-2)]">{error}</p>
							</section>
						) : null}

						{!error && posts.length === 0 ? (
							<section
								className="rounded-[1.75rem] border p-6"
								style={{
									backgroundColor: "color-mix(in srgb, var(--cell-1) 94%, transparent)",
									borderColor: "color-mix(in srgb, var(--surface-border) 85%, transparent)",
								}}
							>
								<p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--txt-3)]">{copy.noPublicPostsLabel}</p>
								<p className="mt-3 text-base leading-7 text-[color:var(--txt-2)]">
									{buildNoResultsMessage(locale, {
										searchQuery: selectedSearchQuery,
										hashtag: selectedHashtag,
										subcategory: selectedSubcategory,
										author: selectedAuthor,
										category: selectedCategory,
									})}
								</p>
								{selectedHashtag && hashtagOnlyFallbackCount > 0 && hashtagOnlyFallbackScope ? (
									<div
										className="mt-5 rounded-[1.25rem] border p-4"
										style={{
											backgroundColor: "color-mix(in srgb, var(--cell-2) 92%, transparent)",
											borderColor: "color-mix(in srgb, var(--surface-border) 82%, transparent)",
										}}
									>
										<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--txt-3)]">{copy.relatedResultsTitle}</p>
										<p className="mt-2 text-sm leading-6 text-[color:var(--txt-2)]">
											{copy.hashtagOnlyFallback(selectedHashtag, hashtagOnlyFallbackScope, formatInt(hashtagOnlyFallbackCount, locale))}
										</p>
									</div>
								) : null}
							</section>
						) : null}

						{selectedHashtag && hashtagOnlyFallbackPosts.length > 0 ? (
							<section
								className="rounded-[1.75rem] border p-6"
								style={{
									backgroundColor: "color-mix(in srgb, var(--cell-1) 94%, transparent)",
									borderColor: "color-mix(in srgb, var(--surface-border) 85%, transparent)",
								}}
							>
								<p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--txt-3)]">{copy.relatedResultsTitle}</p>
								<h2 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--txt-1)]">
									{copy.hashtagOnlyFallbackSectionTitle(selectedHashtag)}
								</h2>
								{hashtagOnlyFallbackScope && hashtagOnlyFallbackCount > 0 ? (
									<p className="mt-3 text-base leading-7 text-[color:var(--txt-2)]">
										{copy.hashtagOnlyFallback(selectedHashtag, hashtagOnlyFallbackScope, formatInt(hashtagOnlyFallbackCount, locale))}
									</p>
								) : null}
								<div className="mt-6 flex flex-col gap-4">
									<PostCards posts={hashtagOnlyFallbackPosts} locale={locale} />
								</div>
							</section>
						) : null}

						<div className="flex flex-col gap-4">
							<PostCards posts={posts} locale={locale} />
						</div>

						{posts.length > 0 ? (
							<Pagination
								page={page}
								totalPages={totalPages}
								locale={locale}
								selectedCategory={selectedCategory}
								selectedSubcategory={selectedSubcategory}
								selectedHashtag={selectedHashtag}
								selectedSearchQuery={selectedSearchQuery}
								selectedAuthor={selectedAuthor}
								selectedCountry={selectedCountry}
							/>
						) : null}
					</div>
				</div>

				<SiteFooter locale={locale} />
			</div>
		</main>
	);
}
