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

type UpdateIgRefBody = {
	post_id?: unknown;
	ig_ref?: unknown;
};

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseBodyPostId(value: unknown): number | null {
	const raw = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
	if (!Number.isFinite(raw) || raw <= 0) return null;
	return Math.floor(raw);
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

		const body = (await request.json().catch(() => null)) as UpdateIgRefBody | null;
		const postId = parseBodyPostId(body?.post_id);
		const igRef = readString(body?.ig_ref);

		if (!postId) {
			return NextResponse.json({ ok: false, message: "post_id is required" }, { status: 400 });
		}
		if (!igRef) {
			return NextResponse.json({ ok: false, message: "ig_ref is required" }, { status: 400 });
		}

		const updateResult = await db
			.prepare(
				`UPDATE posts
				    SET ig_ref = ?,
				        updated_at = datetime('now')
				  WHERE post_id = ?`,
			)
			.bind(igRef, postId)
			.run();

		if ((updateResult.meta?.changes ?? 0) < 1) {
			return NextResponse.json({ ok: false, message: "post not found", post_id: postId }, { status: 404 });
		}

		return NextResponse.json({
			ok: true,
			post_id: postId,
			ig_ref: igRef,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to update ig_ref",
			},
			{ status: 500 },
		);
	}
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}

