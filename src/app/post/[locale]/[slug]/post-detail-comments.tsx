"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type Locale = "en" | "zh";

export type PostComment = {
	comment_id: number;
	post_id: number;
	user_pk: number;
	body: string;
	reply_to_comment_id: number | null;
	created_at: string | null;
	user_name: string | null;
	user_handle: string | null;
	user_avatar: string | null;
};

type PostDetailCommentsProps = {
	locale: Locale;
	postId: number;
	initialComments: PostComment[];
};

const copy: Record<
	Locale,
	{
		title: string;
		empty: string;
		placeholder: string;
		send: string;
		reply: string;
		replyingTo: string;
		cancel: string;
		failed: string;
	}
> = {
	en: {
		title: "Comments",
		empty: "No comments yet.",
		placeholder: "Add a comment...",
		send: "Post",
		reply: "Reply",
		replyingTo: "Replying to",
		cancel: "Cancel",
		failed: "Failed to post comment.",
	},
	zh: {
		title: "留言",
		empty: "暫時沒有留言。",
		placeholder: "留下留言...",
		send: "發布",
		reply: "回覆",
		replyingTo: "回覆",
		cancel: "取消",
		failed: "發佈留言失敗。",
	},
};

export function PostDetailComments({ locale, postId, initialComments }: PostDetailCommentsProps) {
	const [comments, setComments] = useState<PostComment[]>(initialComments);
	const [text, setText] = useState("");
	const [replyTo, setReplyTo] = useState<number | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const t = useMemo(() => copy[locale], [locale]);

	const topLevelComments = comments.filter((comment) => !comment.reply_to_comment_id);

	async function handleSubmit() {
		const trimmedText = text.trim();
		if (!trimmedText || submitting) {
			return;
		}

		setSubmitting(true);
		setError(null);

		try {
			const response = await fetch("/api/posts/comments", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ postId, text: trimmedText, replyTo }),
			});
			const data = (await response.json().catch(() => null)) as
				| { ok?: boolean; comment?: PostComment; message?: string }
				| null;

			if (!response.ok || !data?.ok || !data.comment) {
				throw new Error(data?.message || t.failed);
			}

			setComments((current) => [...current, data.comment as PostComment]);
			setText("");
			setReplyTo(null);
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : t.failed);
		} finally {
			setSubmitting(false);
		}
	}

	function renderComment(comment: PostComment, depth = 0) {
		const childComments = comments.filter((child) => child.reply_to_comment_id === comment.comment_id);
		const displayName = comment.user_name || comment.user_handle || "User";
		const avatarInitial = displayName.slice(0, 1).toUpperCase();

		return (
			<div key={comment.comment_id} className="space-y-2">
				<div className="flex items-start gap-3">
					{comment.user_avatar ? (
						<Image
							src={comment.user_avatar}
							alt={displayName}
							width={32}
							height={32}
							className="h-8 w-8 rounded-full object-cover"
							unoptimized
						/>
					) : (
						<div
							className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold"
							style={{ backgroundColor: "var(--cell-3)", color: "var(--txt-2)" }}
						>
							{avatarInitial}
						</div>
					)}

					<div className="min-w-0 flex-1">
						<div className="text-sm font-semibold text-[color:var(--txt-1)]">{displayName}</div>
						<div className="whitespace-pre-wrap break-words text-sm text-[color:var(--txt-2)]">
							{comment.body}
						</div>
						<div className="mt-1 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-[color:var(--txt-3)]">
							<span>{comment.created_at ? new Date(comment.created_at).toLocaleString() : ""}</span>
							<button
								type="button"
								onClick={() => setReplyTo(comment.comment_id)}
								className="font-semibold transition-opacity hover:opacity-85"
								style={{ color: "var(--accent-2)" }}
							>
								{t.reply}
							</button>
						</div>
					</div>
				</div>

				{depth < 1
					? childComments.map((child) => (
							<div key={child.comment_id} className="ml-10 border-l pl-4" style={{ borderColor: "var(--surface-border)" }}>
								{renderComment(child, depth + 1)}
							</div>
					  ))
					: null}
			</div>
		);
	}

	return (
		<section
			className="space-y-4 rounded-2xl border p-4"
			style={{
				borderColor: "var(--surface-border)",
				backgroundColor: "var(--surface)",
				boxShadow: "var(--shadow-elev-1)",
			}}
		>
			<h2 className="text-sm font-semibold text-[color:var(--txt-1)]">{t.title}</h2>

			<div className="space-y-4">
				{topLevelComments.length > 0 ? (
					topLevelComments.map((comment) => renderComment(comment))
				) : (
					<div className="text-sm text-[color:var(--txt-3)]">{t.empty}</div>
				)}
			</div>

			<div className="space-y-2">
				{replyTo ? (
					<div
						className="flex items-center justify-between rounded-xl px-3 py-2 text-xs"
						style={{
							backgroundColor: "color-mix(in srgb, var(--cell-2) 80%, var(--surface) 20%)",
							color: "var(--txt-2)",
						}}
					>
						<span>
							{t.replyingTo} #{replyTo}
						</span>
						<button
							type="button"
							onClick={() => setReplyTo(null)}
							className="font-semibold transition-opacity hover:opacity-85"
							style={{ color: "var(--accent-2)" }}
						>
							{t.cancel}
						</button>
					</div>
				) : null}

				<textarea
					value={text}
					onChange={(event) => setText(event.target.value)}
					placeholder={t.placeholder}
					className="w-full rounded-2xl border px-3 py-2 text-sm text-[color:var(--txt-1)] outline-none transition-[border-color,box-shadow] focus:border-[color:var(--accent-2)]"
					style={{ borderColor: "var(--surface-border)", backgroundColor: "var(--surface)" }}
					rows={3}
				/>

				<div className="flex items-center justify-between">
					{error ? <span className="text-xs text-rose-500">{error}</span> : <span />}
					<button
						type="button"
						onClick={handleSubmit}
						disabled={submitting || !text.trim()}
						className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
						style={{ backgroundColor: "var(--txt-1)", color: "var(--bg-1)" }}
					>
						{t.send}
					</button>
				</div>
			</div>
		</section>
	);
}
