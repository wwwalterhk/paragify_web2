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
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
							{avatarInitial}
						</div>
					)}

					<div className="min-w-0 flex-1">
						<div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{displayName}</div>
						<div className="whitespace-pre-wrap break-words text-sm text-zinc-800 dark:text-zinc-200">
							{comment.body}
						</div>
						<div className="mt-1 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
							<span>{comment.created_at ? new Date(comment.created_at).toLocaleString() : ""}</span>
							<button
								type="button"
								onClick={() => setReplyTo(comment.comment_id)}
								className="font-semibold text-sky-700 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
							>
								{t.reply}
							</button>
						</div>
					</div>
				</div>

				{depth < 1
					? childComments.map((child) => (
							<div key={child.comment_id} className="ml-10 border-l border-zinc-200 pl-4 dark:border-zinc-800">
								{renderComment(child, depth + 1)}
							</div>
					  ))
					: null}
			</div>
		);
	}

	return (
		<section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
			<h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.title}</h2>

			<div className="space-y-4">
				{topLevelComments.length > 0 ? (
					topLevelComments.map((comment) => renderComment(comment))
				) : (
					<div className="text-sm text-zinc-500 dark:text-zinc-400">{t.empty}</div>
				)}
			</div>

			<div className="space-y-2">
				{replyTo ? (
					<div className="flex items-center justify-between rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
						<span>
							{t.replyingTo} #{replyTo}
						</span>
						<button
							type="button"
							onClick={() => setReplyTo(null)}
							className="font-semibold text-sky-700 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
						>
							{t.cancel}
						</button>
					</div>
				) : null}

				<textarea
					value={text}
					onChange={(event) => setText(event.target.value)}
					placeholder={t.placeholder}
					className="w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-sky-500 dark:focus:ring-sky-800/50"
					rows={3}
				/>

				<div className="flex items-center justify-between">
					{error ? <span className="text-xs text-rose-500">{error}</span> : <span />}
					<button
						type="button"
						onClick={handleSubmit}
						disabled={submitting || !text.trim()}
						className="inline-flex items-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
					>
						{t.send}
					</button>
				</div>
			</div>
		</section>
	);
}
