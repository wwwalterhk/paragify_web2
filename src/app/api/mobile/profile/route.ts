import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

type DbBindings = CloudflareEnv & {
	DB?: D1Database;
	R2?: R2Bucket;
	JWT_SECRET?: string;
};

type UserRow = {
	user_pk: number;
	user_id: string | null;
	email: string;
	name: string | null;
	avatar_url: string | null;
	role: string | null;
};

type UserPostRow = {
	post_id: number;
	post_slug: string | null;
	title: string | null;
	caption: string | null;
	created_at: string | null;
	updated_at: string | null;
	visibility: string | null;
	like_count: number | null;
	comment_count: number | null;
	cover_media_url: string | null;
	cover_raw_media_url: string | null;
	cover_media_type: string | null;
	cover_width: number | null;
	cover_height: number | null;
};

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
const GOOGLE_AUDIENCES = [
	process.env.GOOGLE_CLIENT_ID || "",
	process.env.GOOGLE_CLIENT_ID_IOS || "",
	process.env.GOOGLE_CLIENT_ID_ANDROID || "",
].filter(Boolean);
const APPLE_AUDIENCES = [
	process.env.APPLE_CLIENT_ID || "",
	process.env.APPLE_CLIENT_ID_IOS || "",
	process.env.APPLE_CLIENT_ID_ANDROID || "",
].filter(Boolean);

const CDN_IMAGE_BASE = "https://cdn.paragify.com/cdn-cgi/image/width=900,quality=85,format=auto";
const CDN_SOURCE_BASE = "https://cdn.paragify.com";
const CDN_HOSTNAMES = new Set(["cdn.paragify.com", "cdn2.paragify.com"]);

const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
	"image/avif": "avif",
	"image/gif": "gif",
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/svg+xml": "svg",
	"image/webp": "webp",
};

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
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

function getTokenAlg(token: string): string | null {
	try {
		const { alg } = decodeProtectedHeader(token);
		return typeof alg === "string" ? alg : null;
	} catch {
		return null;
	}
}

async function resolveEmail(req: Request, env: DbBindings, db: D1Database): Promise<string | null> {
	const session = await getServerSession(authOptions);
	if (session?.user?.email) {
		return session.user.email.toLowerCase();
	}

	const authorization = req.headers.get("authorization") || "";
	if (!authorization.toLowerCase().startsWith("bearer ")) {
		return null;
	}

	const token = authorization.slice(7).trim();
	if (!token) {
		return null;
	}

	const tokenAlg = getTokenAlg(token);

	// Google ID token
	if (GOOGLE_AUDIENCES.length > 0 && tokenAlg === "RS256") {
		try {
			const { payload } = await jwtVerify(token, GOOGLE_JWKS, {
				audience: GOOGLE_AUDIENCES,
				issuer: ["https://accounts.google.com", "accounts.google.com"],
				algorithms: ["RS256"],
				clockTolerance: "120s",
			});
			const email = readString(payload.email);
			if (email) {
				return email.toLowerCase();
			}
		} catch {
			// Try Apple/HS256 fallback.
		}
	}

	// Apple ID token
	if (APPLE_AUDIENCES.length > 0 && tokenAlg === "RS256") {
		try {
			const { payload } = await jwtVerify(token, APPLE_JWKS, {
				audience: APPLE_AUDIENCES,
				issuer: "https://appleid.apple.com",
				algorithms: ["RS256"],
				clockTolerance: "120s",
			});
			const email = readString(payload.email);
			if (email) {
				return email.toLowerCase();
			}
		} catch {
			// Try HS256 fallback.
		}
	}

	// First-party credentials token (HS256)
	if (!tokenAlg || tokenAlg === "HS256") {
		const jwtSecret = readString(env.JWT_SECRET) ?? readString(process.env.JWT_SECRET);
		if (!jwtSecret) {
			return null;
		}

		try {
			const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret), {
				algorithms: ["HS256"],
				clockTolerance: "120s",
			});
			const email = readString(payload.email);
			const jti = readString(payload.jti);
			if (!email || !jti) {
				return null;
			}

			const sessionRow = await db
				.prepare(
					`SELECT 1
           FROM user_sessions us
           JOIN users u ON us.user_pk = u.user_pk
           WHERE us.session_token = ?
             AND us.expires_at > datetime('now')
             AND lower(u.email) = ?
           LIMIT 1`,
				)
				.bind(jti, email.toLowerCase())
				.first<{ 1: number }>();

			if (sessionRow) {
				return email.toLowerCase();
			}
		} catch {
			return null;
		}
	}

	return null;
}

function dataUrlToBuffer(dataUrl: string): { bytes: Uint8Array; contentType: string } | null {
	const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
	if (!match) {
		return null;
	}

	try {
		const bytes = new Uint8Array(Buffer.from(match[2], "base64"));
		if (bytes.byteLength === 0) {
			return null;
		}
		return {
			bytes,
			contentType: match[1].toLowerCase(),
		};
	} catch {
		return null;
	}
}

function createAvatarStorageKey(userId: string | null, userPk: number, contentType: string): string {
	const extension = IMAGE_EXTENSION_BY_MIME[contentType] ?? "img";
	const dateSegment = new Date().toISOString().slice(0, 10);
	const identity = (userId && userId.trim()) || `u${userPk}`;
	return `avatars/${dateSegment}/${identity}_${crypto.randomUUID()}.${extension}`;
}

export async function GET(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const email = await resolveEmail(request, bindings, db);
		if (!email) {
			return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
		}

		const user = await db
			.prepare("SELECT user_pk, user_id, email, name, avatar_url, role FROM users WHERE lower(email) = ? LIMIT 1")
			.bind(email)
			.first<UserRow>();
		if (!user?.user_pk) {
			return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
		}

		const postsResult = await db
			.prepare(
				`SELECT
            p.post_id,
            p.post_slug,
            p.title,
            p.caption,
            p.created_at,
            p.updated_at,
            p.visibility,
            p.like_count,
            p.comment_count,
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
          WHERE p.user_pk = ?
          ORDER BY p.created_at DESC, p.post_id DESC`,
			)
			.bind(user.user_pk)
			.all<UserPostRow>();

		const posts = (postsResult.results ?? []).map((post) => ({
			post_id: post.post_id,
			post_slug: post.post_slug,
			title: post.title,
			caption: post.caption,
			created_at: post.created_at,
			updated_at: post.updated_at,
			visibility: post.visibility,
			like_count: post.like_count ?? 0,
			comment_count: post.comment_count ?? 0,
			cover_url: toCdnUrl(post.cover_media_url, post.cover_raw_media_url, post.cover_media_type),
			cover_media_type: inferMediaType(post.cover_media_type, post.cover_media_url),
			cover_width: post.cover_width,
			cover_height: post.cover_height,
		}));

		return NextResponse.json({
			ok: true,
			user,
			posts,
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "Failed to load profile" },
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const email = await resolveEmail(request, bindings, db);
		if (!email) {
			return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
		}

		const body = (await request.json().catch(() => null)) as
			| {
					name?: unknown;
					avatar_url?: unknown;
					avatar_data?: unknown;
			  }
			| null;
		const name = readString(body?.name);
		const avatarUrlInput = readString(body?.avatar_url);
		const avatarData = readString(body?.avatar_data);

		const user = await db
			.prepare("SELECT user_pk, user_id FROM users WHERE lower(email) = ? LIMIT 1")
			.bind(email)
			.first<{ user_pk: number; user_id: string | null }>();
		if (!user?.user_pk) {
			return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
		}

		let resolvedAvatarUrl: string | null = avatarUrlInput;

		if (avatarData) {
			const parsedData = dataUrlToBuffer(avatarData);
			if (!parsedData) {
				return NextResponse.json({ ok: false, message: "Invalid avatar data" }, { status: 400 });
			}
			if (!bindings.R2) {
				return NextResponse.json({ ok: false, message: "Storage unavailable" }, { status: 500 });
			}

			const key = createAvatarStorageKey(user.user_id, user.user_pk, parsedData.contentType);
			await bindings.R2.put(key, parsedData.bytes, {
				httpMetadata: {
					contentType: parsedData.contentType,
					cacheControl: "public, max-age=31536000, immutable",
				},
			});

			resolvedAvatarUrl = `${CDN_SOURCE_BASE}/${key}`;
		}

		await db
			.prepare(
				`UPDATE users
         SET
           name = COALESCE(?, name),
           avatar_url = COALESCE(?, avatar_url),
           updated_at = datetime('now')
         WHERE user_pk = ?`,
			)
			.bind(name, resolvedAvatarUrl, user.user_pk)
			.run();

		return NextResponse.json({
			ok: true,
			avatar_url: resolvedAvatarUrl ?? null,
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "Failed to update profile" },
			{ status: 500 },
		);
	}
}
