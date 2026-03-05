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
	visibility: string | null;
	refine_prepare_content: number | null;
};

type UpdateRefinePrepareContentBody = {
	post_id?: unknown;
	refine_prepare_content?: unknown;
};

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseBodyPostId(value: unknown): number | null {
	const raw = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
	if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw <= 0) return null;
	return raw;
}

function parseBodyInteger(value: unknown): number | null {
	const raw = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
	if (!Number.isFinite(raw) || !Number.isInteger(raw)) return null;
	return raw;
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

		const body = (await request.json().catch(() => null)) as UpdateRefinePrepareContentBody | null;
		const postId = parseBodyPostId(body?.post_id);
		const refinePrepareContent = parseBodyInteger(body?.refine_prepare_content);

		if (!postId) {
			return NextResponse.json({ ok: false, message: "post_id is required" }, { status: 400 });
		}
		if (refinePrepareContent === null) {
			return NextResponse.json({ ok: false, message: "refine_prepare_content is required and must be an integer" }, { status: 400 });
		}

		const post = await db
			.prepare("SELECT post_id, visibility, refine_prepare_content FROM posts WHERE post_id = ? LIMIT 1")
			.bind(postId)
			.first<PostLookupRow>();
		if (!post?.post_id) {
			return NextResponse.json({ ok: false, message: "post not found", post_id: postId }, { status: 404 });
		}
		if ((post.visibility ?? "").toLowerCase() !== "prepare") {
			return NextResponse.json(
				{ ok: false, message: "post visibility must be 'prepare'", post_id: postId, visibility: post.visibility ?? null },
				{ status: 409 },
			);
		}

		if ((post.refine_prepare_content ?? 0) !== refinePrepareContent) {
			const updateResult = await db
				.prepare(
					`UPDATE posts
					    SET refine_prepare_content = ?,
					        updated_at = datetime('now')
					  WHERE post_id = ?
					    AND visibility = 'prepare'`,
				)
				.bind(refinePrepareContent, postId)
				.run();

			if ((updateResult.meta?.changes ?? 0) < 1) {
				return NextResponse.json({ ok: false, message: "failed to update refine_prepare_content", post_id: postId }, { status: 409 });
			}
		}

		return NextResponse.json({
			ok: true,
			post_id: postId,
			refine_prepare_content: refinePrepareContent,
			visibility: "prepare",
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to update refine_prepare_content",
			},
			{ status: 500 },
		);
	}
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
