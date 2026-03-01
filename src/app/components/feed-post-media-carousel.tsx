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

export function FeedPostMediaCarousel({
	postId,
	postTitle,
	pageScale,
	pageCount,
	mediaItems,
}: FeedPostMediaCarouselProps) {
	const [activeIndex, setActiveIndex] = useState(0);
	const swipeStateRef = useRef<{
		pointerId: number;
		startX: number;
		startY: number;
		lastX: number;
		lastY: number;
	} | null>(null);

	useEffect(() => {
		setActiveIndex((current) => {
			if (mediaItems.length <= 1) {
				return 0;
			}
			return Math.min(current, mediaItems.length - 1);
		});
	}, [mediaItems.length]);

	const resolvedMediaItems = mediaItems.length > 0 ? mediaItems : [EMPTY_MEDIA_ITEM];
	const resolvedPageCount = Math.max(pageCount, resolvedMediaItems.length);
	const activeMediaItem = resolvedMediaItems[Math.min(activeIndex, resolvedMediaItems.length - 1)] ?? EMPTY_MEDIA_ITEM;
	const activePageNumber = Math.max(1, activeIndex + 1);
	const pageScaleDimensions = FEED_PAGE_SCALE_DIMENSIONS[pageScale];
	const swipeEnabled = resolvedMediaItems.length > 1;

	function goToPreviousPage() {
		setActiveIndex((current) => Math.max(0, current - 1));
	}

	function goToNextPage() {
		setActiveIndex((current) => Math.min(resolvedMediaItems.length - 1, current + 1));
	}

	function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
		if (!swipeEnabled) {
			return;
		}
		if (event.pointerType === "mouse" && event.button !== 0) {
			return;
		}

		swipeStateRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			lastX: event.clientX,
			lastY: event.clientY,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
	}

	function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
		const swipeState = swipeStateRef.current;
		if (!swipeState || swipeState.pointerId !== event.pointerId) {
			return;
		}

		swipeStateRef.current = {
			...swipeState,
			lastX: event.clientX,
			lastY: event.clientY,
		};

		const deltaX = event.clientX - swipeState.startX;
		const deltaY = event.clientY - swipeState.startY;
		if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_DIRECTION_LOCK_PX) {
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
		if (Math.abs(deltaX) >= SWIPE_MIN_DISTANCE_PX && Math.abs(deltaX) > Math.abs(deltaY)) {
			if (deltaX < 0) {
				goToNextPage();
			} else {
				goToPreviousPage();
			}
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
		swipeStateRef.current = null;
	}

	return (
		<div className="space-y-2">
			<div
				className="relative w-full overflow-hidden bg-[color:var(--cell-2)]"
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerEnd}
				onPointerCancel={handlePointerCancel}
				style={{
					aspectRatio: `${pageScaleDimensions.width} / ${pageScaleDimensions.height}`,
					touchAction: swipeEnabled ? "pan-y" : "auto",
					cursor: swipeEnabled ? "grab" : "default",
				}}
			>
				{activeMediaItem.source_url ? (
					activeMediaItem.media_type === "video" ? (
						<video
							className="h-full w-full object-cover"
							src={activeMediaItem.source_url}
							controls
							playsInline
							preload="metadata"
						/>
					) : activeMediaItem.transformed_image_url ? (
						<Image
							src={activeMediaItem.transformed_image_url}
							alt={postTitle ? `${postTitle} page ${activePageNumber}` : `Post ${postId} page ${activePageNumber}`}
							fill
							className="object-cover"
							sizes="(max-width: 820px) 100vw, 640px"
							unoptimized
						/>
					) : (
						<div className="flex h-full items-center justify-center text-sm text-[color:var(--txt-3)]">
							No cover media
						</div>
					)
				) : (
					<div className="flex h-full items-center justify-center text-sm text-[color:var(--txt-3)]">
						No cover media
					</div>
				)}

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
								onClick={() => setActiveIndex(index)}
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
