"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type FeedPageScale = "4:5" | "3:4" | "1:1";

type FeedMediaItem = {
	page_num: number;
	media_type: "image" | "video";
	source_url: string | null;
	transformed_image_url: string | null;
};

type FeedPostMediaCarouselProps = {
	postId: number;
	postTitle: string | null;
	pageScale: FeedPageScale;
	pageCount: number;
	mediaItems: FeedMediaItem[];
	firstImageFetchPriority?: "high" | "auto" | "low";
};

const FEED_PAGE_SCALE_DIMENSIONS: Record<FeedPageScale, { width: number; height: number }> = {
	"4:5": { width: 4, height: 5 },
	"3:4": { width: 3, height: 4 },
	"1:1": { width: 1, height: 1 },
};

const EMPTY_MEDIA_ITEM: FeedMediaItem = {
	page_num: 1,
	media_type: "image",
	source_url: null,
	transformed_image_url: null,
};

const SWIPE_MIN_DISTANCE_PX = 40;
const SWIPE_DIRECTION_LOCK_PX = 10;
const SWIPE_SNAP_RATIO = 0.22;
const SWIPE_MIN_VELOCITY_PX_PER_MS = 0.45;

function getWrappedIndex(index: number, total: number): number {
	if (total <= 0) {
		return 0;
	}
	return ((index % total) + total) % total;
}

export function FeedPostMediaCarousel({
	postId,
	postTitle,
	pageScale,
	pageCount,
	mediaItems,
	firstImageFetchPriority = "auto",
}: FeedPostMediaCarouselProps) {
	const [activeIndex, setActiveIndex] = useState(0);
	const [activeImagePending, setActiveImagePending] = useState(false);
	const [dragOffsetPx, setDragOffsetPx] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [trackTransitionEnabled, setTrackTransitionEnabled] = useState(true);
	const carouselViewportRef = useRef<HTMLDivElement | null>(null);
	const swipeStateRef = useRef<{
		pointerId: number;
		startX: number;
		startY: number;
		axisLock: "x" | "y" | null;
		lastX: number;
		lastTimestamp: number;
		velocityX: number;
	} | null>(null);
	const loadedImageUrlsRef = useRef<Set<string>>(new Set());
	const prefetchingImageUrlsRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		setActiveIndex((current) => {
			if (mediaItems.length <= 1) {
				return 0;
			}
			return getWrappedIndex(current, mediaItems.length);
		});
		setDragOffsetPx(0);
		setIsDragging(false);
		setTrackTransitionEnabled(true);
		swipeStateRef.current = null;
	}, [mediaItems.length]);

	const resolvedMediaItems = mediaItems.length > 0 ? mediaItems : [EMPTY_MEDIA_ITEM];
	const resolvedPageCount = Math.max(pageCount, resolvedMediaItems.length);
	const activeMediaItem = resolvedMediaItems[Math.min(activeIndex, resolvedMediaItems.length - 1)] ?? EMPTY_MEDIA_ITEM;
	const activeImageSource = activeMediaItem.source_url || activeMediaItem.transformed_image_url;
	const activePageNumber = Math.max(1, activeIndex + 1);
	const activeImageFetchPriority = activeIndex === 0 ? firstImageFetchPriority : "auto";
	const activeImageLoading = activeIndex === 0 && firstImageFetchPriority === "high" ? "eager" : "lazy";
	const pageScaleDimensions = FEED_PAGE_SCALE_DIMENSIONS[pageScale];
	const swipeEnabled = resolvedMediaItems.length > 1;
	const wrappedPrevIndex = getWrappedIndex(activeIndex - 1, resolvedMediaItems.length);
	const wrappedNextIndex = getWrappedIndex(activeIndex + 1, resolvedMediaItems.length);

	useEffect(() => {
		if (activeMediaItem.media_type !== "image" || !activeImageSource) {
			setActiveImagePending(false);
			return;
		}
		setActiveImagePending(!loadedImageUrlsRef.current.has(activeImageSource));
	}, [activeImageSource, activeMediaItem.media_type]);

	function goToPage(index: number, disableTransition = false) {
		const wrappedIndex = getWrappedIndex(index, resolvedMediaItems.length);
		if (disableTransition) {
			setTrackTransitionEnabled(false);
		} else if (!trackTransitionEnabled) {
			setTrackTransitionEnabled(true);
		}
		setActiveIndex(wrappedIndex);
		setDragOffsetPx(0);
	}

	function prefetchImageSource(source: string | null) {
		const normalizedSource = source?.trim() || null;
		if (!normalizedSource) return;
		if (loadedImageUrlsRef.current.has(normalizedSource)) return;
		if (prefetchingImageUrlsRef.current.has(normalizedSource)) return;

		prefetchingImageUrlsRef.current.add(normalizedSource);
		const prefetchImage = new window.Image();
		prefetchImage.decoding = "async";
		const finalize = () => {
			prefetchingImageUrlsRef.current.delete(normalizedSource);
		};
		prefetchImage.onload = () => {
			loadedImageUrlsRef.current.add(normalizedSource);
			finalize();
		};
		prefetchImage.onerror = finalize;
		prefetchImage.src = normalizedSource;
	}

	function prefetchFollowingImages(fromIndex: number) {
		for (let offset = 1; offset <= 2; offset += 1) {
			const nextItemIndex = getWrappedIndex(fromIndex + offset, resolvedMediaItems.length);
			const nextItem = resolvedMediaItems[nextItemIndex];
			if (!nextItem || nextItem.media_type !== "image") continue;
			prefetchImageSource(nextItem.source_url || nextItem.transformed_image_url);
		}
	}

	function goToPageWithPrefetch(
		index: number,
		options: { movedForward?: boolean; disableTransition?: boolean } = {},
	) {
		const wrappedIndex = getWrappedIndex(index, resolvedMediaItems.length);
		goToPage(wrappedIndex, options.disableTransition ?? false);
		if (options.movedForward) {
			prefetchFollowingImages(wrappedIndex);
		}
	}

	function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
		if (!swipeEnabled) {
			return;
		}
		if (event.pointerType === "mouse" && event.button !== 0) {
			return;
		}
		if (event.pointerType === "mouse") {
			// Prevent native image drag/select behavior so desktop swipe stays responsive.
			event.preventDefault();
		}

		swipeStateRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			axisLock: null,
			lastX: event.clientX,
			lastTimestamp: event.timeStamp,
			velocityX: 0,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
	}

	function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
		let swipeState = swipeStateRef.current;
		if (!swipeState || swipeState.pointerId !== event.pointerId) {
			return;
		}

		const deltaX = event.clientX - swipeState.startX;
		const deltaY = event.clientY - swipeState.startY;

		let axisLock = swipeState.axisLock;
		if (!axisLock && (Math.abs(deltaX) > SWIPE_DIRECTION_LOCK_PX || Math.abs(deltaY) > SWIPE_DIRECTION_LOCK_PX)) {
			axisLock = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
		}

		const timeDelta = Math.max(1, event.timeStamp - swipeState.lastTimestamp);
		const velocityX = (event.clientX - swipeState.lastX) / timeDelta;

		swipeState = {
			...swipeState,
			axisLock,
			lastX: event.clientX,
			lastTimestamp: event.timeStamp,
			velocityX,
		};
		swipeStateRef.current = swipeState;

		if (axisLock !== "x") {
			return;
		}

		setIsDragging(true);
		setDragOffsetPx(deltaX);
		if (Math.abs(deltaX) > SWIPE_DIRECTION_LOCK_PX) {
			event.preventDefault();
		}
	}

	function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
		const swipeState = swipeStateRef.current;
		if (!swipeState || swipeState.pointerId !== event.pointerId) {
			return;
		}

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}

		const deltaX = event.clientX - swipeState.startX;
		const deltaY = event.clientY - swipeState.startY;
		const containerWidth = carouselViewportRef.current?.clientWidth ?? event.currentTarget.clientWidth ?? 0;
		const minSwipeDistancePx = Math.max(SWIPE_MIN_DISTANCE_PX, containerWidth * SWIPE_SNAP_RATIO);
		const hasDistanceThreshold = Math.abs(deltaX) >= minSwipeDistancePx && Math.abs(deltaX) > Math.abs(deltaY);
		const hasVelocityThreshold = Math.abs(swipeState.velocityX) >= SWIPE_MIN_VELOCITY_PX_PER_MS;

		let nextIndex = activeIndex;
		let swipeDirection: 1 | -1 | null = null;
		if (swipeState.axisLock === "x" && (hasDistanceThreshold || hasVelocityThreshold)) {
			const direction: 1 | -1 = hasVelocityThreshold
				? swipeState.velocityX < 0
					? 1
					: -1
				: deltaX < 0
					? 1
					: -1;
			swipeDirection = direction;
			nextIndex = getWrappedIndex(activeIndex + direction, resolvedMediaItems.length);
		}

		setIsDragging(false);
		setDragOffsetPx(0);
		if (nextIndex !== activeIndex) {
			const wrappedFromLastToFirst =
				swipeDirection === 1 &&
				activeIndex === resolvedMediaItems.length - 1 &&
				nextIndex === 0;
			const wrappedFromFirstToLast =
				swipeDirection === -1 &&
				activeIndex === 0 &&
				nextIndex === resolvedMediaItems.length - 1;
			goToPageWithPrefetch(nextIndex, {
				movedForward: swipeDirection === 1,
				disableTransition: wrappedFromLastToFirst || wrappedFromFirstToLast,
			});
		}
		swipeStateRef.current = null;
	}

	function handlePointerCancel(event: React.PointerEvent<HTMLDivElement>) {
		const swipeState = swipeStateRef.current;
		if (!swipeState || swipeState.pointerId !== event.pointerId) {
			return;
		}
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		setIsDragging(false);
		setDragOffsetPx(0);
		swipeStateRef.current = null;
	}

	function handleNativeDragStart(event: React.DragEvent<HTMLDivElement>) {
		event.preventDefault();
	}

	function markImageAsLoaded(source: string | null) {
		const normalizedSource = source?.trim() || null;
		if (!normalizedSource) {
			setActiveImagePending(false);
			return;
		}
		loadedImageUrlsRef.current.add(normalizedSource);
		setActiveImagePending(false);
	}

	return (
		<div className="space-y-2">
			<div
				ref={carouselViewportRef}
				className="relative w-full overflow-hidden bg-[color:var(--cell-2)]"
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerEnd}
				onPointerCancel={handlePointerCancel}
				onDragStart={handleNativeDragStart}
				style={{
					aspectRatio: `${pageScaleDimensions.width} / ${pageScaleDimensions.height}`,
					touchAction: swipeEnabled ? "pan-y" : "auto",
					cursor: swipeEnabled ? (isDragging ? "grabbing" : "grab") : "default",
					userSelect: "none",
					WebkitUserSelect: "none",
				}}
			>
				<div
					className={`flex h-full ${isDragging || !trackTransitionEnabled ? "" : "transition-transform duration-300 ease-out"}`}
					style={{
						transform: `translate3d(calc(${-activeIndex * 100}% + ${dragOffsetPx}px), 0, 0)`,
					}}
				>
					{resolvedMediaItems.map((item, index) => {
							const slideKey = `post-${postId}-slide-${index + 1}`;
							const slideImageSource = item.source_url || item.transformed_image_url;
							const isActiveSlide = index === activeIndex;
							const shouldRenderSlide =
								index === activeIndex ||
								index === wrappedPrevIndex ||
								index === wrappedNextIndex;
						if (!shouldRenderSlide) {
							return (
								<div key={slideKey} className="relative h-full w-full shrink-0" />
							);
						}

						return (
							<div key={slideKey} className="relative h-full w-full shrink-0">
								{item.media_type === "video" && item.source_url ? (
									<video
										className="h-full w-full object-cover"
										src={item.source_url}
										controls
										playsInline
										preload={isActiveSlide ? "metadata" : "none"}
									/>
								) : slideImageSource ? (
									<Image
										key={`${slideKey}-${slideImageSource}`}
										src={slideImageSource}
										alt={
											postTitle
												? `${postTitle} page ${index + 1}`
												: `Post ${postId} page ${index + 1}`
										}
										fill
										className={`object-cover transition-opacity duration-150 ${isActiveSlide && activeImagePending ? "opacity-0" : "opacity-100"}`}
										sizes="(max-width: 820px) 100vw, 640px"
										fetchPriority={isActiveSlide ? activeImageFetchPriority : "low"}
										loading={isActiveSlide ? activeImageLoading : "lazy"}
										onLoad={() => markImageAsLoaded(slideImageSource)}
										onError={() => {
											if (isActiveSlide) {
												setActiveImagePending(false);
											}
										}}
										draggable={false}
									/>
								) : (
									<div className="flex h-full items-center justify-center text-sm text-[color:var(--txt-3)]">
										No cover media
									</div>
								)}
							</div>
						);
					})}
				</div>

				{activeImagePending ? (
					<div className="absolute inset-0 flex items-center justify-center bg-[color:var(--cell-2)]/85">
						<span
							className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--surface-border)] border-t-[color:var(--accent-1)]"
							aria-label="Loading image"
						/>
					</div>
				) : null}

				{resolvedPageCount > 1 ? (
					<div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
						{activePageNumber}/{resolvedPageCount}
					</div>
				) : null}
			</div>

			{resolvedMediaItems.length > 1 ? (
				<div className="flex items-center justify-center gap-1.5 px-4">
					{resolvedMediaItems.map((_, index) => {
						const isActive = index === activeIndex;
						return (
								<button
									key={`post-${postId}-page-dot-${index + 1}`}
									type="button"
									onClick={() =>
										goToPageWithPrefetch(index, {
											movedForward: index > activeIndex,
										})
									}
									aria-label={`Go to image page ${index + 1}`}
									aria-current={isActive ? "true" : undefined}
								className={`rounded-full transition-all ${isActive ? "h-2.5 w-5" : "h-2.5 w-2.5"}`}
								style={
									isActive
										? { backgroundColor: "var(--txt-1)" }
										: {
												backgroundColor:
													"color-mix(in srgb, var(--txt-1) 28%, transparent)",
											}
								}
							/>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
