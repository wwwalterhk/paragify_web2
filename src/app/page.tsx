import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import type { FeedCursor, FeedPost } from "@/lib/feed-posts";
import { DEFAULT_FEED_PAGE_SIZE, loadFeedPosts } from "@/lib/feed-posts";
import { FeedInfiniteList } from "./components/feed-infinite-list";

export const dynamic = "force-dynamic";
const SITE_NAME = "Paragify";
const DEFAULT_SITE_URL = "http://localhost:3000";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, "");

type InitialFeedResult = {
	posts: FeedPost[];
	hasMore: boolean;
	nextCursor: FeedCursor | null;
	error: string | null;
};

type HomePageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeParam(value?: string | string[]): string | null {
	const raw = Array.isArray(value) ? value[0] : value;
	if (!raw) return null;
	const normalized = raw
		.replace(/^#+/, "")
		.normalize("NFKC")
		.replace(/^[^A-Za-z0-9\u00C0-\uFFFF_-]+/, "")
		.replace(/[^A-Za-z0-9\u00C0-\uFFFF_-]+$/, "")
		.trim()
		.toLowerCase();
	return normalized || null;
}

function normalizeUserParam(value?: string | string[]): string | null {
	const raw = Array.isArray(value) ? value[0] : value;
	if (!raw) return null;
	const normalized = raw.replace(/^@+/, "").normalize("NFKC").trim().toLowerCase();
	if (!normalized || !/^[a-z0-9._-]+$/.test(normalized)) return null;
	return normalized;
}

function buildFeedHref(options: { tag?: string | null; user?: string | null }): string {
	const params = new URLSearchParams();
	if (options.tag) {
		params.set("tag", options.tag);
	}
	if (options.user) {
		params.set("user", options.user);
	}
	const query = params.toString();
	return query ? `/?${query}` : "/";
}

function toAbsoluteUrl(path: string): string {
	if (path.startsWith("http://") || path.startsWith("https://")) {
		return path;
	}
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${SITE_URL}${normalizedPath}`;
}

function getHomeSeoContext(activeTag: string | null, activeUserId: string | null): {
	title: string;
	description: string;
	canonicalPath: string;
	keywords: string[];
} {
	if (activeTag && activeUserId) {
		return {
			title: `@${activeUserId} posts with #${activeTag} | ${SITE_NAME}`,
			description: `Browse public posts by @${activeUserId} tagged #${activeTag} on ${SITE_NAME}.`,
			canonicalPath: buildFeedHref({ tag: activeTag, user: activeUserId }),
			keywords: [SITE_NAME.toLowerCase(), activeUserId, activeTag, "public feed", "social posts"],
		};
	}

	if (activeTag) {
		return {
			title: `#${activeTag} posts | ${SITE_NAME}`,
			description: `Discover public posts tagged #${activeTag} on ${SITE_NAME}.`,
			canonicalPath: buildFeedHref({ tag: activeTag }),
			keywords: [SITE_NAME.toLowerCase(), activeTag, "hashtag feed", "public posts"],
		};
	}

	if (activeUserId) {
		return {
			title: `@${activeUserId} posts | ${SITE_NAME}`,
			description: `Browse the public posts published by @${activeUserId} on ${SITE_NAME}.`,
			canonicalPath: buildFeedHref({ user: activeUserId }),
			keywords: [SITE_NAME.toLowerCase(), activeUserId, "creator posts", "public feed"],
		};
	}

	return {
		title: `${SITE_NAME} | Public Feed`,
		description: `${SITE_NAME} public feed. Discover the latest posts, hashtags, and creators.`,
		canonicalPath: "/",
		keywords: [SITE_NAME.toLowerCase(), "public feed", "social posts", "hashtags", "creators"],
	};
}

function getPostSlugRef(post: Pick<FeedPost, "post_slug" | "post_id">): string {
	const slug = post.post_slug?.trim();
	return slug || String(post.post_id);
}

function serializeJsonLd(value: unknown): string {
	return JSON.stringify(value).replace(/</g, "\\u003c");
}

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
	const resolvedSearchParams = (await searchParams) || {};
	const activeTag = normalizeParam(resolvedSearchParams.tag) ?? normalizeParam(resolvedSearchParams.hashtag);
	const activeUserId =
		normalizeUserParam(resolvedSearchParams.user) ??
		normalizeUserParam(resolvedSearchParams.user_id) ??
		normalizeUserParam(resolvedSearchParams.userId);
	const seoContext = getHomeSeoContext(activeTag, activeUserId);
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
		},
		twitter: {
			card: "summary",
			title: seoContext.title,
			description: seoContext.description,
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
	};
}

async function getInitialFeed(
	viewerEmail?: string | null,
	tag?: string | null,
	authorUserId?: string | null,
): Promise<InitialFeedResult> {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const db = (env as CloudflareEnv & { DB?: D1Database }).DB;
		if (!db) {
			return {
				posts: [],
				hasMore: false,
				nextCursor: null,
				error: "D1 binding `DB` is not available in this environment.",
			};
		}

		let viewerUserPk: number | null = null;
		const normalizedEmail = viewerEmail?.trim().toLowerCase() || null;
		if (normalizedEmail) {
			const viewerRow = await db
				.prepare("SELECT user_pk FROM users WHERE lower(email) = ? LIMIT 1")
				.bind(normalizedEmail)
				.first<{ user_pk: number }>();
			viewerUserPk = viewerRow?.user_pk ?? null;
		}

		const result = await loadFeedPosts(db, {
			limit: DEFAULT_FEED_PAGE_SIZE,
			viewerUserPk,
			tag,
			authorUserId,
		});

		return {
			posts: result.posts,
			hasMore: result.hasMore,
			nextCursor: result.nextCursor,
			error: null,
		};
	} catch (error) {
		return {
			posts: [],
			hasMore: false,
			nextCursor: null,
			error: error instanceof Error ? error.message : "Failed to load posts.",
		};
	}
}

export default async function Home({ searchParams }: HomePageProps) {
	const resolvedSearchParams = (await searchParams) || {};
	const activeTag =
		normalizeParam(resolvedSearchParams.tag) ??
		normalizeParam(resolvedSearchParams.hashtag);
	const activeUserId =
		normalizeUserParam(resolvedSearchParams.user) ??
		normalizeUserParam(resolvedSearchParams.user_id) ??
		normalizeUserParam(resolvedSearchParams.userId);
	const session = await getServerSession(authOptions);

	const sessionUser = session?.user as
		| {
				email?: string | null;
		  }
		| undefined;
	const { posts, hasMore, nextCursor, error } = await getInitialFeed(
		sessionUser?.email ?? null,
		activeTag,
		activeUserId,
	);
	const seoContext = getHomeSeoContext(activeTag, activeUserId);
	const canonicalUrl = toAbsoluteUrl(seoContext.canonicalPath);

	const websiteJsonLd = {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: SITE_NAME,
		url: SITE_URL,
		potentialAction: {
			"@type": "SearchAction",
			target: `${SITE_URL}/?tag={search_term_string}`,
			"query-input": "required name=search_term_string",
		},
	};

	const collectionPageJsonLd = {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		name: seoContext.title,
		description: seoContext.description,
		url: canonicalUrl,
		isPartOf: {
			"@type": "WebSite",
			name: SITE_NAME,
			url: SITE_URL,
		},
	};

	const itemListJsonLd = {
		"@context": "https://schema.org",
		"@type": "ItemList",
		name: activeTag ? `Posts tagged #${activeTag}` : activeUserId ? `Posts by @${activeUserId}` : `${SITE_NAME} public feed`,
		itemListOrder: "https://schema.org/ItemListOrderDescending",
		numberOfItems: posts.length,
		itemListElement: posts.slice(0, DEFAULT_FEED_PAGE_SIZE).map((post, index) => ({
			"@type": "ListItem",
			position: index + 1,
			url: toAbsoluteUrl(`/post/zh/${encodeURIComponent(getPostSlugRef(post))}`),
			name: post.title?.trim() || post.caption?.trim() || `Post ${post.post_id}`,
		})),
	};

	return (
		<main className="min-h-screen pb-12 text-[color:var(--txt-1)]">
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }} />
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionPageJsonLd) }} />
			{posts.length > 0 ? (
				<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }} />
			) : null}
			<div
				className="pointer-events-none fixed inset-0 -z-10"
				style={{
					backgroundColor: "var(--bg-1)",
					backgroundImage: "var(--page-bg-gradient)",
				}}
			/>
			<div className="mx-auto w-full max-w-xl px-3 pt-6">
				{error ? (
					<p className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
						{error}
					</p>
				) : null}
				{activeTag || activeUserId ? (
					<div className="mb-4 flex items-center gap-2 text-sm text-[color:var(--txt-2)]">
						{activeUserId ? (
							<>
								<span className="inline-flex items-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-3 py-1 font-semibold text-[color:var(--accent-1)]">
									@{activeUserId}
								</span>
								<Link
									href={buildFeedHref({ tag: activeTag })}
									className="inline-flex items-center rounded-full border border-[color:var(--surface-border)] px-3 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-[color:var(--cell-2)]"
								>
									Clear user
								</Link>
							</>
						) : null}
						{activeTag ? (
							<>
								<span className="inline-flex items-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-3 py-1 font-semibold text-[color:var(--accent-2)]">
									#{activeTag}
								</span>
								<Link
									href={buildFeedHref({ user: activeUserId })}
									className="inline-flex items-center rounded-full border border-[color:var(--surface-border)] px-3 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-[color:var(--cell-2)]"
								>
									Clear tag
								</Link>
							</>
						) : null}
						{activeTag && activeUserId ? (
							<Link
								href="/"
								className="inline-flex items-center rounded-full border border-[color:var(--surface-border)] px-3 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-[color:var(--cell-2)]"
							>
								Clear all
							</Link>
						) : null}
					</div>
				) : null}

				<FeedInfiniteList
					initialPosts={posts}
					initialHasMore={hasMore}
					initialCursor={nextCursor}
					pageSize={DEFAULT_FEED_PAGE_SIZE}
					initialTag={activeTag}
					initialUserId={activeUserId}
				/>
			</div>
		</main>
	);
}
