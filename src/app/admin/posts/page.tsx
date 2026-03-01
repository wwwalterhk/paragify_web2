import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Admin - Posts | Paragify",
	description: "Simple admin listing for all posts.",
};

type AdminPostRow = {
	post_id: number;
	post_slug: string | null;
	user_pk: number;
	author_name: string | null;
	author_handle: string | null;
	title: string | null;
	visibility: string;
	locale: string | null;
	template_id: string | null;
	prepare_status: string | null;
	page_count: number | null;
	created_at: string | null;
	updated_at: string | null;
};

function formatDate(value: string | null) {
	if (!value) return "—";
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? value : d.toLocaleString("en-HK", { hour12: false });
}

async function loadPosts(): Promise<AdminPostRow[]> {
	const { env } = await getCloudflareContext({ async: true });
	const db = (env as CloudflareEnv & { DB?: D1Database }).DB;
	if (!db) return [];

	const rows = await db
		.prepare(
			`SELECT p.post_id,
			        p.post_slug,
			        p.user_pk,
			        u.name AS author_name,
			        u.user_id AS author_handle,
			        p.title,
			        p.visibility,
			        p.locale,
			        p.template_id,
			        p.prepare_status,
			        COALESCE(pc.page_count, 0) AS page_count,
			        p.created_at,
			        p.updated_at
			   FROM posts p
			   LEFT JOIN users u
			     ON u.user_pk = p.user_pk
			   LEFT JOIN (
			        SELECT post_id, COUNT(*) AS page_count
			          FROM post_pages
			         GROUP BY post_id
			   ) pc
			     ON pc.post_id = p.post_id
			  ORDER BY p.post_id DESC`
		)
		.all<AdminPostRow>();

	return rows.results ?? [];
}

export default async function AdminPostsPage() {
	const posts = await loadPosts();

	return (
		<main className="min-h-screen bg-[color:var(--bg-1)] text-[color:var(--txt-1)]">
			<div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 lg:px-16">
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
					<div>
						<div className="text-xs uppercase tracking-[0.26em] text-[color:var(--txt-3)]">Admin</div>
						<h1 className="text-3xl font-semibold tracking-tight text-[color:var(--txt-1)]">All Posts</h1>
						<p className="text-sm text-[color:var(--txt-2)]">
							Showing {posts.length} post{posts.length === 1 ? "" : "s"} in descending order.
						</p>
					</div>
					<Link
						href="/admin/post-preparation"
						className="inline-flex items-center rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--cell-2)] px-3 py-2 text-sm font-semibold text-[color:var(--txt-1)] hover:bg-[color:var(--bg-1)]"
					>
						Post preparation
					</Link>
				</div>

				<section className="overflow-hidden rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)]">
					{posts.length === 0 ? (
						<div className="px-6 py-8 text-sm text-[color:var(--txt-2)]">No posts found.</div>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full border-collapse text-sm">
								<thead className="bg-[color:var(--cell-2)] text-left text-xs uppercase tracking-wide text-[color:var(--txt-3)]">
									<tr>
										<th className="px-4 py-3">Post ID</th>
										<th className="px-4 py-3">Title</th>
										<th className="px-4 py-3">User</th>
										<th className="px-4 py-3">Visibility</th>
										<th className="px-4 py-3">Template</th>
										<th className="px-4 py-3">Locale</th>
										<th className="px-4 py-3">Prepare</th>
										<th className="px-4 py-3">Pages</th>
										<th className="px-4 py-3">Created</th>
										<th className="px-4 py-3">Updated</th>
										<th className="px-4 py-3">Actions</th>
									</tr>
								</thead>
								<tbody>
									{posts.map((post) => (
										<tr key={post.post_id} className="border-t border-[color:var(--surface-border)] align-top">
											<td className="px-4 py-3">
												<Link
													href={`/admin/post-preparation/${post.post_id}`}
													className="font-semibold text-[color:var(--txt-1)] underline decoration-dotted underline-offset-2"
												>
													{post.post_id}
												</Link>
												<div className="mt-1 max-w-[180px] truncate text-xs text-[color:var(--txt-3)]">{post.post_slug || "—"}</div>
											</td>
											<td className="max-w-[320px] px-4 py-3 text-[color:var(--txt-2)]">
												<div className="line-clamp-2">{post.title || "—"}</div>
											</td>
											<td className="px-4 py-3 text-[color:var(--txt-2)]">
												<div>{post.author_name || "—"}</div>
												<div className="text-xs text-[color:var(--txt-3)]">
													{post.author_handle ? `@${post.author_handle}` : "—"} · user_pk {post.user_pk}
												</div>
											</td>
											<td className="px-4 py-3 text-[color:var(--txt-2)]">{post.visibility || "—"}</td>
											<td className="px-4 py-3 text-[color:var(--txt-2)]">{post.template_id || "—"}</td>
											<td className="px-4 py-3 text-[color:var(--txt-2)]">{post.locale || "—"}</td>
											<td className="px-4 py-3 text-[color:var(--txt-2)]">{post.prepare_status || "—"}</td>
											<td className="px-4 py-3 text-[color:var(--txt-2)]">{post.page_count ?? 0}</td>
											<td className="whitespace-nowrap px-4 py-3 text-[color:var(--txt-2)]">{formatDate(post.created_at)}</td>
											<td className="whitespace-nowrap px-4 py-3 text-[color:var(--txt-2)]">{formatDate(post.updated_at)}</td>
											<td className="whitespace-nowrap px-4 py-3">
												<Link
													href={`/add-post?post_id=${post.post_id}&mode=edit`}
													className="inline-flex items-center rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--cell-2)] px-2.5 py-1.5 text-xs font-semibold text-[color:var(--txt-1)] hover:bg-[color:var(--bg-1)]"
												>
													Edit
												</Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>
			</div>
		</main>
	);
}
