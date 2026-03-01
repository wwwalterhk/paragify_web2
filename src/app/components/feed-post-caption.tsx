"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type FeedPostCaptionProps = {
	handle: string;
	caption: string;
	postSlug: string | null;
};

type ParsedCaption = {
	content: string;
	hashtags: string[];
};

const HASHTAG_MATCH_PATTERN = /#[\p{L}\p{N}\p{M}_]+/gu;

function parseCaption(caption: string): ParsedCaption {
	const hashtags = caption.match(HASHTAG_MATCH_PATTERN) ?? [];
	const content = caption
		.replace(HASHTAG_MATCH_PATTERN, "")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n[ \t]+/g, "\n")
		.replace(/[ \t]{2,}/g, " ")
		.trim();
	return {
		content,
		hashtags,
	};
}

export function FeedPostCaption({ handle, caption, postSlug }: FeedPostCaptionProps) {
	const pathname = usePathname();
	const [expanded, setExpanded] = useState(false);
	const [showToggle, setShowToggle] = useState(false);
	const contentRef = useRef<HTMLParagraphElement | null>(null);

	const { content, hashtags } = useMemo(() => parseCaption(caption), [caption]);
	const postHref = postSlug ? `/post/zh/${encodeURIComponent(postSlug)}` : null;

	useEffect(() => {
		const contentElement = contentRef.current;
		if (!contentElement || expanded) {
			return;
		}

		const evaluateOverflow = () => {
			setShowToggle(contentElement.scrollHeight - contentElement.clientHeight > 1);
		};

		evaluateOverflow();

		const observer = new ResizeObserver(evaluateOverflow);
		observer.observe(contentElement);

		return () => {
			observer.disconnect();
		};
	}, [content, expanded]);

	return (
		<div className="space-y-1">
			<p
				ref={contentRef}
				className={`whitespace-pre-line break-words text-sm leading-6 text-[color:var(--txt-2)] ${expanded ? "" : "line-clamp-2"}`}
			>
				<span className="mr-1 font-semibold text-[color:var(--txt-1)]">{handle}</span>
				{content}
			</p>

			{showToggle ? (
				<button
					type="button"
					onClick={() => setExpanded((value) => !value)}
					className="text-xs font-semibold uppercase tracking-wide text-[color:var(--txt-3)] hover:text-[color:var(--txt-1)]"
				>
					{expanded ? "less" : "more"}
				</button>
			) : null}

			{hashtags.length > 0 ? (
				<p className="flex flex-wrap gap-x-1 gap-y-0.5 text-sm leading-6">
					{hashtags.map((hashtag, index) => (
						<Link
							key={`${hashtag}-${index}`}
							href={`${pathname || "/"}?tag=${encodeURIComponent(hashtag.replace(/^#/, ""))}`}
							className="font-semibold text-[color:var(--accent-2)] hover:underline"
						>
							{hashtag}
						</Link>
					))}
				</p>
			) : null}

			{postHref ? (
				<Link
					href={postHref}
					className="inline-flex w-fit items-center rounded-md border border-[color:var(--surface-border)] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--txt-2)] hover:bg-[color:var(--cell-2)]"
				>
					Open
				</Link>
			) : null}
		</div>
	);
}
