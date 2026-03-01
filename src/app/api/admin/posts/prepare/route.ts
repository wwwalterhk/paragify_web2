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

type UserExistRow = {
	user_pk: number;
	writing_locale: string | null;
};

type PreparePostRow = {
	post_id: number;
	user_pk: number;
	post_slug: string | null;
	title: string | null;
	prepare_status: string | null;
	visibility: string;
	prepare_content: string | null;
	prepare_url: string | null;
	prepare_plan: string | null;
	prepare_mode: string | null;
	created_at: string | null;
	updated_at: string | null;
	author_name: string | null;
	author_handle: string | null;
};

type CreatePrepareRequestBody = {
	prepare_url?: unknown;
	user_pk?: unknown;
};

type UpdatePrepareRequestBody = {
	post_id?: unknown;
	prepare_status?: unknown;
	post_url?: unknown;
	post_slug?: unknown;
};

const PREPARE_STATUS_OPTIONS = ["fetch_url", "fetch_url_done", "fetch_url_batch_done", "fetch_plan_done", "fail"] as const;
type PrepareStatusOption = (typeof PREPARE_STATUS_OPTIONS)[number];

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toPositiveInt(value: string | null, fallback: number): number {
	if (!value) return fallback;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.floor(parsed);
}

function parseBodyUserPk(value: unknown): number | null {
	const raw = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
	if (!Number.isFinite(raw) || raw <= 0) return null;
	return Math.floor(raw);
}

function parseBodyPostId(value: unknown): number | null {
	const raw = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
	if (!Number.isFinite(raw) || raw <= 0) return null;
	return Math.floor(raw);
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

async function resolveEmail(req: Request, env: DbBindings, db: D1Database): Promise<string | null> {
	try {
		const session = await getServerSession(authOptions);
		const email = readString(session?.user?.email);
		if (email) return email.toLowerCase();
	} catch {
		// ignore and fallback to bearer token
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

export async function POST(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const authError = await assertAdmin(request, bindings, db);
		if (authError) return authError;

		const body = (await request.json().catch(() => null)) as CreatePrepareRequestBody | null;
		const prepareUrl = readString(body?.prepare_url);
		const userPk = parseBodyUserPk(body?.user_pk);

		if (!prepareUrl) {
			return NextResponse.json({ ok: false, message: "prepare_url is required" }, { status: 400 });
		}
		if (!userPk) {
			return NextResponse.json({ ok: false, message: "user_pk is required" }, { status: 400 });
		}

		const userExists = await db
			.prepare("SELECT user_pk, writing_locale FROM users WHERE user_pk = ? LIMIT 1")
			.bind(userPk)
			.first<UserExistRow>();
		if (!userExists?.user_pk) {
			return NextResponse.json({ ok: false, message: "user_pk not found" }, { status: 400 });
		}
		const writingLocale = readString(userExists.writing_locale);

		const insertResult = await db
			.prepare(
				`INSERT INTO posts (user_pk, locale, prepare_url, prepare_status, visibility, created_at, updated_at)
         VALUES (?, ?, ?, 'fetch_url', 'prepare', datetime('now'), datetime('now'))`,
			)
			.bind(userPk, writingLocale, prepareUrl)
			.run();

		return NextResponse.json({
			ok: true,
			post_id: insertResult.meta?.last_row_id ?? null,
			user_pk: userPk,
			locale: writingLocale,
			prepare_url: prepareUrl,
			prepare_status: "fetch_url",
			visibility: "prepare",
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "Failed to create prepare post" },
			{ status: 500 },
		);
	}
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

		const body = (await request.json().catch(() => null)) as UpdatePrepareRequestBody | null;
		const postUrl = readString(body?.post_url);
		const directPostSlug = readString(body?.post_slug);
		const postSlug = directPostSlug ?? (postUrl ? extractPostUidFromUrl(postUrl) : null);
		if (postUrl && !postSlug) {
			return NextResponse.json({ ok: false, message: "invalid post_url" }, { status: 400 });
		}

		if (postSlug) {
			const postRow = await db
				.prepare("SELECT post_id, post_slug FROM posts WHERE post_slug = ? LIMIT 1")
				.bind(postSlug)
				.first<{ post_id: number; post_slug: string | null }>();

			if (!postRow?.post_id) {
				return NextResponse.json({ ok: false, message: `post not found for uid ${postSlug}` }, { status: 404 });
			}

			const updateResult = await db
				.prepare("UPDATE posts SET visibility = 'private', updated_at = datetime('now') WHERE post_id = ?")
				.bind(postRow.post_id)
				.run();
			if ((updateResult.meta?.changes ?? 0) < 1) {
				return NextResponse.json({ ok: false, message: "failed to update visibility", post_id: postRow.post_id }, { status: 409 });
			}

			return NextResponse.json({
				ok: true,
				post_id: postRow.post_id,
				post_slug: postRow.post_slug,
				visibility: "private",
			});
		}

		const postId = parseBodyPostId(body?.post_id);
		const nextStatus = readString(body?.prepare_status);
		const validStatuses = PREPARE_STATUS_OPTIONS as readonly string[];
		if (!postId) {
			return NextResponse.json({ ok: false, message: "invalid post_id" }, { status: 400 });
		}
		if (!nextStatus || !validStatuses.includes(nextStatus)) {
			return NextResponse.json({ ok: false, message: "invalid prepare_status", post_id: postId }, { status: 400 });
		}

		const updateResult = await db
			.prepare(
				`UPDATE posts
				    SET prepare_status = ?,
				        updated_at = datetime('now')
				  WHERE post_id = ?
				    AND visibility = 'prepare'`,
			)
			.bind(nextStatus as PrepareStatusOption, postId)
			.run();
		if ((updateResult.meta?.changes ?? 0) < 1) {
			return NextResponse.json({ ok: false, message: "post not found in prepare visibility", post_id: postId }, { status: 404 });
		}

		return NextResponse.json({
			ok: true,
			post_id: postId,
			prepare_status: nextStatus,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to update prepare post",
			},
			{ status: 500 },
		);
	}
}

export async function GET(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const authError = await assertAdmin(request, bindings, db);
		if (authError) return authError;

		const requestUrl = new URL(request.url);
		const page = toPositiveInt(requestUrl.searchParams.get("page"), 1);
		const limit = Math.min(toPositiveInt(requestUrl.searchParams.get("limit"), 20), 100);
		const offset = (page - 1) * limit;
		const includeDoneRaw = readString(requestUrl.searchParams.get("include_done"))?.toLowerCase() ?? "";
		const includeDone = includeDoneRaw === "1" || includeDoneRaw === "true" || includeDoneRaw === "yes";

		const whereClause = includeDone
			? "p.visibility = 'prepare'"
			: `
      p.visibility = 'prepare'
      AND COALESCE(p.prepare_status, '') <> 'prepare_content_batch_done'
    `;

		const totalRow = await db
			.prepare(`SELECT COUNT(1) AS total FROM posts p WHERE ${whereClause}`)
			.first<{ total: number }>();
		const total = totalRow?.total ?? 0;

		const rows = await db
			.prepare(
				`SELECT
            p.post_id,
            p.user_pk,
            p.post_slug,
            p.title,
            p.prepare_status,
            p.visibility,
            p.prepare_content,
            p.prepare_url,
            p.prepare_plan,
            p.prepare_mode,
            p.created_at,
            p.updated_at,
            u.name AS author_name,
            u.user_id AS author_handle
          FROM posts p
          LEFT JOIN users u ON u.user_pk = p.user_pk
          WHERE ${whereClause}
          ORDER BY p.post_id DESC
          LIMIT ? OFFSET ?`,
			)
			.bind(limit, offset)
			.all<PreparePostRow>();

		const posts = rows.results ?? [];
		const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
		const hasMore = offset + posts.length < total;

			return NextResponse.json({
				ok: true,
				posts,
				paging: {
					page,
					limit,
					total,
					total_pages: totalPages,
					has_more: hasMore,
					next_page: hasMore ? page + 1 : null,
				},
				filters: {
					include_done: includeDone,
				},
			});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "Failed to load prepare posts" },
			{ status: 500 },
		);
	}
}
