import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

type DbBindings = CloudflareEnv & { DB?: D1Database; JWT_SECRET?: string };

type AdminUserRow = {
	user_pk: number;
	role: string | null;
};

type PostLookupRow = {
	post_id: number;
	post_slug: string | null;
	visibility: string | null;
};

type UpdatePostVisibilityBody = {
	post_id?: unknown;
	post_slug?: unknown;
	post_url?: unknown;
};

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseBodyPostId(value: unknown): number | null {
	const raw = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
	if (!Number.isFinite(raw) || raw <= 0) return null;
	return Math.floor(raw);
}

function extractPostSlugFromUrl(input: string): string | null {
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
		.map((segment) => segment.trim())
		.filter(Boolean);
	if (!segments.length) return null;

	const maybeSlug = decodeURIComponent(segments[segments.length - 1] ?? "").trim();
	return maybeSlug || null;
}

async function resolveEmail(req: Request, env: DbBindings, db: D1Database): Promise<string | null> {
	try {
		const session = await getServerSession(authOptions);
		const email = readString(session?.user?.email);
		if (email) return email.toLowerCase();
	} catch {
		// Ignore and fallback to bearer token verification.
	}

	const authorization = req.headers.get("authorization") || "";
	if (!authorization.toLowerCase().startsWith("bearer ")) {
		return null;
	}

	const token = authorization.slice(7).trim();
	if (!token) return null;

	const jwtSecret = readString(env.JWT_SECRET) ?? readString(process.env.JWT_SECRET);
	if (!jwtSecret) return null;

	try {
		const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret), {
			algorithms: ["HS256"],
			clockTolerance: "120s",
		});
		const email = readString(payload.email)?.toLowerCase();
		const jti = readString(payload.jti);
		if (!email || !jti) return null;

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
			.bind(jti, email)
			.first<{ 1: number }>();

		return sessionRow ? email : null;
	} catch {
		return null;
	}
}

async function assertAdmin(req: Request, bindings: DbBindings, db: D1Database): Promise<NextResponse | null> {
	const email = await resolveEmail(req, bindings, db);
	if (!email) {
		return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
	}

	const adminUser = await db
		.prepare("SELECT user_pk, role FROM users WHERE lower(email) = ? LIMIT 1")
		.bind(email)
		.first<AdminUserRow>();
	if (!adminUser?.user_pk) {
		return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
	}
	if ((adminUser.role ?? "").toLowerCase() !== "admin") {
		return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
	}
	return null;
}

export async function PATCH(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const authError = await assertAdmin(request, bindings, db);
		if (authError) return authError;

		const body = (await request.json().catch(() => null)) as UpdatePostVisibilityBody | null;
		const postId = parseBodyPostId(body?.post_id);
		const directPostSlug = readString(body?.post_slug);
		const postUrl = readString(body?.post_url);
		const postSlug = directPostSlug ?? (postUrl ? extractPostSlugFromUrl(postUrl) : null);

		if (!postId && !postSlug) {
			return NextResponse.json(
				{ ok: false, message: "post_id or post_slug (or post_url) is required" },
				{ status: 400 },
			);
		}

		const post = postId
			? await db
					.prepare("SELECT post_id, post_slug, visibility FROM posts WHERE post_id = ? LIMIT 1")
					.bind(postId)
					.first<PostLookupRow>()
			: await db
					.prepare("SELECT post_id, post_slug, visibility FROM posts WHERE post_slug = ? LIMIT 1")
					.bind(postSlug)
					.first<PostLookupRow>();

		if (!post?.post_id) {
			return NextResponse.json(
				{ ok: false, message: "post not found", post_id: postId ?? null, post_slug: postSlug ?? null },
				{ status: 404 },
			);
		}

		if ((post.visibility ?? "").toLowerCase() !== "private") {
			const updateResult = await db
				.prepare(
					`UPDATE posts
					    SET visibility = 'private',
					        updated_at = datetime('now')
					  WHERE post_id = ?`,
				)
				.bind(post.post_id)
				.run();

			if ((updateResult.meta?.changes ?? 0) < 1) {
				return NextResponse.json(
					{ ok: false, message: "failed to update visibility", post_id: post.post_id },
					{ status: 409 },
				);
			}
		}

		return NextResponse.json({
			ok: true,
			post_id: post.post_id,
			post_slug: post.post_slug,
			visibility: "private",
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to update post visibility",
			},
			{ status: 500 },
		);
	}
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
