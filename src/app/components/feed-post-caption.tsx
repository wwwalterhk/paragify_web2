"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

type FeedPostCaptionProps = {
	handle: string;
	caption: string;
};

const HASHTAG_MATCH_PATTERN = /#[\p{L}\p{N}\p{M}_]+/gu;
const HASHTAG_ONLY_LINE_PATTERN = /^(?:#[\p{L}\p{N}\p{M}_]+(?:\s+|$))+$/u;
const INLINE_HASHTAG_CLASSNAME =
	"font-semibold text-[color:var(--accent-2)] underline-offset-2 transition-opacity hover:opacity-85 hover:underline";
const INLINE_HASHTAG_STYLE = {
	color: "var(--accent-2)",
};

function removeTrailingHashtagSummaryLines(value: string): string {
	const lines = value.split(/\n/);
	let end = lines.length - 1;

	while (end >= 0 && lines[end].trim().length === 0) {
		end -= 1;
	}
	if (end < 0) {
		return value;
	}

	let scan = end;
	while (scan >= 0) {
		const currentLine = lines[scan].trim();
		if (currentLine.length === 0 || HASHTAG_ONLY_LINE_PATTERN.test(currentLine)) {
			scan -= 1;
			continue;
		}
		break;
	}

	// Remove only trailing hashtag blocks when there is body content before them.
	if (scan >= 0 && scan < end) {
		return lines
			.slice(0, scan + 1)
			.join("\n")
			.trimEnd();
	}

	return value;
}

function normalizeCaption(caption: string): string {
	const normalized = caption
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n[ \t]+/g, "\n")
		.replace(/[ \t]{2,}/g, " ")
		.trim();

	return removeTrailingHashtagSummaryLines(normalized);
}

function renderCaptionWithHashtags(caption: string, pathname: string | null): ReactNode {
	const nodes: ReactNode[] = [];
	const hashtagMatches = Array.from(caption.matchAll(HASHTAG_MATCH_PATTERN));
	let cursor = 0;

	for (let index = 0; index < hashtagMatches.length; index += 1) {
		const match = hashtagMatches[index];
		const hashtag = match[0];
		const startIndex = match.index ?? 0;

		if (startIndex > cursor) {
			nodes.push(caption.slice(cursor, startIndex));
		}

		nodes.push(
			<Link
				key={`${hashtag}-${index}-${startIndex}`}
				href={`${pathname || "/"}?tag=${encodeURIComponent(hashtag.replace(/^#/, ""))}`}
				className={INLINE_HASHTAG_CLASSNAME}
				style={INLINE_HASHTAG_STYLE}
			>
				{hashtag}
			</Link>,
		);

		cursor = startIndex + hashtag.length;
	}

	if (cursor < caption.length) {
		nodes.push(caption.slice(cursor));
	}

	return nodes.length > 0 ? nodes : caption;
}

export function FeedPostCaption({ handle, caption }: FeedPostCaptionProps) {
	const pathname = usePathname();
	const [expanded, setExpanded] = useState(false);
	const [showToggle, setShowToggle] = useState(false);
	const contentRef = useRef<HTMLParagraphElement | null>(null);

	const content = useMemo(() => normalizeCaption(caption), [caption]);

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
				{renderCaptionWithHashtags(content, pathname)}
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
		</div>
	);
}
