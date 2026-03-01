import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

type DbBindings = CloudflareEnv & { DB?: D1Database; JWT_SECRET?: string };

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function hasTable(db: D1Database, tableName: string): Promise<boolean> {
	const row = await db
		.prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
		.bind(tableName)
		.first<{ present: number }>();
	return Boolean(row?.present);
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

async function getSaveCount(db: D1Database, postId: number): Promise<number> {
	const row = await db
		.prepare("SELECT COUNT(1) AS cnt FROM post_saves WHERE post_id = ?")
		.bind(postId)
		.first<{ cnt: number }>();
	return row?.cnt ?? 0;
}

export async function POST(req: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });

		const saveTableAvailable = await hasTable(db, "post_saves");
		if (!saveTableAvailable) {
			return NextResponse.json({ ok: false, message: "post_saves table unavailable" }, { status: 500 });
		}

		const userPk = await resolveUserPk(req, bindings);
		if (!userPk) return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });

		const body = (await req.json().catch(() => null)) as { postId?: number } | null;
		const postId = typeof body?.postId === "number" ? body.postId : NaN;
		if (!Number.isFinite(postId) || postId <= 0) {
			return NextResponse.json({ ok: false, message: "invalid postId" }, { status: 400 });
		}

		await db
			.prepare("INSERT OR IGNORE INTO post_saves (post_id, user_pk) VALUES (?, ?)")
			.bind(postId, userPk)
			.run();
		const saveCount = await getSaveCount(db, postId);
		return NextResponse.json({ ok: true, saved: true, saveCount });
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "Failed to save post" },
			{ status: 500 },
		);
	}
}

export async function DELETE(req: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });

		const saveTableAvailable = await hasTable(db, "post_saves");
		if (!saveTableAvailable) {
			return NextResponse.json({ ok: false, message: "post_saves table unavailable" }, { status: 500 });
		}

		const userPk = await resolveUserPk(req, bindings);
		if (!userPk) return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });

		const body = (await req.json().catch(() => null)) as { postId?: number } | null;
		const postId = typeof body?.postId === "number" ? body.postId : NaN;
		if (!Number.isFinite(postId) || postId <= 0) {
			return NextResponse.json({ ok: false, message: "invalid postId" }, { status: 400 });
		}

		await db
			.prepare("DELETE FROM post_saves WHERE post_id = ? AND user_pk = ?")
			.bind(postId, userPk)
			.run();
		const saveCount = await getSaveCount(db, postId);
		return NextResponse.json({ ok: true, saved: false, saveCount });
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "Failed to unsave post" },
			{ status: 500 },
		);
	}
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
