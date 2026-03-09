"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type PreparePostRow = {
	post_id: number;
	user_pk: number;
	post_slug: string | null;
	prepare_url: string | null;
	prepare_status: string | null;
	title: string | null;
	created_at: string | null;
	updated_at: string | null;
	author_name: string | null;
	author_handle: string | null;
	author_site: string | null;
};

type PreparePaging = { 
	page: number;
	limit: number;
	total: number;
	total_pages: number;
	has_more: boolean;
	next_page: number | null;
};

type LoadPreparePostsResponse = {
	ok?: boolean;
	message?: string;
	posts?: PreparePostRow[];
	paging?: PreparePaging;
};

type WritingProfileUser = {
	user_pk: number;
	user_id: string | null;
	site: string | null;
	name: string | null;
	avatar_url: string | null;
	writing_style: string;
	writing_locale: string;
};

type LoadWritingProfilesResponse = {
	ok?: boolean;
	message?: string;
	users?: WritingProfileUser[];
	paging?: PreparePaging;
};

type PatchPrepareResponse = {
	ok?: boolean;
	message?: string;
	post_id?: number;
	post_slug?: string | null;
	prepare_status?: string | null;
	visibility?: string | null;
};

type CreatePrepareResponse = {
	ok?: boolean;
	message?: string;
	post_id?: number;
};

type FlashMessage = {
	type: "ok" | "error";
	text: string;
	postId?: number | null;
};

const PREPARE_STATUS_OPTIONS = ["fetch_url", "fetch_url_done", "fetch_url_batch_done", "fetch_plan_done", "fail"] as const;
type PrepareStatusOption = (typeof PREPARE_STATUS_OPTIONS)[number];

function formatDate(value: string | null) {
	if (!value) return "—";
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-HK", { hour12: false });
}

function statusBadgeClass(status: string | null): string {
	switch (status) {
		case "fetch_url":
			return "border-amber-200 bg-amber-50 text-amber-700";
		case "fetch_url_done":
			return "border-sky-200 bg-sky-50 text-sky-700";
		case "fetch_url_batch_done":
			return "border-cyan-200 bg-cyan-50 text-cyan-700";
		case "fetch_plan_done":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		case "fail":
			return "border-rose-200 bg-rose-50 text-rose-700";
		default:
			return "border-slate-200 bg-slate-50 text-slate-700";
	}
}

function statusButtonClass(status: PrepareStatusOption, isCurrent: boolean, isDisabled: boolean): string {
	const base = "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors";
	const active = isCurrent ? " ring-2 ring-[color:var(--txt-1)] ring-offset-1 ring-offset-[color:var(--cell-1)]" : "";
	const disabled = isDisabled ? " cursor-not-allowed opacity-60" : "";

	switch (status) {
		case "fetch_url":
			return `${base} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100${active}${disabled}`;
		case "fetch_url_done":
			return `${base} border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100${active}${disabled}`;
		case "fetch_url_batch_done":
			return `${base} border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100${active}${disabled}`;
		case "fetch_plan_done":
			return `${base} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100${active}${disabled}`;
		case "fail":
			return `${base} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100${active}${disabled}`;
		default:
			return `${base} border-[color:var(--surface-border)] bg-[color:var(--cell-2)] text-[color:var(--txt-1)] hover:bg-[color:var(--bg-1)]${active}${disabled}`;
	}
}

function extractPostUidFromUrl(input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed) return null;

	let url: URL | null = null;
	try {
		url = new URL(trimmed);
	} catch {
		try {
			url = new URL(trimmed, "https://paragify.com");
		} catch {
			url = null;
		}
	}
	if (!url) return null;

	const segments = url.pathname
		.split("/")
		.map((s) => s.trim())
		.filter(Boolean);
	if (!segments.length) return null;

	const postUid = decodeURIComponent(segments[segments.length - 1] || "").trim();
	return postUid || null;
}

function mergeUniquePosts(existing: PreparePostRow[], incoming: PreparePostRow[]) {
	const byId = new Map<number, PreparePostRow>();
	for (const post of existing) byId.set(post.post_id, post);
	for (const post of incoming) byId.set(post.post_id, post);
	return Array.from(byId.values()).sort((left, right) => right.post_id - left.post_id);
}

function formatUserSelectorLabel(user: WritingProfileUser): string {
	const displayName = user.name?.trim() || "Unnamed";
	const userIdentity = user.user_id?.trim() ? `@${user.user_id.trim()}` : `#${user.user_pk}`;
	return `${displayName} (${userIdentity}) • ${user.writing_locale} • ${user.writing_style}`;
}

export function PostPreparationAdminClient() {
	const [posts, setPosts] = useState<PreparePostRow[]>([]);
	const [paging, setPaging] = useState<PreparePaging>({
		page: 1,
		limit: 50,
		total: 0,
		total_pages: 0,
		has_more: false,
		next_page: null,
	});
	const [loadingPosts, setLoadingPosts] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [creating, setCreating] = useState(false);
	const [settingPrivate, setSettingPrivate] = useState(false);
	const [updatingStatusPostId, setUpdatingStatusPostId] = useState<number | null>(null);
	const [message, setMessage] = useState<FlashMessage | null>(null);
	const [createUserPk, setCreateUserPk] = useState("");
	const [userOptions, setUserOptions] = useState<WritingProfileUser[]>([]);
	const [loadingUserOptions, setLoadingUserOptions] = useState(false);
	const [userOptionsError, setUserOptionsError] = useState<string | null>(null);
	const [createPrepareUrl, setCreatePrepareUrl] = useState("");
	const [privatePostUrl, setPrivatePostUrl] = useState("");

	const loadPosts = useCallback(async (page: number, append: boolean) => {
		if (append) {
			setLoadingMore(true);
		} else {
			setLoadingPosts(true);
		}
		try {
			const response = await fetch(`/api/admin/posts/prepare?page=${page}&limit=50&include_done=1`, {
				method: "GET",
				cache: "no-store",
			});
			const data = (await response.json().catch(() => null)) as LoadPreparePostsResponse | null;
			if (!response.ok || !data?.ok) {
				throw new Error(data?.message ?? "Failed to load prepare posts.");
			}
			const nextPosts = data.posts ?? [];
			setPosts((previous) => (append ? mergeUniquePosts(previous, nextPosts) : nextPosts));
			setPaging(
				data.paging ?? {
					page,
					limit: 50,
					total: nextPosts.length,
					total_pages: 1,
					has_more: false,
					next_page: null,
				},
			);
		} catch (error) {
			setMessage({
				type: "error",
				text: error instanceof Error ? error.message : "Failed to load prepare posts.",
			});
		} finally {
			setLoadingPosts(false);
			setLoadingMore(false);
		}
	}, []);

	const loadUserOptions = useCallback(async () => {
		setLoadingUserOptions(true);
		setUserOptionsError(null);
		try {
			const allUsers: WritingProfileUser[] = [];
			let page = 1;
			const limit = 200;

			for (let guard = 0; guard < 20; guard += 1) {
				const response = await fetch(`/api/admin/users/writing-profiles?page=${page}&limit=${limit}`, {
					method: "GET",
					cache: "no-store",
				});
				const data = (await response.json().catch(() => null)) as LoadWritingProfilesResponse | null;
				if (!response.ok || !data?.ok) {
					throw new Error(data?.message ?? "Failed to load users.");
				}

				allUsers.push(...(data.users ?? []));
				const nextPage = data.paging?.next_page;
				if (!data.paging?.has_more || !nextPage) {
					break;
				}
				page = nextPage;
			}

			const deduped = Array.from(new Map(allUsers.map((user) => [user.user_pk, user])).values()).sort((left, right) => {
				const leftName = (left.name || left.user_id || "").trim().toLowerCase();
				const rightName = (right.name || right.user_id || "").trim().toLowerCase();
				if (leftName < rightName) return -1;
				if (leftName > rightName) return 1;
				return right.user_pk - left.user_pk;
			});

			setUserOptions(deduped);
			setCreateUserPk((current) => {
				if (current && deduped.some((user) => String(user.user_pk) === current)) return current;
				return deduped[0] ? String(deduped[0].user_pk) : "";
			});
		} catch (error) {
			setUserOptions([]);
			setCreateUserPk("");
			setUserOptionsError(error instanceof Error ? error.message : "Failed to load users.");
		} finally {
			setLoadingUserOptions(false);
		}
	}, []);

	useEffect(() => {
		void loadPosts(1, false);
	}, [loadPosts]);

	useEffect(() => {
		void loadUserOptions();
	}, [loadUserOptions]);

	const hasPosts = posts.length > 0;
	const nextPage = paging.next_page;
	const canLoadMore = Boolean(nextPage && paging.has_more && !loadingPosts && !loadingMore);
	const totalLabel = useMemo(() => `${paging.total || posts.length} items`, [paging.total, posts.length]);
	const selectedCreateUser = useMemo(
		() => userOptions.find((user) => String(user.user_pk) === createUserPk) ?? null,
		[userOptions, createUserPk],
	);

	async function handleCreatePreparePost(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setMessage(null);

		const userPk = Number(createUserPk);
		if (!Number.isFinite(userPk) || userPk <= 0) {
			setMessage({ type: "error", text: "Please select a user." });
			return;
		}
		if (!createPrepareUrl.trim()) {
			setMessage({ type: "error", text: "prepare_url is required" });
			return;
		}

		setCreating(true);
		try {
			const response = await fetch("/api/admin/posts/prepare", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					user_pk: Math.trunc(userPk),
					prepare_url: createPrepareUrl.trim(),
				}),
			});
			const data = (await response.json().catch(() => null)) as CreatePrepareResponse | null;
			if (!response.ok || !data?.ok) {
				throw new Error(data?.message ?? "Failed to create prepare post.");
			}

			setCreatePrepareUrl("");
			setMessage({
				type: "ok",
				text: "prepare post created",
				postId: data.post_id ?? null,
			});
			await loadPosts(1, false);
		} catch (error) {
			setMessage({
				type: "error",
				text: error instanceof Error ? error.message : "Failed to create prepare post.",
			});
		} finally {
			setCreating(false);
		}
	}

	async function handleSetPrivateByUrl(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setMessage(null);

		const postUrl = privatePostUrl.trim();
		if (!postUrl) {
			setMessage({ type: "error", text: "post_url is required" });
			return;
		}
		if (!extractPostUidFromUrl(postUrl)) {
			setMessage({ type: "error", text: "invalid post url" });
			return;
		}
		if (!window.confirm("Set this post visibility to private?")) {
			return;
		}

		setSettingPrivate(true);
		try {
			const response = await fetch("/api/admin/posts/prepare", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ post_url: postUrl }),
			});
			const data = (await response.json().catch(() => null)) as PatchPrepareResponse | null;
			if (!response.ok || !data?.ok) {
				throw new Error(data?.message ?? "Failed to update visibility.");
			}

			const changedPostId = data.post_id ?? null;
			if (changedPostId) {
				setPosts((previous) => previous.filter((post) => post.post_id !== changedPostId));
				setPaging((previous) => ({
					...previous,
					total: Math.max(0, previous.total - 1),
				}));
			}
			setPrivatePostUrl("");
			setMessage({
				type: "ok",
				text: "post visibility set to private",
				postId: changedPostId,
			});
		} catch (error) {
			setMessage({
				type: "error",
				text: error instanceof Error ? error.message : "Failed to update visibility.",
			});
		} finally {
			setSettingPrivate(false);
		}
	}

	async function handleUpdatePrepareStatus(postId: number, status: PrepareStatusOption) {
		if (!window.confirm(`Set post #${postId} prepare_status to "${status}"?`)) {
			return;
		}

		setMessage(null);
		setUpdatingStatusPostId(postId);
		try {
			const response = await fetch("/api/admin/posts/prepare", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					post_id: postId,
					prepare_status: status,
				}),
			});
			const data = (await response.json().catch(() => null)) as PatchPrepareResponse | null;
			if (!response.ok || !data?.ok) {
				throw new Error(data?.message ?? "Failed to update prepare_status.");
			}

			setPosts((previous) =>
				previous.map((post) =>
					post.post_id === postId
						? {
								...post,
								prepare_status: status,
								updated_at: new Date().toISOString(),
							}
						: post,
				),
			);
			setMessage({
				type: "ok",
				text: `prepare_status set to ${status}`,
				postId,
			});
		} catch (error) {
			setMessage({
				type: "error",
				text: error instanceof Error ? error.message : "Failed to update prepare_status.",
				postId,
			});
		} finally {
			setUpdatingStatusPostId(null);
		}
	}

	async function handleLoadMore() {
		if (!canLoadMore || !nextPage) return;
		await loadPosts(nextPage, true);
	}

	async function handleRefresh() {
		setMessage(null);
		await loadPosts(1, false);
	}

	return (
		<main className="min-h-screen bg-[color:var(--bg-1)] text-[color:var(--txt-1)]">
			<div className="mx-auto max-w-6xl px-6 py-10 sm:px-10 lg:px-16">
				<header className="mb-6 space-y-2">
					<div className="text-xs uppercase tracking-[0.26em] text-[color:var(--txt-3)]">Admin</div>
					<h1 className="text-3xl font-semibold tracking-tight text-[color:var(--txt-1)]">Post preparation</h1>
					<p className="text-sm text-[color:var(--txt-2)]">Create prepare posts and monitor the prepare queue.</p>
				</header>

				<form
					onSubmit={handleCreatePreparePost}
					className="mb-6 space-y-4 rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-5 shadow-sm"
				>
					<div className="grid gap-4 md:grid-cols-[minmax(420px,1.6fr)_minmax(260px,1fr)]">
						<label className="space-y-1">
							<span className="text-xs uppercase tracking-[0.2em] text-[color:var(--txt-3)]">User</span>
							<select
								name="user_pk"
								required
								value={createUserPk}
								onChange={(event) => setCreateUserPk(event.target.value)}
								disabled={loadingUserOptions || !userOptions.length}
								className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--bg-1)] px-3 py-2 text-sm text-[color:var(--txt-1)] outline-none focus:border-[color:var(--txt-2)]"
							>
								<option value="" disabled>
									{loadingUserOptions ? "Loading users..." : userOptions.length ? "Select a user" : "No users available"}
								</option>
								{userOptions.map((user) => (
									<option key={user.user_pk} value={String(user.user_pk)}>
										{formatUserSelectorLabel(user)}
									</option>
								))}
							</select>
							{selectedCreateUser ? (
								<div className="rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--cell-2)] px-2.5 py-2 text-xs text-[color:var(--txt-2)]">
									<div>
										Writing style:{" "}
										<span className="whitespace-pre-line font-semibold text-[color:var(--txt-1)]">{selectedCreateUser.writing_style}</span>
									</div>
									<div>
										Writing locale: <span className="font-semibold text-[color:var(--txt-1)]">{selectedCreateUser.writing_locale}</span>
									</div>
								</div>
							) : null}
							{userOptionsError ? (
								<div className="flex items-center gap-2 text-xs text-rose-600">
									<span>{userOptionsError}</span>
									<button
										type="button"
										onClick={() => void loadUserOptions()}
										className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 hover:bg-rose-100"
									>
										Retry
									</button>
								</div>
							) : null}
						</label>

						<label className="space-y-1">
							<span className="text-xs uppercase tracking-[0.2em] text-[color:var(--txt-3)]">Prepare URL</span>
							<input
								name="prepare_url"
								type="url"
								required
								value={createPrepareUrl}
								onChange={(event) => setCreatePrepareUrl(event.target.value)}
								className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--bg-1)] px-3 py-2 text-sm text-[color:var(--txt-1)] outline-none focus:border-[color:var(--txt-2)]"
								placeholder="https://example.com/post"
							/>
						</label>
					</div>

					<div className="flex items-center gap-3">
						<button
							type="submit"
							disabled={creating}
							className="rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--cell-2)] px-4 py-2 text-sm font-semibold text-[color:var(--txt-1)] hover:bg-[color:var(--bg-1)] disabled:cursor-not-allowed disabled:opacity-60"
						>
							{creating ? "Creating..." : "Create prepare post"}
						</button>
						<div className="text-xs text-[color:var(--txt-3)]">
							Saves: prepare_url, user_pk, prepare_status=fetch_url, visibility=prepare
						</div>
					</div>
				</form>

				<form
					onSubmit={handleSetPrivateByUrl}
					className="mb-6 space-y-4 rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-5 shadow-sm"
				>
					<div className="space-y-1">
						<div className="text-xs uppercase tracking-[0.2em] text-[color:var(--txt-3)]">Set Visibility To Private</div>
						<p className="text-sm text-[color:var(--txt-2)]">Input post URL. The system resolves the post UID from the last URL segment.</p>
					</div>

					<label className="space-y-1">
						<span className="text-xs uppercase tracking-[0.2em] text-[color:var(--txt-3)]">Post URL</span>
						<input
							name="post_url"
							type="url"
							required
							value={privatePostUrl}
							onChange={(event) => setPrivatePostUrl(event.target.value)}
							className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--bg-1)] px-3 py-2 text-sm text-[color:var(--txt-1)] outline-none focus:border-[color:var(--txt-2)]"
							placeholder="https://paragify.com/post/zh/4chGiwaY29"
						/>
					</label>

					<div className="flex items-center gap-3">
						<button
							type="submit"
							disabled={settingPrivate}
							className="rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--cell-2)] px-4 py-2 text-sm font-semibold text-[color:var(--txt-1)] hover:bg-[color:var(--bg-1)] disabled:cursor-not-allowed disabled:opacity-60"
						>
							{settingPrivate ? "Updating..." : "Set private"}
						</button>
						<div className="text-xs text-[color:var(--txt-3)]">Example: https://paragify.com/post/zh/4chGiwaY29</div>
					</div>
				</form>

				<div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-4 py-3">
					<div className="text-sm text-[color:var(--txt-2)]">
						Queue: <span className="font-semibold text-[color:var(--txt-1)]">{totalLabel}</span>
					</div>
					<button
						type="button"
						onClick={() => void handleRefresh()}
						disabled={loadingPosts}
						className="rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--cell-2)] px-3 py-1.5 text-xs font-semibold text-[color:var(--txt-1)] hover:bg-[color:var(--bg-1)] disabled:cursor-not-allowed disabled:opacity-60"
					>
						{loadingPosts ? "Refreshing..." : "Refresh"}
					</button>
				</div>

				{message ? (
					<div
						className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
							message.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
						}`}
					>
						{message.text}
						{message.postId ? ` (post_id: ${message.postId})` : ""}
					</div>
				) : null}

				<div className="space-y-3 md:hidden">
					{loadingPosts && !hasPosts ? (
						<div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-4 py-5 text-sm text-[color:var(--txt-3)]">
							Loading...
						</div>
					) : !hasPosts ? (
						<div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-4 py-5 text-sm text-[color:var(--txt-3)]">
							No prepare posts found.
						</div>
					) : (
						posts.map((post) => {
							const updatingThisPost = updatingStatusPostId === post.post_id;
							return (
								<div
									key={post.post_id}
									className="space-y-2 rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-4 text-sm"
								>
									<div className="flex items-center justify-between gap-3">
										<div className="text-xs uppercase tracking-[0.2em] text-[color:var(--txt-3)]">Post ID</div>
										<div className="font-semibold text-[color:var(--txt-1)]">{post.post_id}</div>
									</div>
									<div className="text-[color:var(--txt-2)]">
										User: #{post.user_pk} · {post.author_name || "—"}
										{post.author_handle ? ` (@${post.author_handle})` : ""}
									</div>
									<div className="text-[color:var(--txt-2)]">
										Status:{" "}
										<span
											className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(post.prepare_status)}`}
										>
											{post.prepare_status || "—"}
										</span>
									</div>
									<div className="text-[color:var(--txt-2)]">
										Title: <span className="font-semibold text-[color:var(--txt-1)]">{post.title || "—"}</span>
									</div>
									<div className="text-[color:var(--txt-2)]">Updated: {formatDate(post.updated_at)}</div>
									<div className="text-xs uppercase tracking-[0.2em] text-[color:var(--txt-3)]">Prepare URL</div>
									{post.prepare_url ? (
										<a
											href={post.prepare_url}
											target="_blank"
											rel="noreferrer"
											className="block break-all text-[color:var(--txt-1)] underline decoration-dotted underline-offset-2"
										>
											{post.prepare_url}
										</a>
									) : (
										<div className="text-[color:var(--txt-2)]">—</div>
									)}
									<div className="pt-1">
										<Link
											href={`/admin/post-preparation/${post.post_id}`}
											className="inline-flex cursor-pointer items-center rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--cell-2)] px-2.5 py-1.5 text-xs font-semibold text-[color:var(--txt-1)] hover:bg-[color:var(--bg-1)]"
										>
											View detail
										</Link>
									</div>
									<div className="pt-1">
										<div className="mb-1 text-xs uppercase tracking-[0.2em] text-[color:var(--txt-3)]">Set status</div>
										<div className="flex flex-wrap gap-2">
											{PREPARE_STATUS_OPTIONS.map((statusOption) => (
												<button
													key={`${post.post_id}-${statusOption}`}
													type="button"
													disabled={updatingThisPost}
													onClick={() => void handleUpdatePrepareStatus(post.post_id, statusOption)}
													className={statusButtonClass(statusOption, post.prepare_status === statusOption, updatingThisPost)}
												>
													{updatingThisPost ? "Updating..." : statusOption}
												</button>
											))}
										</div>
									</div>
								</div>
							);
						})
					)}
				</div>

				<div className="hidden rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] shadow-sm md:block">
					<table className="w-full table-fixed border-collapse text-sm">
						<thead className="bg-[color:var(--cell-2)] text-[color:var(--txt-2)]">
							<tr>
								<th className="w-24 border-b border-[color:var(--surface-border)] px-4 py-3 text-left font-semibold">Post ID</th>
								<th className="w-64 border-b border-[color:var(--surface-border)] px-4 py-3 text-left font-semibold">User</th>
								<th className="border-b border-[color:var(--surface-border)] px-4 py-3 text-left font-semibold">Prepare URL</th>
								<th className="w-32 border-b border-[color:var(--surface-border)] px-4 py-3 text-left font-semibold">Detail</th>
							</tr>
						</thead>
						<tbody>
							{loadingPosts && !hasPosts ? (
								<tr>
									<td className="px-4 py-5 text-[color:var(--txt-3)]" colSpan={4}>
										Loading...
									</td>
								</tr>
							) : !hasPosts ? (
								<tr>
									<td className="px-4 py-5 text-[color:var(--txt-3)]" colSpan={4}>
										No prepare posts found.
									</td>
								</tr>
							) : (
								posts.map((post) => {
									const updatingThisPost = updatingStatusPostId === post.post_id;
									return [
										<tr key={`post-${post.post_id}`} className="border-b border-[color:var(--surface-border)]">
											<td className="w-24 px-4 py-3 font-medium text-[color:var(--txt-1)]">{post.post_id}</td>
											<td
												className="w-64 px-4 py-3 text-[color:var(--txt-2)]"
												title={`#${post.user_pk} · ${post.author_name || "—"}${post.author_handle ? ` (@${post.author_handle})` : ""}`}
											>
												<span className="block truncate">
													#{post.user_pk} · {post.author_name || "—"}
													{post.author_handle ? ` (@${post.author_handle})` : ""}
												</span>
											</td>
											<td className="min-w-0 px-4 py-3 text-[color:var(--txt-2)]">
												<div className="mb-1 truncate font-semibold text-[color:var(--txt-1)]" title={post.title || ""}>
													{post.title || "—"}
												</div>
												{post.prepare_url ? (
													<a
														href={post.prepare_url}
														target="_blank"
														rel="noreferrer"
														title={post.prepare_url}
														className="block truncate text-[color:var(--txt-1)] underline decoration-dotted underline-offset-2"
													>
														{post.prepare_url}
													</a>
												) : (
													"—"
												)}
											</td>
											<td className="w-32 px-4 py-3 align-top">
												<Link
													href={`/admin/post-preparation/${post.post_id}`}
													className="inline-flex cursor-pointer items-center rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--cell-2)] px-2.5 py-1.5 text-xs font-semibold text-[color:var(--txt-1)] hover:bg-[color:var(--bg-1)]"
												>
													View detail
												</Link>
											</td>
										</tr>,
										<tr key={`post-actions-${post.post_id}`} className="border-b border-[color:var(--surface-border)] last:border-0">
											<td className="px-4 py-2" colSpan={4}>
												<div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--bg-1)] px-3 py-2">
													<div className="text-xs text-[color:var(--txt-2)]">
														Status:{" "}
														<span
															className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(post.prepare_status)}`}
														>
															{post.prepare_status || "—"}
														</span>
													</div>
													<div className="flex flex-wrap gap-2">
														{PREPARE_STATUS_OPTIONS.map((statusOption) => (
															<button
																key={`${post.post_id}-${statusOption}`}
																type="button"
																disabled={updatingThisPost}
																onClick={() => void handleUpdatePrepareStatus(post.post_id, statusOption)}
																className={statusButtonClass(statusOption, post.prepare_status === statusOption, updatingThisPost)}
															>
																{updatingThisPost ? "Updating..." : statusOption}
															</button>
														))}
													</div>
												</div>
											</td>
										</tr>,
									];
								})
							)}
						</tbody>
					</table>
				</div>

				{canLoadMore ? (
					<div className="mt-4 flex justify-center">
						<button
							type="button"
							onClick={() => void handleLoadMore()}
							disabled={loadingMore}
							className="rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--cell-2)] px-4 py-2 text-sm font-semibold text-[color:var(--txt-1)] hover:bg-[color:var(--bg-1)] disabled:cursor-not-allowed disabled:opacity-60"
						>
							{loadingMore ? "Loading..." : "Load more"}
						</button>
					</div>
				) : null}
			</div>
		</main>
	);
}
