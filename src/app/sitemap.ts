import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { MetadataRoute } from "next";

export const revalidate = 3600;

const DEFAULT_SITE_URL = "http://localhost:3000";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, "");

type DbBindings = CloudflareEnv & { DB?: D1Database };

type SitemapPostRow = {
	post_id: number;
	post_slug: string | null;
	created_at: string | null;
	updated_at: string | null;
};

function toAbsoluteUrl(path: string): string {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${SITE_URL}${normalizedPath}`;
}

function getPostSlugRef(post: Pick<SitemapPostRow, "post_id" | "post_slug">): string {
	const slug = post.post_slug?.trim();
	return slug || String(post.post_id);
}

function toLastModified(value: string | null): Date | undefined {
	const trimmed = value?.trim();
	if (!trimmed) {
		return undefined;
	}

	const date = new Date(trimmed);
	return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const entries: MetadataRoute.Sitemap = [
		{
			url: toAbsoluteUrl("/"),
			changeFrequency: "daily",
			priority: 1,
		},
		{
			url: toAbsoluteUrl("/feed"),
			changeFrequency: "daily",
			priority: 0.9,
		},
	];

	try {
		const { env } = await getCloudflareContext({ async: true });
		const db = (env as DbBindings | undefined)?.DB;

		if (!db) {
			return entries;
		}

		const rows = await db
			.prepare(
				`SELECT
					post_id,
					post_slug,
					created_at,
					updated_at
				FROM posts
				WHERE visibility = 'public'
				ORDER BY post_id DESC`,
			)
			.all<SitemapPostRow>();

		for (const row of rows.results ?? []) {
			const lastModified = toLastModified(row.updated_at) ?? toLastModified(row.created_at);

			entries.push({
				url: toAbsoluteUrl(`/p/${encodeURIComponent(getPostSlugRef(row))}`),
				lastModified,
				changeFrequency: "weekly",
				priority: 0.8,
			});
		}
	} catch (error) {
		console.error("Failed to build sitemap.", error);
	}

	return entries;
}
