import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

type DbBindings = CloudflareEnv & { DB?: D1Database; JWT_SECRET?: string };

type PostRow = {
	post_id: number;
	post_slug: string | null;
	title: string | null;
	caption: string | null;
	created_at: string | null;
	like_count: number | null;
	comment_count: number | null;
	locale: string | null;
	liked_by_me: number | null;
	author_name: string | null;
	author_handle: string | null;
	author_avatar: string | null;
};

type PostPageRow = {
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
	const integer = Math.floor(numeric);
	return integer > 0 ? integer : null;
}

function normalizeR2MediaKey(value: string): string {
	return value.replace(/^\/+/, "");
}

function inferMediaType(mediaType: string | null, mediaUrl: string | null): "image" | "video" {
	const normalized = mediaType?.toLowerCase().trim() ?? "";
	if (normalized.startsWith("video")) {
		return "video";
	}

	const source = mediaUrl?.toLowerCase().trim() ?? "";
	if (
		source.endsWith(".mp4") ||
		source.endsWith(".mov") ||
		source.endsWith(".webm") ||
		source.endsWith(".m3u8")
	) {
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

function toCdnUrl(mediaUrl: string | null, rawMediaUrl: string | null, mediaType: string | null): string {
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

	if (inferMediaType(mediaType, mediaUrl) === "video") {
		return `${CDN_SOURCE_BASE}/${mediaKey}`;
	}
	return `${CDN_IMAGE_BASE}/${mediaKey}`;
}

async function resolveUserPk(req: Request, env: DbBindings): Promise<number | null> {
	// Cookie session
	try {
		const session = await getServerSession(authOptions);
		const email = session?.user?.email?.toLowerCase();
		if (email && env.DB) {
			const row = await env.DB
				.prepare("SELECT user_pk FROM users WHERE lower(email)=? LIMIT 1")
				.bind(email)
				.first<{ user_pk: number }>();
			if (row?.user_pk) return row.user_pk;
		}
	} catch {
		// ignore
	}

	// Bearer token (HS256)
	const auth = req.headers.get("authorization") || "";
	if (auth.toLowerCase().startsWith("bearer ")) {
		const token = auth.slice(7).trim();
		const secret = readString(env.JWT_SECRET) ?? readString(process.env.JWT_SECRET);
		if (secret && env.DB) {
			try {
				const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
					algorithms: ["HS256"],
					clockTolerance: "120s",
				});
				const emailJwt = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
				const jti = typeof payload.jti === "string" ? payload.jti : null;
				if (emailJwt && jti) {
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
						.bind(jti, emailJwt)
						.first<{ user_pk: number }>();
					if (row?.user_pk) return row.user_pk;
				}
			} catch {
				// ignore token errors
			}
		}
	}

	// Dev override
	const url = new URL(req.url);
	const qp = url.searchParams.get("userPk");
	const header = req.headers.get("x-user-pk");
	const raw = qp ?? header;
	if (raw) {
		const n = Number(raw);
		if (Number.isFinite(n) && n > 0) return n;
	}
	return null;
}

export async function GET(req: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const viewerPk = await resolveUserPk(req, bindings);
		const requestUrl = new URL(req.url);
		const slug = readString(requestUrl.searchParams.get("slug"));
		const postId = parsePositiveInt(requestUrl.searchParams.get("id"));
		if (!slug && !postId) {
			return NextResponse.json({ ok: false, message: "missing slug or id" }, { status: 400 });
		}

		const whereSlug = slug ?? "";
		const wherePostId = postId ?? -1;
		const post = await db
			.prepare(
				`SELECT
            p.post_id,
            p.post_slug,
            p.title,
            p.caption,
            p.created_at,
            p.like_count,
            p.comment_count,
            p.locale,
            ${viewerPk ? "EXISTS (SELECT 1 FROM post_likes pl WHERE pl.post_id = p.post_id AND pl.user_pk = ?)" : "0"} AS liked_by_me,
            u.name AS author_name,
            u.user_id AS author_handle,
            u.avatar_url AS author_avatar
          FROM posts p
          JOIN users u ON u.user_pk = p.user_pk
          WHERE p.visibility = 'public'
            AND (p.post_slug = ? OR p.post_id = ?)
          LIMIT 1`,
			)
			.bind(...(viewerPk ? [viewerPk, whereSlug, wherePostId] : [whereSlug, wherePostId]))
			.first<PostRow>();

		if (!post?.post_id) {
			return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
		}

		const pagesResult = await db
			.prepare(
				`SELECT
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
          WHERE post_id = ?
          ORDER BY page_num ASC`,
			)
			.bind(post.post_id)
			.all<PostPageRow>();

		const pages = (pagesResult.results ?? []).map((page) => ({
			...page,
			media_url: toCdnUrl(page.media_url, page.raw_media_url, page.media_type),
			media_type: inferMediaType(page.media_type, page.media_url),
		}));

		return NextResponse.json({
			ok: true,
			post: {
				...post,
				liked: Boolean(post.liked_by_me),
			},
			pages,
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "Failed to load post" },
			{ status: 500 },
		);
	}
}

export function POST() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
