import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

type DbBindings = CloudflareEnv & { DB?: D1Database; JWT_SECRET?: string };

type PostListRow = {
	post_id: number;
	user_pk: number;
	post_slug: string | null;
	caption: string | null;
	prepare_content: string | null;
	created_at: string | null;
	like_count: number | null;
	comment_count: number | null;
	brand_slug: string | null;
	locale: string | null;
	liked_by_me: number | null;
	saved_by_me: number | null;
	author_name: string | null;
	author_handle: string | null;
	author_avatar: string | null;
	cover_media_url: string | null;
	cover_raw_media_url: string | null;
	cover_media_type: string | null;
	cover_width: number | null;
	cover_height: number | null;
};

type PostPageRow = {
	post_id: number;
	page_num: number;
	media_url: string | null;
	raw_media_url: string | null;
	media_type: string | null;
	width: number | null;
	height: number | null;
	alt_text: string | null;
	caption: string | null;
	title: string | null;
	layout_json: string | null;
};

type PostCommentRow = {
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

const CDN_IMAGE_BASE = "https://cdn.paragify.com/cdn-cgi/image/width=900,quality=85,format=auto";
const CDN_SOURCE_BASE = "https://cdn.paragify.com";
const CDN_HOSTNAMES = new Set(["cdn.paragify.com", "cdn2.paragify.com"]);

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parsePositiveInt(value: string | null): number | null {
	if (!value) return null;
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return null;
	const intValue = Math.floor(numeric);
	return intValue > 0 ? intValue : null;
}

function parseNonNegativeInt(value: string | null): number | null {
	if (!value) return null;
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return null;
	const intValue = Math.floor(numeric);
	return intValue >= 0 ? intValue : null;
}

function normalizeR2MediaKey(value: string): string {
	return value.replace(/^\/+/, "");
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

function toCdnUrl(
	mediaUrl: string | null,
	rawMediaUrl: string | null,
	mediaType: string | null,
): string {
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
		return direct ?? readString(rawMediaUrl) ?? "";
	}

	const normalizedType = inferMediaType(mediaType, mediaUrl);
	if (normalizedType === "video") {
		return `${CDN_SOURCE_BASE}/${mediaKey}`;
	}

	return `${CDN_IMAGE_BASE}/${mediaKey}`;
}

async function hasTable(db: D1Database, tableName: string): Promise<boolean> {
	const row = await db
		.prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
		.bind(tableName)
		.first<{ present: number }>();
	return Boolean(row?.present);
}

async function hasColumn(
	db: D1Database,
	tableName: "posts" | "post_pages" | "users",
	columnName: string,
): Promise<boolean> {
	try {
		const rows = await db.prepare(`PRAGMA table_info(${tableName})`).all<{ name: string }>();
		return (rows.results ?? []).some((row) => row.name === columnName);
	} catch {
		return false;
	}
}

async function resolveUserPk(req: Request, env: DbBindings): Promise<number | null> {
	try {
		const session = await getServerSession(authOptions);
		const email = session?.user?.email?.toLowerCase();
		if (email && env.DB) {
			const row = await env.DB
				.prepare("SELECT user_pk FROM users WHERE lower(email) = ? LIMIT 1")
				.bind(email)
				.first<{ user_pk: number }>();
			if (row?.user_pk) {
				return row.user_pk;
			}
		}
	} catch {
		// Ignore session resolution errors.
	}

	const authorization = req.headers.get("authorization") || "";
	if (authorization.toLowerCase().startsWith("bearer ")) {
		const token = authorization.slice(7).trim();
		const secret = readString(env.JWT_SECRET) ?? readString(process.env.JWT_SECRET);
		if (token && secret && env.DB) {
			try {
				const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
					algorithms: ["HS256"],
					clockTolerance: "120s",
				});
				const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
				const jti = typeof payload.jti === "string" ? payload.jti : null;
				if (email && jti) {
					const row = await env.DB
						.prepare(
							`SELECT us.user_pk
               FROM user_sessions us
               JOIN users u ON u.user_pk = us.user_pk
              WHERE us.session_token = ?
                AND us.expires_at > datetime('now')
                AND lower(u.email) = ?
              LIMIT 1`,
						)
						.bind(jti, email)
						.first<{ user_pk: number }>();
					if (row?.user_pk) {
						return row.user_pk;
					}
				}
			} catch {
				// Ignore invalid token.
			}
		}
	}

	const requestUrl = new URL(req.url);
	const userPkRaw = requestUrl.searchParams.get("userPk") ?? req.headers.get("x-user-pk");
	const userPk = userPkRaw ? Number(userPkRaw) : NaN;
	if (Number.isFinite(userPk) && userPk > 0) {
		return Math.floor(userPk);
	}

	return null;
}

export async function GET(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const viewerPk = await resolveUserPk(request, bindings);
		const requestUrl = new URL(request.url);
		const limit = Math.min(Math.max(parsePositiveInt(requestUrl.searchParams.get("limit")) ?? 20, 1), 50);
		const offset = parseNonNegativeInt(requestUrl.searchParams.get("offset")) ?? 0;
		const sincePost =
			parsePositiveInt(requestUrl.searchParams.get("sincepost")) ??
			parsePositiveInt(requestUrl.searchParams.get("sincePost"));
		const brandSlug = readString(requestUrl.searchParams.get("brandSlug"))?.toLowerCase() ?? null;
		const locale = readString(requestUrl.searchParams.get("locale"))?.toLowerCase() ?? null;
		const userId = readString(requestUrl.searchParams.get("userId"));
		const savedOnly =
			requestUrl.searchParams.get("saved") === "1" ||
			requestUrl.searchParams.get("saved") === "true";
		const tagRaw = readString(requestUrl.searchParams.get("tag")) ?? readString(requestUrl.searchParams.get("hashtag"));
		const tag = tagRaw ? tagRaw.replace(/^#/, "").trim().toLowerCase() : null;

		const [postSavesAvailable, brandSlugAvailable] = await Promise.all([
			hasTable(db, "post_saves"),
			hasColumn(db, "posts", "brand_slug"),
		]);

		if (savedOnly && !viewerPk) {
			return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
		}

		if (savedOnly && !postSavesAvailable) {
			return NextResponse.json({
				ok: true,
				posts: [],
				pages: [],
				comments: [],
				likes: [],
				saves: [],
				limit,
				offset,
			});
		}

		const filters: string[] = ["p.visibility = 'public'"];
		const filterBindings: Array<string | number> = [];

		if (brandSlug && brandSlugAvailable) {
			filters.push("lower(p.brand_slug) = ?");
			filterBindings.push(brandSlug);
		}

		if (locale) {
			filters.push("(p.locale IS NULL OR lower(p.locale) = ?)");
			filterBindings.push(locale);
		}

		if (sincePost) {
			filters.push("p.post_id > ?");
			filterBindings.push(sincePost);
		}

		if (userId) {
			filters.push("u.user_id = ?");
			filterBindings.push(userId);
		}

		if (savedOnly && viewerPk && postSavesAvailable) {
			filters.push("EXISTS (SELECT 1 FROM post_saves ps WHERE ps.post_id = p.post_id AND ps.user_pk = ?)");
			filterBindings.push(viewerPk);
		}

		if (tag) {
			filters.push("EXISTS (SELECT 1 FROM post_hashtags ph WHERE ph.post_id = p.post_id AND ph.tag = ?)");
			filterBindings.push(tag);
		}

		const likedSelect = viewerPk
			? "EXISTS (SELECT 1 FROM post_likes pl WHERE pl.post_id = p.post_id AND pl.user_pk = ?) AS liked_by_me,"
			: "0 AS liked_by_me,";
		const savedSelect =
			viewerPk && postSavesAvailable
				? "EXISTS (SELECT 1 FROM post_saves ps WHERE ps.post_id = p.post_id AND ps.user_pk = ?) AS saved_by_me,"
				: "0 AS saved_by_me,";
		const brandSlugSelect = brandSlugAvailable ? "p.brand_slug AS brand_slug," : "NULL AS brand_slug,";
		const likedSelectBindings: number[] = viewerPk ? [viewerPk] : [];
		const savedSelectBindings: number[] = viewerPk && postSavesAvailable ? [viewerPk] : [];

		const postsResult = await db
			.prepare(
				`SELECT
            p.post_id,
            p.user_pk,
            p.post_slug,
            p.caption,
            p.prepare_content,
            p.created_at,
            p.like_count,
            p.comment_count,
            ${brandSlugSelect}
            p.locale,
            ${likedSelect}
            ${savedSelect}
            u.name AS author_name,
            u.user_id AS author_handle,
            u.avatar_url AS author_avatar,
            COALESCE(cp.media_url, fp.media_url) AS cover_media_url,
            COALESCE(cp.raw_media_url, fp.raw_media_url) AS cover_raw_media_url,
            COALESCE(cp.media_type, fp.media_type) AS cover_media_type,
            COALESCE(cp.width, fp.width) AS cover_width,
            COALESCE(cp.height, fp.height) AS cover_height
          FROM posts p
          JOIN users u ON u.user_pk = p.user_pk
          LEFT JOIN post_pages cp
            ON cp.post_id = p.post_id
            AND cp.page_num = CASE WHEN p.cover_page IS NOT NULL AND p.cover_page > 0 THEN p.cover_page ELSE 1 END
          LEFT JOIN post_pages fp
            ON fp.post_id = p.post_id
            AND fp.page_num = 1
          WHERE ${filters.join(" AND ")}
          ORDER BY p.post_id DESC
          LIMIT ? OFFSET ?`,
			)
			.bind(...likedSelectBindings, ...savedSelectBindings, ...filterBindings, limit, offset)
			.all<PostListRow>();

		const postRows = postsResult.results ?? [];
		if (postRows.length === 0) {
			return NextResponse.json({
				ok: true,
				posts: [],
				pages: [],
				comments: [],
				likes: [],
				saves: [],
				limit,
				offset,
			});
		}

		const postIds = postRows.map((row) => row.post_id);
		const placeholders = postIds.map(() => "?").join(", ");

		const pagesResult = await db
			.prepare(
				`SELECT
            post_id,
            page_num,
            media_url,
            raw_media_url,
            media_type,
            width,
            height,
            alt_text,
            caption,
            title,
            layout_json
          FROM post_pages
          WHERE post_id IN (${placeholders})
          ORDER BY post_id DESC, page_num ASC`,
			)
			.bind(...postIds)
			.all<PostPageRow>();

		const commentsResult = await db
			.prepare(
				`SELECT
            c.comment_id,
            c.post_id,
            c.user_pk,
            c.body,
            c.reply_to_comment_id,
            c.created_at,
            u.name AS user_name,
            u.user_id AS user_handle,
            u.avatar_url AS user_avatar
          FROM post_comments c
          JOIN users u ON u.user_pk = c.user_pk
          WHERE c.post_id IN (${placeholders})
          ORDER BY c.created_at ASC`,
			)
			.bind(...postIds)
			.all<PostCommentRow>();

		const likesResult = await db
			.prepare(`SELECT post_id, user_pk FROM post_likes WHERE post_id IN (${placeholders})`)
			.bind(...postIds)
			.all<{ post_id: number; user_pk: number }>();

		const savesResult =
			postSavesAvailable
				? await db
						.prepare(`SELECT post_id, user_pk FROM post_saves WHERE post_id IN (${placeholders})`)
						.bind(...postIds)
						.all<{ post_id: number; user_pk: number }>()
				: { results: [] as Array<{ post_id: number; user_pk: number }> };

		const posts = postRows.map((row) => ({
			post_id: row.post_id,
			user_pk: row.user_pk,
			post_slug: row.post_slug,
			caption: row.caption,
			prepare_content: row.prepare_content,
			created_at: row.created_at,
			like_count: row.like_count ?? 0,
			comment_count: row.comment_count ?? 0,
			brand_slug: row.brand_slug,
			locale: row.locale,
			author_name: row.author_name,
			author_handle: row.author_handle,
			author_avatar: row.author_avatar,
			cover_url: toCdnUrl(row.cover_media_url, row.cover_raw_media_url, row.cover_media_type),
			cover_width: row.cover_width,
			cover_height: row.cover_height,
			liked: Boolean(row.liked_by_me),
			saved: Boolean(row.saved_by_me),
		}));

		const pages = (pagesResult.results ?? []).map((page) => ({
			...page,
			media_url: toCdnUrl(page.media_url, page.raw_media_url, page.media_type),
			media_type: inferMediaType(page.media_type, page.media_url),
		}));

		return NextResponse.json({
			ok: true,
			posts,
			pages,
			comments: commentsResult.results ?? [],
			likes: likesResult.results ?? [],
			saves: savesResult.results ?? [],
			limit,
			offset,
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "Failed to load mobile posts" },
			{ status: 500 },
		);
	}
}

export function POST() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
