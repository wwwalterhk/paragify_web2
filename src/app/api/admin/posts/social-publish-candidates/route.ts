import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type PublishCandidateRow = {
	post_id: number;
	post_slug: string | null;
	title: string | null;
	caption: string | null;
	prepare_content: string | null;
	locale: string | null;
	brand_slug: string | null;
	created_at: string | null;
	visibility: string;
	cover_media_url: string | null;
	cover_raw_media_url: string | null;
	cover_media_type: string | null;
	cover_width: number | null;
	cover_height: number | null;
};

const CDN_IMAGE_BASE = "https://cdn.paragify.com/cdn-cgi/image/width=900,quality=85,format=auto";
const CDN_SOURCE_BASE = "https://cdn.paragify.com";
const CDN_HOSTNAMES = new Set(["cdn.paragify.com", "cdn2.paragify.com"]);
const DEFAULT_SITE_URL = "http://localhost:3000";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, "");

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toPositiveInt(value: string | null, fallback: number): number {
	if (!value) return fallback;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.floor(parsed);
}

function normalizeR2MediaKey(value: string): string {
	return value.replace(/^\/+/, "");
}

function normalizeLocale(value: string | null): "en" | "zh" {
	return value?.trim().toLowerCase() === "en" ? "en" : "zh";
}

function getPostSlugRef(post: Pick<PublishCandidateRow, "post_slug" | "post_id">): string {
	const slug = post.post_slug?.trim();
	return slug || String(post.post_id);
}

function buildPostUrl(post: Pick<PublishCandidateRow, "post_slug" | "post_id" | "locale">): string {
	const locale = normalizeLocale(post.locale);
	return `${SITE_URL}/post/${locale}/${encodeURIComponent(getPostSlugRef(post))}`;
}

function inferMediaType(mediaType: string | null, mediaUrl: string | null): "image" | "video" {
	const normalizedType = mediaType?.toLowerCase().trim() ?? "";
	if (normalizedType.startsWith("video")) {
		return "video";
	}

	const source = mediaUrl?.toLowerCase().trim() ?? "";
	if (source.endsWith(".mp4") || source.endsWith(".mov") || source.endsWith(".webm") || source.endsWith(".m3u8")) {
		return "video";
	}

	return "image";
}

function extractR2MediaKey(mediaUrl: string | null, rawMediaUrl: string | null): string | null {
	const source = readString(mediaUrl);
	if (source) {
		if (source.startsWith("/api/media?")) {
			try {
				const url = new URL(source, CDN_SOURCE_BASE);
				const key = url.searchParams.get("key");
				if (key) {
					return normalizeR2MediaKey(decodeURIComponent(key));
				}
			} catch {
				return null;
			}
		}

		if (source.startsWith("http://") || source.startsWith("https://")) {
			try {
				const parsed = new URL(source);
				if (CDN_HOSTNAMES.has(parsed.hostname)) {
					if (parsed.pathname.startsWith("/cdn-cgi/image/")) {
						return null;
					}
					return normalizeR2MediaKey(parsed.pathname);
				}
				return null;
			} catch {
				return null;
			}
		}

		if (source.startsWith("data:") || source.startsWith("blob:")) {
			return null;
		}

		return normalizeR2MediaKey(source);
	}

	const raw = readString(rawMediaUrl);
	return raw ? normalizeR2MediaKey(raw) : null;
}

function toCdnUrl(mediaUrl: string | null, rawMediaUrl: string | null, mediaType: string | null): string | null {
	const direct = readString(mediaUrl);
	if (direct && (direct.startsWith("http://") || direct.startsWith("https://"))) {
		try {
			const parsed = new URL(direct);
			if (!CDN_HOSTNAMES.has(parsed.hostname)) {
				return direct;
			}
		} catch {
			return direct;
		}
	}

	const mediaKey = extractR2MediaKey(mediaUrl, rawMediaUrl);
	if (!mediaKey) {
		return direct ?? readString(rawMediaUrl);
	}

	if (inferMediaType(mediaType, mediaUrl) === "video") {
		return `${CDN_SOURCE_BASE}/${mediaKey}`;
	}

	return `${CDN_IMAGE_BASE}/${mediaKey}`;
}

export async function GET(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const requestUrl = new URL(request.url);
		const page = toPositiveInt(requestUrl.searchParams.get("page"), 1);
		const limit = Math.min(toPositiveInt(requestUrl.searchParams.get("limit"), 30), 100);
		const offset = (page - 1) * limit;

		const totalRow = await db
			.prepare(`SELECT COUNT(1) AS total FROM posts p WHERE p.visibility = 'public'`)
			.first<{ total: number }>();
		const total = Number(totalRow?.total ?? 0);

		const rows = await db
			.prepare(
				`SELECT
            p.post_id,
            p.post_slug,
            p.title,
            p.caption,
            p.prepare_content,
            p.locale,
            p.brand_slug,
            p.created_at,
            p.visibility,
            COALESCE(cp.media_url, fp.media_url) AS cover_media_url,
            COALESCE(cp.raw_media_url, fp.raw_media_url) AS cover_raw_media_url,
            COALESCE(cp.media_type, fp.media_type) AS cover_media_type,
            COALESCE(cp.width, fp.width) AS cover_width,
            COALESCE(cp.height, fp.height) AS cover_height
          FROM posts p
          LEFT JOIN post_pages cp
            ON cp.post_id = p.post_id
           AND cp.page_num = CASE WHEN p.cover_page IS NOT NULL AND p.cover_page > 0 THEN p.cover_page ELSE 1 END
          LEFT JOIN post_pages fp
            ON fp.post_id = p.post_id
           AND fp.page_num = 1
          WHERE p.visibility = 'public'
          ORDER BY p.created_at DESC, p.post_id DESC
          LIMIT ? OFFSET ?`,
			)
			.bind(limit, offset)
			.all<PublishCandidateRow>();

		const posts = (rows.results ?? []).map((row) => ({
			post_id: row.post_id,
			post_slug: row.post_slug,
			title: row.title,
			caption: row.caption,
			prepare_content: row.prepare_content,
			locale: row.locale,
			brand_slug: row.brand_slug,
			created_at: row.created_at,
			visibility: row.visibility,
			fb_id: null,
			fb_perm_link: null,
			post_url: buildPostUrl(row),
			cover_url: toCdnUrl(row.cover_media_url, row.cover_raw_media_url, row.cover_media_type),
			cover_width: row.cover_width,
			cover_height: row.cover_height,
			facebook_published: false,
		}));

		const hasMore = offset + posts.length < total;
		return NextResponse.json({
			ok: true,
			posts,
			paging: {
				page,
				limit,
				total,
				has_more: hasMore,
				next_page: hasMore ? page + 1 : null,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "Failed to load social publish candidates" },
			{ status: 500 },
		);
	}
}

export function POST() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
