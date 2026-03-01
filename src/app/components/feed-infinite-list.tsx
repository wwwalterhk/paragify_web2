"use client";

import {
	BookmarkIcon as BookmarkOutlineIcon,
	ChatBubbleOvalLeftIcon,
	EllipsisHorizontalIcon,
	HeartIcon as HeartOutlineIcon,
	PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import {
	BookmarkIcon as BookmarkSolidIcon,
	HeartIcon as HeartSolidIcon,
} from "@heroicons/react/24/solid";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedCursor, FeedPost } from "@/lib/feed-posts";
import {
	formatFeedCount,
	formatFeedDate,
	getFeedAvatarInitials,
	getFeedHandle,
	parseFeedCoverPageScale,
} from "@/lib/feed-posts";
import { FeedPostCaption } from "./feed-post-caption";
import { FeedPostMediaCarousel } from "./feed-post-media-carousel";

type FeedInfiniteListProps = {
	initialPosts: FeedPost[];
	initialHasMore: boolean;
	initialCursor: FeedCursor | null;
	pageSize: number;
	initialTag?: string | null;
	initialUserId?: string | null;
};

type FeedApiResponse = {
	ok: boolean;
	posts?: FeedPost[];
	has_more?: boolean;
	next_cursor?: FeedCursor | null;
	error?: string;
};

type ToggleLikeResponse = {
	ok: boolean;
	likeCount?: number | null;
	liked?: boolean;
	message?: string;
};

type ToggleSaveResponse = {
	ok: boolean;
	saved?: boolean;
	saveCount?: number | null;
	message?: string;
};

type DirectChatResponse = {
	ok: boolean;
	convoId?: string;
	peerUserId?: string | null;
	message?: string;
};

function getPostImageUrls(post: FeedPost): string[] {
	return post.media_items
		.filter((item) => item.media_type === "image")
		.map((item) => item.transformed_image_url || item.source_url)
		.filter((url): url is string => Boolean(url));
}

function getFirstPostImageUrl(post: FeedPost | undefined): string | null {
	if (!post) return null;
	const firstImage = post.media_items.find((item) => item.media_type === "image" && (item.transformed_image_url || item.source_url));
	return firstImage ? firstImage.transformed_image_url || firstImage.source_url : null;
}

function getCursorFromPosts(posts: FeedPost[]): FeedCursor | null {
	const lastPost = posts[posts.length - 1];
	if (!lastPost || !lastPost.created_at) {
		return null;
	}
	return {
		created_at: lastPost.created_at,
		post_id: lastPost.post_id,
	};
}

export function FeedInfiniteList({
	initialPosts,
	initialHasMore,
	initialCursor,
	pageSize,
	initialTag = null,
	initialUserId = null,
}: FeedInfiniteListProps) {
	const router = useRouter();
	const pathname = usePathname();
	const [posts, setPosts] = useState(initialPosts);
	const [hasMore, setHasMore] = useState(initialHasMore);
	const [nextCursor, setNextCursor] = useState<FeedCursor | null>(initialCursor);
	const [activeTag, setActiveTag] = useState<string | null>(initialTag);
	const [activeUserId, setActiveUserId] = useState<string | null>(initialUserId);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [pendingLikeIds, setPendingLikeIds] = useState<Set<number>>(() => new Set());
	const [pendingSaveIds, setPendingSaveIds] = useState<Set<number>>(() => new Set());
	const [pendingPmIds, setPendingPmIds] = useState<Set<number>>(() => new Set());
	const [visiblePostIds, setVisiblePostIds] = useState<number[]>([]);
	const postsRef = useRef(posts);
	const sentinelRef = useRef<HTMLDivElement | null>(null);
	const articleElementsRef = useRef<Map<number, HTMLElement>>(new Map());
	const visiblePostIdsRef = useRef<Set<number>>(new Set());
	const preloadedImageUrlsRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		postsRef.current = posts;
	}, [posts]);

	useEffect(() => {
		setPosts(initialPosts);
		setHasMore(initialHasMore);
		setNextCursor(initialCursor);
		setActiveTag(initialTag ?? null);
		setActiveUserId(initialUserId ?? null);
		setLoadError(null);
	}, [initialCursor, initialHasMore, initialPosts, initialTag, initialUserId]);

	useEffect(() => {
		const elements = Array.from(articleElementsRef.current.values());
		if (elements.length === 0) {
			visiblePostIdsRef.current.clear();
			setVisiblePostIds([]);
			return;
		}
		if (typeof IntersectionObserver === "undefined") {
			const allPostIds = posts.map((post) => post.post_id);
			visiblePostIdsRef.current = new Set(allPostIds);
			setVisiblePostIds(allPostIds);
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				let changed = false;
				for (const entry of entries) {
					const target = entry.target as HTMLElement;
					const postIdRaw = target.dataset.postId;
					const postId = postIdRaw ? Number(postIdRaw) : NaN;
					if (!Number.isFinite(postId)) continue;

					const currentlyVisible = visiblePostIdsRef.current.has(postId);
					const shouldBeVisible = entry.isIntersecting;
					if (currentlyVisible === shouldBeVisible) continue;

					if (shouldBeVisible) {
						visiblePostIdsRef.current.add(postId);
					} else {
						visiblePostIdsRef.current.delete(postId);
					}
					changed = true;
				}

				if (changed) {
					setVisiblePostIds(Array.from(visiblePostIdsRef.current));
				}
			},
			{
				root: null,
				rootMargin: "100px 0px 100px 0px",
				threshold: 0.15,
			},
		);

		for (const element of elements) {
			observer.observe(element);
		}

		return () => {
			observer.disconnect();
		};
	}, [posts]);

	useEffect(() => {
		if (typeof window === "undefined" || visiblePostIds.length === 0 || posts.length === 0) {
			return;
		}

		const postIndexById = new Map<number, number>();
		for (let index = 0; index < posts.length; index += 1) {
			postIndexById.set(posts[index].post_id, index);
		}

		const urlsToPreload = new Set<string>();
		for (const visiblePostId of visiblePostIds) {
			const index = postIndexById.get(visiblePostId);
			if (index === undefined) continue;

			const visiblePost = posts[index];
			for (const url of getPostImageUrls(visiblePost)) {
				urlsToPreload.add(url);
			}

			const nextPostFirstImageUrl = getFirstPostImageUrl(posts[index + 1]);
			if (nextPostFirstImageUrl) {
				urlsToPreload.add(nextPostFirstImageUrl);
			}
		}

		for (const url of urlsToPreload) {
			if (preloadedImageUrlsRef.current.has(url)) continue;
			preloadedImageUrlsRef.current.add(url);
			const image = new window.Image();
			image.decoding = "async";
			image.src = url;
		}
	}, [posts, visiblePostIds]);

	const updatePostById = useCallback((postId: number, updater: (post: FeedPost) => FeedPost) => {
		setPosts((current) =>
			current.map((post) => (post.post_id === postId ? updater(post) : post)),
		);
	}, []);

	const redirectToSignIn = useCallback(() => {
		if (typeof window === "undefined") return;
		const callbackUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
		window.location.assign(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
	}, []);

	const redirectToSignInWithCallback = useCallback(
		(callbackUrl: string) => {
			router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
		},
		[router],
	);
	const localeSegment = pathname === "/en" || pathname?.startsWith("/en/") ? "en" : "zh";

	const openComments = useCallback(
		(postSlug: string | null) => {
			if (!postSlug?.trim()) return;
			router.push(`/post/${localeSegment}/${encodeURIComponent(postSlug)}#comments`);
		},
		[localeSegment, router],
	);

	const openAuthorPosts = useCallback(
		(authorId: string | null) => {
			const normalizedAuthorId = authorId?.trim().toLowerCase() || null;
			if (!normalizedAuthorId) return;
			const feedPath = pathname === "/en" || pathname?.startsWith("/en/") ? "/en" : "/";
			router.push(`${feedPath}?user=${encodeURIComponent(normalizedAuthorId)}`);
		},
		[pathname, router],
	);

	const toggleLike = useCallback(
		async (postId: number) => {
			if (pendingLikeIds.has(postId)) return;

			const currentPost = postsRef.current.find((post) => post.post_id === postId);
			if (!currentPost) return;

			const previousLiked = Boolean(currentPost.liked);
			const previousLikeCount = Number.isFinite(currentPost.like_count)
				? currentPost.like_count
				: 0;
			const optimisticLiked = !previousLiked;
			const optimisticLikeCount = Math.max(
				0,
				previousLikeCount + (optimisticLiked ? 1 : -1),
			);

			setPendingLikeIds((prev) => {
				const next = new Set(prev);
				next.add(postId);
				return next;
			});
			updatePostById(postId, (post) => ({
				...post,
				liked: optimisticLiked,
				like_count: optimisticLikeCount,
			}));

			try {
				const response = await fetch("/api/posts/like", {
					method: previousLiked ? "DELETE" : "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ postId }),
				});
				const data = (await response.json().catch(() => null)) as ToggleLikeResponse | null;

				if (response.status === 401 || response.status === 403) {
					updatePostById(postId, (post) => ({
						...post,
						liked: previousLiked,
						like_count: previousLikeCount,
					}));
					redirectToSignIn();
					return;
				}

				if (!response.ok || !data?.ok) {
					throw new Error(data?.message || "Failed to update like.");
				}

				updatePostById(postId, (post) => ({
					...post,
					liked: typeof data.liked === "boolean" ? data.liked : optimisticLiked,
					like_count:
						typeof data.likeCount === "number" && Number.isFinite(data.likeCount)
							? data.likeCount
							: post.like_count,
				}));
			} catch (error) {
				updatePostById(postId, (post) => ({
					...post,
					liked: previousLiked,
					like_count: previousLikeCount,
				}));
				setLoadError(
					error instanceof Error ? error.message : "Failed to update like.",
				);
			} finally {
				setPendingLikeIds((prev) => {
					const next = new Set(prev);
					next.delete(postId);
					return next;
				});
			}
		},
		[pendingLikeIds, redirectToSignIn, updatePostById],
	);

	const toggleSave = useCallback(
		async (postId: number) => {
			if (pendingSaveIds.has(postId)) return;

			const currentPost = postsRef.current.find((post) => post.post_id === postId);
			if (!currentPost) return;

			const previousSaved = Boolean(currentPost.saved);
			const optimisticSaved = !previousSaved;

			setPendingSaveIds((prev) => {
				const next = new Set(prev);
				next.add(postId);
				return next;
			});
			updatePostById(postId, (post) => ({
				...post,
				saved: optimisticSaved,
			}));

			try {
				const response = await fetch("/api/mobile/post/save", {
					method: previousSaved ? "DELETE" : "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ postId }),
				});
				const data = (await response.json().catch(() => null)) as ToggleSaveResponse | null;

				if (response.status === 401 || response.status === 403) {
					updatePostById(postId, (post) => ({
						...post,
						saved: previousSaved,
					}));
					redirectToSignIn();
					return;
				}

				if (!response.ok || !data?.ok) {
					throw new Error(data?.message || "Failed to update save.");
				}

				updatePostById(postId, (post) => ({
					...post,
					saved: typeof data.saved === "boolean" ? data.saved : optimisticSaved,
				}));
			} catch (error) {
				updatePostById(postId, (post) => ({
					...post,
					saved: previousSaved,
				}));
				setLoadError(
					error instanceof Error ? error.message : "Failed to update save.",
				);
			} finally {
				setPendingSaveIds((prev) => {
					const next = new Set(prev);
					next.delete(postId);
					return next;
				});
			}
		},
		[pendingSaveIds, redirectToSignIn, updatePostById],
	);

	const loadMore = useCallback(async () => {
		if (isLoadingMore || !hasMore) {
			return;
		}

		const cursor = nextCursor ?? getCursorFromPosts(postsRef.current);
		if (!cursor) {
			setHasMore(false);
			return;
		}

		setIsLoadingMore(true);
		setLoadError(null);

		try {
			const params = new URLSearchParams({
				limit: String(pageSize),
				cursor_created_at: cursor.created_at,
				cursor_post_id: String(cursor.post_id),
			});
			if (activeTag) {
				params.set("tag", activeTag);
			}
			if (activeUserId) {
				params.set("user", activeUserId);
			}
			const response = await fetch(`/api/feed?${params.toString()}`, {
				method: "GET",
				cache: "no-store",
			});
			const data = (await response.json().catch(() => null)) as FeedApiResponse | null;

			if (!response.ok || !data?.ok || !Array.isArray(data.posts)) {
				throw new Error(data?.error || "Failed to load more posts.");
			}

			setPosts((current) => {
				const existingIds = new Set(current.map((post) => post.post_id));
				const uniqueNewPosts = data.posts!.filter((post) => !existingIds.has(post.post_id));
				if (uniqueNewPosts.length === 0) {
					return current;
				}
				return [...current, ...uniqueNewPosts];
			});
			setHasMore(Boolean(data.has_more));
			setNextCursor(data.next_cursor ?? getCursorFromPosts(data.posts));
		} catch (error) {
			setLoadError(error instanceof Error ? error.message : "Failed to load more posts.");
		} finally {
			setIsLoadingMore(false);
		}
	}, [activeTag, activeUserId, hasMore, isLoadingMore, nextCursor, pageSize]);

	const openPm = useCallback(
		async (postId: number, authorId: string | null) => {
			const targetAuthorId = authorId?.trim() || null;
			if (!targetAuthorId || pendingPmIds.has(postId)) {
				return;
			}

			setPendingPmIds((prev) => {
				const next = new Set(prev);
				next.add(postId);
				return next;
			});
			setLoadError(null);

			try {
				const response = await fetch("/api/mobile/chat", {
					method: "POST",
					headers: { "content-type": "application/json", accept: "application/json" },
					body: JSON.stringify({
						action: "direct",
						user_id: targetAuthorId,
					}),
				});
				const data = (await response.json().catch(() => null)) as DirectChatResponse | null;

				if (response.status === 401 || response.status === 403) {
					redirectToSignInWithCallback(`/chat/zh#${encodeURIComponent(targetAuthorId)}`);
					return;
				}

				if (!response.ok || !data?.ok) {
					throw new Error(data?.message || "Failed to open PM.");
				}

				const hashTarget = (data.peerUserId?.trim() || targetAuthorId).trim();
				router.push(`/chat/zh#${encodeURIComponent(hashTarget)}`);
			} catch (error) {
				setLoadError(error instanceof Error ? error.message : "Failed to open PM.");
			} finally {
				setPendingPmIds((prev) => {
					const next = new Set(prev);
					next.delete(postId);
					return next;
				});
			}
		},
		[pendingPmIds, redirectToSignInWithCallback, router],
	);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) {
					return;
				}
				void loadMore();
			},
			{
				root: null,
				rootMargin: "1400px 0px 1400px 0px",
				threshold: 0,
			},
		);

		observer.observe(sentinel);
		return () => {
			observer.disconnect();
		};
	}, [loadMore]);

	if (posts.length === 0) {
		return (
			<div className="rounded-2xl border border-dashed border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-6 py-16 text-center text-[color:var(--txt-2)]">
				No posts yet.
			</div>
		);
	}

	return (
		<div>
			<div className="space-y-6">
				{posts.map((post) => {
					const handle = getFeedHandle(post);
					const initials = getFeedAvatarInitials(handle);
					const trimmedCaption = post.caption?.trim() ?? "";
					const feedPageScale = parseFeedCoverPageScale(post.cover_layout_json);
					const isLiked = Boolean(post.liked);
					const isSaved = Boolean(post.saved);
					const likePending = pendingLikeIds.has(post.post_id);
					const savePending = pendingSaveIds.has(post.post_id);
					const pmPending = pendingPmIds.has(post.post_id);
					const canPm = Boolean(post.author_id?.trim());
					const authorId = post.author_id?.trim() || null;
					const authorName = post.author_name?.trim() || null;
					const authorNameLabel = authorName || (authorId ? `@${authorId}` : handle);
					const authorIdLabel = authorId ? `@${authorId}` : null;
					const shouldShowSecondaryIdLine = Boolean(authorName && authorId);
					const authorPostsAriaLabel = authorIdLabel
						? `Open ${authorName ? `${authorName} (${authorIdLabel})` : authorIdLabel} posts`
						: `Open ${authorNameLabel} posts`;

					return (
						<article
							key={post.post_id}
							data-post-id={post.post_id}
							ref={(element) => {
								if (element) {
									articleElementsRef.current.set(post.post_id, element);
									return;
								}
								articleElementsRef.current.delete(post.post_id);
								visiblePostIdsRef.current.delete(post.post_id);
							}}
							className="overflow-hidden rounded-[22px] border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] shadow-[var(--shadow-elev-1)]"
						>
							<div className="flex items-center justify-between px-4 py-3">
								<div className="flex items-center gap-3">
									{authorId ? (
										<button
											type="button"
											onClick={() => openAuthorPosts(authorId)}
											className="h-9 w-9 overflow-hidden rounded-full transition hover:ring-2 hover:ring-[color:var(--accent-1)]/35"
											aria-label={authorPostsAriaLabel}
										>
											{post.author_avatar ? (
												<img
													src={post.author_avatar}
													alt={`${handle} avatar`}
													className="h-full w-full object-cover"
													referrerPolicy="no-referrer"
												/>
											) : (
												<div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#0ea5e9_0%,#f43f5e_100%)] text-[11px] font-semibold text-white">
													{initials}
												</div>
											)}
										</button>
									) : (
										<div className="h-9 w-9 overflow-hidden rounded-full">
											{post.author_avatar ? (
												<img
													src={post.author_avatar}
													alt={`${handle} avatar`}
													className="h-full w-full object-cover"
													referrerPolicy="no-referrer"
												/>
											) : (
												<div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#0ea5e9_0%,#f43f5e_100%)] text-[11px] font-semibold text-white">
													{initials}
												</div>
											)}
										</div>
									)}
									<div className="leading-tight">
										{authorId ? (
											<button
												type="button"
												onClick={() => openAuthorPosts(authorId)}
												className="block max-w-[14rem] truncate text-sm font-semibold text-[color:var(--txt-1)] hover:underline"
											>
												{authorNameLabel}
											</button>
										) : (
											<p className="block max-w-[14rem] truncate text-sm font-semibold text-[color:var(--txt-1)]">{authorNameLabel}</p>
										)}
										{authorId && shouldShowSecondaryIdLine ? (
											<button
												type="button"
												onClick={() => openAuthorPosts(authorId)}
												className="block max-w-[14rem] truncate text-xs font-medium text-[color:var(--txt-2)] hover:underline"
											>
												{authorIdLabel}
											</button>
										) : null}
										<p className="text-[11px] uppercase tracking-wide text-[color:var(--txt-3)]">
											{formatFeedDate(post.created_at)}
										</p>
									</div>
								</div>
								<EllipsisHorizontalIcon className="h-5 w-5 text-[color:var(--txt-3)]" aria-hidden="true" />
							</div>

							<FeedPostMediaCarousel
								postId={post.post_id}
								postTitle={post.title}
								pageScale={feedPageScale}
								pageCount={Math.max(post.page_count, post.media_items.length)}
								mediaItems={post.media_items}
							/>

								<div className="space-y-3 px-4 pb-4 pt-3">
									<div className="flex items-center justify-between text-[color:var(--txt-2)]">
										<div className="flex items-center gap-4">
											<button
												type="button"
												aria-label={isLiked ? "Unlike" : "Like"}
												onClick={() => void toggleLike(post.post_id)}
												disabled={likePending}
												className={[
													"transition",
													isLiked
														? "text-[color:var(--accent-1)]"
														: "hover:text-[color:var(--txt-1)]",
													likePending ? "cursor-not-allowed opacity-60" : "",
												].join(" ")}
											>
												{isLiked ? (
													<HeartSolidIcon className="h-6 w-6" aria-hidden="true" />
												) : (
													<HeartOutlineIcon className="h-6 w-6" aria-hidden="true" />
												)}
											</button>
											<button
												type="button"
												aria-label="Comment"
												onClick={() => openComments(post.post_slug)}
												disabled={!post.post_slug}
												className={[
													"transition",
													post.post_slug
														? "hover:text-[color:var(--txt-1)]"
														: "cursor-not-allowed opacity-40",
												].join(" ")}
											>
												<ChatBubbleOvalLeftIcon className="h-6 w-6" aria-hidden="true" />
											</button>
											<button
												type="button"
												aria-label="PM"
												onClick={() => void openPm(post.post_id, post.author_id)}
												disabled={!canPm || pmPending}
												className={[
													"transition",
													canPm ? "hover:text-[color:var(--txt-1)]" : "opacity-40",
													pmPending ? "cursor-not-allowed opacity-60" : "",
												].join(" ")}
											>
												<PaperAirplaneIcon className="h-6 w-6" aria-hidden="true" />
											</button>
										</div>
										<button
											type="button"
											aria-label={isSaved ? "Unsave" : "Save"}
											onClick={() => void toggleSave(post.post_id)}
											disabled={savePending}
											className={[
												"transition",
												isSaved
													? "text-[color:var(--accent-2)]"
													: "hover:text-[color:var(--txt-1)]",
												savePending ? "cursor-not-allowed opacity-60" : "",
											].join(" ")}
										>
											{isSaved ? (
												<BookmarkSolidIcon className="h-6 w-6" aria-hidden="true" />
											) : (
												<BookmarkOutlineIcon className="h-6 w-6" aria-hidden="true" />
											)}
										</button>
									</div>

									<p className="text-sm font-semibold text-[color:var(--txt-1)]">
										{formatFeedCount(post.like_count)} likes
									</p>

									{trimmedCaption ? (
										<FeedPostCaption handle={handle} caption={trimmedCaption} postSlug={post.post_slug} />
									) : (
										<p className="text-sm italic text-[color:var(--txt-3)]">No caption.</p>
									)}

									<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-wide text-[color:var(--txt-3)]">
										<span>{formatFeedCount(post.comment_count)} comments</span>
										<span>{post.page_count} pages</span>
										{post.post_slug ? <span>/{post.post_slug}</span> : null}
									</div>
								</div>
						</article>
					);
				})}
			</div>

			<div ref={sentinelRef} className="h-12" />

			{isLoadingMore ? (
				<p className="-mt-2 pb-4 text-center text-sm text-[color:var(--txt-3)]">Loading more posts...</p>
			) : null}

			{loadError ? (
				<div className="-mt-2 mb-4 flex items-center justify-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
					<span>{loadError}</span>
					<button
						type="button"
						onClick={() => void loadMore()}
						className="rounded-md border border-amber-400 px-2 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-amber-100"
					>
						Retry
					</button>
				</div>
			) : null}

			{!hasMore && posts.length > 0 ? (
				<p className="-mt-2 pb-4 text-center text-xs uppercase tracking-[0.12em] text-[color:var(--txt-3)]">
					You are all caught up
				</p>
			) : null}
		</div>
	);
}
