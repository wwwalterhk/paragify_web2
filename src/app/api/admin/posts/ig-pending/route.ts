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

type IgPendingPostRow = {
	post_id: number;
	locale: string | null;
	prepare_content: string | null;
};

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toPositiveInt(value: string | null, fallback: number): number {
	if (!value) return fallback;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.floor(parsed);
}

async function resolveEmail(req: Request, env: DbBindings, db: D1Database): Promise<string | null> {
	try {
		const session = await getServerSession(authOptions);
		const email = readString(session?.user?.email);
		if (email) return email.toLowerCase();
	} catch {
		// Ignore session errors and fallback to bearer token.
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

		const requestUrl = new URL(request.url);
		const page = toPositiveInt(requestUrl.searchParams.get("page"), 1);
		const limit = Math.min(toPositiveInt(requestUrl.searchParams.get("limit"), 20), 100);
		const offset = (page - 1) * limit;

		const whereClause = `
      p.ig_ref IS NULL
      AND p.visibility = 'public'
    `;

		const totalRow = await db
			.prepare(`SELECT COUNT(1) AS total FROM posts p WHERE ${whereClause}`)
			.first<{ total: number }>();
		const total = totalRow?.total ?? 0;

		const postsResult = await db
			.prepare(
				`SELECT
            p.post_id,
            p.locale,
            p.prepare_content
          FROM posts p
          WHERE ${whereClause}
          ORDER BY p.post_id DESC
          LIMIT ? OFFSET ?`,
			)
			.bind(limit, offset)
			.all<IgPendingPostRow>();

		const posts = postsResult.results ?? [];
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
				ig_ref: "NULL",
				visibility: "public",
			},
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to load IG pending posts",
			},
			{ status: 500 },
		);
	}
}
