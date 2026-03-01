import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Admin – Post Preparation Detail | 328car",
	description: "Detail view for a post preparation record.",
};

type PageProps = {
	params: Promise<{
		postId: string;
	}>;
};

type PreparePostDetailRow = {
	post_id: number;
	post_slug: string | null;
	user_pk: number;
	prepare_url: string | null;
	caption: string | null;
	prepare_plan: string | null;
	prepare_status: string | null;
	visibility: string;
	title: string | null;
	created_at: string | null;
	updated_at: string | null;
	author_name: string | null;
	author_handle: string | null;
};

function formatDate(value: string | null) {
	if (!value) return "—";
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? value : d.toLocaleString("en-HK", { hour12: false });
}

function formatPreparePlan(value: string | null): { text: string; isJson: boolean } {
	const raw = typeof value === "string" ? value.trim() : "";
	if (!raw) return { text: "—", isJson: false };
	try {
		const parsed = JSON.parse(raw);
		return { text: JSON.stringify(parsed, null, 2), isJson: true };
	} catch {
		return { text: raw, isJson: false };
	}
}

function normalizeImageCandidate(raw: string): string | null {
	const trimmed = raw.trim().replace(/^['"]+|['"]+$/g, "").replace(/[),.;!?]+$/g, "");
	return trimmed || null;
}

function isImageLikeUrl(url: string): boolean {
	return /\.(avif|bmp|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(url);
}

function resolveImageUrl(url: string): string {
	if (url.startsWith("http://") || url.startsWith("https://")) return url;
	const rel = url.startsWith("/") ? url : `/${url}`;
	return `https://cdn.328car.com${rel}`;
}

function extractCaptionImageUrls(caption: string | null): string[] {
	if (!caption) return [];

	const markdownImageMatches = Array.from(caption.matchAll(/!\[[^\]]*]\(([^)\s]+)\)/g)).map((m) => m[1]);
	const absoluteUrlMatches = caption.match(/https?:\/\/[^\s"'<>`]+/g) ?? [];
	const relativeUrlMatches = caption.match(/\/(?:attachments|uploads)\/[^\s"'<>`]+/g) ?? [];

	const urls = new Set<string>();
	for (const raw of [...markdownImageMatches, ...absoluteUrlMatches, ...relativeUrlMatches]) {
		const candidate = normalizeImageCandidate(raw);
		if (!candidate || !isImageLikeUrl(candidate)) continue;
		urls.add(resolveImageUrl(candidate));
	}
	return Array.from(urls);
}

async function loadPostDetail(postId: number): Promise<PreparePostDetailRow | null> {
	const { env } = await getCloudflareContext({ async: true });
	const db = (env as CloudflareEnv & { DB?: D1Database }).DB;
	if (!db) return null;

	const row = await db
		.prepare(
			`SELECT p.post_id,
			        p.post_slug,
			        p.user_pk,
			        p.prepare_url,
			        p.caption,
			        p.prepare_plan,
			        p.prepare_status,
			        p.visibility,
			        p.title,
			        p.created_at,
			        p.updated_at,
			        u.name AS author_name,
			        u.user_id AS author_handle
			   FROM posts p
			   LEFT JOIN users u ON u.user_pk = p.user_pk
			  WHERE p.post_id = ?
			  LIMIT 1`
		)
		.bind(postId)
		.first<PreparePostDetailRow>();

	return row ?? null;
}

export default async function PostPreparationDetailPage({ params }: PageProps) {
	const resolved = await params;
	const postId = Number(resolved.postId);
	if (!Number.isFinite(postId) || postId <= 0) return notFound();

	const post = await loadPostDetail(Math.trunc(postId));
	if (!post) return notFound();

	const prepared = formatPreparePlan(post.prepare_plan);
	const captionImages = extractCaptionImageUrls(post.caption);

	return (
		<main className="min-h-screen bg-[color:var(--bg-1)] text-[color:var(--txt-1)]">
			<div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 lg:px-16">
				<div className="mb-5">
					<Link
						href="/admin/post-preparation"
						className="inline-flex items-center rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--cell-2)] px-3 py-2 text-sm font-semibold text-[color:var(--txt-1)] hover:bg-[color:var(--bg-1)]"
					>
						Back to post preparation
					</Link>
				</div>

				<header className="mb-6 space-y-2">
					<div className="text-xs uppercase tracking-[0.26em] text-[color:var(--txt-3)]">Admin</div>
					<h1 className="text-3xl font-semibold tracking-tight text-[color:var(--txt-1)]">
						Post detail #{post.post_id}
					</h1>
					<p className="text-sm text-[color:var(--txt-2)]">Caption and preparation plan details.</p>
				</header>

				<section className="mb-5 grid gap-3 rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-5 text-sm md:grid-cols-2">
					<div className="text-[color:var(--txt-2)]">Post ID: {post.post_id}</div>
					<div className="text-[color:var(--txt-2)]">Post UID: {post.post_slug || "—"}</div>
					<div className="text-[color:var(--txt-2)]">User PK: {post.user_pk}</div>
					<div className="text-[color:var(--txt-2)]">
						User: {post.author_name || "—"}
						{post.author_handle ? ` (@${post.author_handle})` : ""}
					</div>
					<div className="text-[color:var(--txt-2)]">Status: {post.prepare_status || "—"}</div>
					<div className="text-[color:var(--txt-2)]">Visibility: {post.visibility}</div>
					<div className="text-[color:var(--txt-2)]">Title: {post.title || "—"}</div>
					<div className="text-[color:var(--txt-2)]">Created: {formatDate(post.created_at)}</div>
					<div className="text-[color:var(--txt-2)]">Updated: {formatDate(post.updated_at)}</div>
					<div className="md:col-span-2 text-[color:var(--txt-2)]">
						Prepare URL:{" "}
						{post.prepare_url ? (
							<a
								href={post.prepare_url}
								target="_blank"
								rel="noreferrer"
								className="break-all text-[color:var(--txt-1)] underline decoration-dotted underline-offset-2"
							>
								{post.prepare_url}
							</a>
						) : (
							"—"
						)}
					</div>
				</section>

				<section className="mb-5 rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-5">
					<div className="text-xs uppercase tracking-[0.2em] text-[color:var(--txt-3)]">Caption</div>
					<div className="mt-2 whitespace-pre-wrap text-sm text-[color:var(--txt-2)]">{post.caption?.trim() || "—"}</div>
					{captionImages.length ? (
						<div className="mt-4 space-y-2">
							<div className="text-xs uppercase tracking-[0.2em] text-[color:var(--txt-3)]">Caption Images</div>
							<div className="grid gap-3 sm:grid-cols-2">
								{captionImages.map((src, idx) => (
									<div
										key={`${post.post_id}-caption-image-${idx}`}
										className="overflow-hidden rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--bg-1)]"
									>
										<a href={src} target="_blank" rel="noreferrer" className="block">
											<img src={src} alt={`Caption image ${idx + 1}`} className="h-auto w-full object-cover" />
										</a>
									</div>
								))}
							</div>
						</div>
					) : null}
				</section>

				<section className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-5">
					<div className="text-xs uppercase tracking-[0.2em] text-[color:var(--txt-3)]">
						Prepare Plan{prepared.isJson ? " (JSON)" : ""}
					</div>
					<pre className="mt-2 whitespace-pre-wrap rounded-xl bg-[color:var(--bg-1)] p-3 text-xs text-[color:var(--txt-1)]">
						{prepared.text}
					</pre>
				</section>
			</div>
		</main>
	);
}
