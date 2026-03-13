"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type PostDetailCaptionProps = {
	caption: string;
	moreLabel: string;
	lessLabel: string;
	linkClassName: string;
	linkStyle: CSSProperties;
};

const HASHTAG_MATCH_PATTERN = /#[\p{L}\p{N}\p{M}_]+/gu;

function splitCaption(caption: string): { headingLine: string; remainder: string } {
	const normalized = caption.replace(/\r\n/g, "\n").trim();
	if (!normalized) {
		return { headingLine: "", remainder: "" };
	}

	const firstNewlineIndex = normalized.indexOf("\n");
	if (firstNewlineIndex === -1) {
		return { headingLine: normalized, remainder: "" };
	}

	const headingLine = normalized.slice(0, firstNewlineIndex).trimEnd();
	const remainder = normalized
		.slice(firstNewlineIndex + 1)
		.replace(/^\n+/, "")
		.trimEnd();

	return { headingLine, remainder };
}

function renderCaptionWithHashtags(
	caption: string,
	keyPrefix: string,
	linkClassName: string,
	linkStyle: CSSProperties,
): ReactNode {
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
				key={`${keyPrefix}-hashtag-${index}-${startIndex}`}
				href={`/?tag=${encodeURIComponent(hashtag.replace(/^#/, ""))}`}
				className={linkClassName}
				style={linkStyle}
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

export function PostDetailCaption({
	caption,
	moreLabel,
	lessLabel,
	linkClassName,
	linkStyle,
}: PostDetailCaptionProps) {
	const [expanded, setExpanded] = useState(false);
	const { headingLine, remainder } = useMemo(() => splitCaption(caption), [caption]);
	const hasMoreContent = remainder.length > 0;
	const visibleCaption = expanded || !hasMoreContent ? caption : headingLine;

	return (
		<div className="space-y-1.5 text-[15px] leading-7 text-[color:var(--txt-2)]">
			<p className="whitespace-pre-line break-words">
				{renderCaptionWithHashtags(visibleCaption, "post-caption", linkClassName, linkStyle)}
			</p>
			{hasMoreContent ? (
				<button
					type="button"
					onClick={() => setExpanded((value) => !value)}
					className="text-xs font-semibold uppercase tracking-wide text-[color:var(--txt-3)] hover:text-[color:var(--txt-1)]"
				>
					{expanded ? lessLabel : moreLabel}
				</button>
			) : null}
		</div>
	);
}
