import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jwtVerify } from "jose";
import { authOptions } from "@/lib/auth-options";

type DbBindings = CloudflareEnv & { DB?: D1Database; JWT_SECRET?: string };

async function resolveUserPk(req: Request, env: DbBindings): Promise<number | null> {
	// 1) Cookie session
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

	// 2) Bearer HS256
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

	// 3) Dev
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
	const { env } = await getCloudflareContext({ async: true });
	const db = (env as DbBindings).DB;
	if (!db) return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });

	const url = new URL(req.url);
	const postId = Number(url.searchParams.get("postId"));
	if (!Number.isFinite(postId) || postId <= 0) return NextResponse.json({ ok: false, message: "missing postId" }, { status: 400 });

	const rows = await db
		.prepare(
			`SELECT c.comment_id,
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
			  WHERE c.post_id = ?
			  ORDER BY c.created_at ASC`
		)
		.bind(postId)
		.all();

	return NextResponse.json({ ok: true, comments: rows.results ?? [] });
}

export async function POST(req: Request) {
	const { env } = await getCloudflareContext({ async: true });
	const bindings = env as DbBindings;
	const db = bindings.DB;
	if (!db) return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });

	const userPk = await resolveUserPk(req, bindings);
	if (!userPk) return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });

	const body = (await req.json().catch(() => null)) as { postId?: number; text?: string; replyTo?: number | null } | null;
	const postId = typeof body?.postId === "number" ? body.postId : NaN;
	const text = typeof body?.text === "string" ? body.text.trim() : "";
	const replyTo = typeof body?.replyTo === "number" ? body.replyTo : null;
	if (!Number.isFinite(postId) || postId <= 0 || !text) return NextResponse.json({ ok: false, message: "invalid input" }, { status: 400 });

	const insert = await db
		.prepare("INSERT INTO post_comments (post_id, user_pk, body, reply_to_comment_id) VALUES (?, ?, ?, ?)")
		.bind(postId, userPk, text, replyTo)
		.run();

	const commentId = insert.meta?.last_row_id ?? null;
	if (!commentId) return NextResponse.json({ ok: false, message: "comment id missing" }, { status: 500 });

	// bump comment_count
	await db.prepare("UPDATE posts SET comment_count = COALESCE(comment_count,0) + 1 WHERE post_id = ?").bind(postId).run().catch(() => {});

	const row = await db
		.prepare(
			`SELECT c.comment_id,
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
			  WHERE c.comment_id = ?
			  LIMIT 1`
		)
		.bind(commentId)
		.first();

	return NextResponse.json({ ok: true, comment: row });
}

export function PUT() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
