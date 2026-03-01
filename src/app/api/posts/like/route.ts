import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jwtVerify } from "jose";
import { authOptions } from "@/lib/auth-options";

type DbBindings = CloudflareEnv & { DB?: D1Database; JWT_SECRET?: string };

async function resolveUserPk(req: Request, env: DbBindings): Promise<number | null> {
	try {
		const session = await getServerSession(authOptions);
		const email = session?.user?.email?.toLowerCase();
		if (email && env.DB) {
			const row = await env.DB.prepare("SELECT user_pk FROM users WHERE lower(email)=? LIMIT 1").bind(email).first<{ user_pk: number }>();
			if (row?.user_pk) return row.user_pk;
		}
	} catch {
		// ignore
	}

	const auth = req.headers.get("authorization") || "";
	if (auth.toLowerCase().startsWith("bearer ")) {
		const token = auth.slice(7).trim();
		const secret = env.JWT_SECRET;
		if (secret) {
			try {
				const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"], clockTolerance: "120s" });
				const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
				const jti = typeof payload.jti === "string" ? payload.jti : null;
				if (email && jti && env.DB) {
					const row = await env.DB.prepare(
						`SELECT us.user_pk
             FROM user_sessions us
             JOIN users u ON u.user_pk = us.user_pk
            WHERE us.session_token=? AND us.expires_at > datetime('now') AND lower(u.email)=?
            LIMIT 1`
					)
						.bind(jti, email)
						.first<{ user_pk: number }>();
					if (row?.user_pk) return row.user_pk;
				}
			} catch {
				// ignore
			}
		}
	}
	return null;
}

async function changeLike(db: D1Database, postId: number, userPk: number, like: boolean) {
	if (like) {
		const insert = await db
			.prepare("INSERT OR IGNORE INTO post_likes (post_id, user_pk) VALUES (?, ?)")
			.bind(postId, userPk)
			.run();
		if ((insert.meta?.changes ?? 0) > 0) {
			await db.prepare("UPDATE posts SET like_count = like_count + 1 WHERE post_id = ?").bind(postId).run();
			return true;
		}
		return false;
	}

	const del = await db.prepare("DELETE FROM post_likes WHERE post_id = ? AND user_pk = ?").bind(postId, userPk).run();
	if ((del.meta?.changes ?? 0) > 0) {
		await db.prepare("UPDATE posts SET like_count = MAX(like_count - 1, 0) WHERE post_id = ?").bind(postId).run();
		return true;
	}
	return false;
}

export async function POST(req: Request) {
	const { env } = await getCloudflareContext({ async: true });
	const bindings = env as DbBindings;
	const db = bindings.DB;
	if (!db) return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });

	const userPk = await resolveUserPk(req, bindings);
	if (!userPk) return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });

	const body = (await req.json().catch(() => null)) as { postId?: number } | null;
	const postId = typeof body?.postId === "number" ? body.postId : NaN;
	if (!Number.isFinite(postId) || postId <= 0) return NextResponse.json({ ok: false, message: "invalid postId" }, { status: 400 });

	await changeLike(db, postId, userPk, true);

	const row = await db
		.prepare("SELECT like_count, EXISTS (SELECT 1 FROM post_likes WHERE post_id=? AND user_pk=?) AS liked FROM posts WHERE post_id=?")
		.bind(postId, userPk, postId)
		.first<{ like_count: number; liked: number }>();

	return NextResponse.json({ ok: true, likeCount: row?.like_count ?? null, liked: Boolean(row?.liked) });
}

export async function DELETE(req: Request) {
	const { env } = await getCloudflareContext({ async: true });
	const bindings = env as DbBindings;
	const db = bindings.DB;
	if (!db) return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });

	const userPk = await resolveUserPk(req, bindings);
	if (!userPk) return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });

	const body = (await req.json().catch(() => null)) as { postId?: number } | null;
	const postId = typeof body?.postId === "number" ? body.postId : NaN;
	if (!Number.isFinite(postId) || postId <= 0) return NextResponse.json({ ok: false, message: "invalid postId" }, { status: 400 });

	await changeLike(db, postId, userPk, false);

	const row = await db
		.prepare("SELECT like_count, EXISTS (SELECT 1 FROM post_likes WHERE post_id=? AND user_pk=?) AS liked FROM posts WHERE post_id=?")
		.bind(postId, userPk, postId)
		.first<{ like_count: number; liked: number }>();

	return NextResponse.json({ ok: true, likeCount: row?.like_count ?? null, liked: Boolean(row?.liked) });
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
