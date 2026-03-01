import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

type DbBindings = CloudflareEnv & { DB?: D1Database; JWT_SECRET?: string };

type UserRow = { user_pk: number; user_id: string | null };

function json(data: unknown, status = 200) {
	return NextResponse.json(data, { status });
}

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function resolveUser(
	req: Request,
	db: D1Database,
	env: DbBindings,
): Promise<UserRow | null> {
	const session = await getServerSession(authOptions);
	const email = session?.user?.email?.toLowerCase();
	if (email) {
		const row = await db
			.prepare("SELECT user_pk, user_id FROM users WHERE lower(email) = ? LIMIT 1")
			.bind(email)
			.first<UserRow>();
		if (row?.user_pk) return row;
	}

	const auth = req.headers.get("authorization") || "";
	if (!auth.toLowerCase().startsWith("bearer ")) return null;

	const token = auth.slice(7).trim();
	const jwtSecret = readString(env.JWT_SECRET) ?? readString(process.env.JWT_SECRET);
	if (!token || !jwtSecret) return null;

	try {
		const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret), {
			algorithms: ["HS256"],
			clockTolerance: "120s",
		});
		const tokenEmail = readString(payload.email)?.toLowerCase();
		const jti = readString(payload.jti);
		if (!tokenEmail || !jti) return null;

		return await db
			.prepare(
				`SELECT u.user_pk, u.user_id
           FROM user_sessions us
           JOIN users u ON u.user_pk = us.user_pk
          WHERE us.session_token = ?
            AND us.expires_at > datetime('now')
            AND lower(u.email) = ?
          LIMIT 1`,
			)
			.bind(jti, tokenEmail)
			.first<UserRow>();
	} catch {
		return null;
	}
}

export async function GET(req: Request) {
	const { env } = await getCloudflareContext({ async: true });
	const db = (env as DbBindings).DB;
	if (!db) return json({ ok: false, message: "DB unavailable" }, 500);

	const user = await resolveUser(req, db, env as DbBindings);
	if (!user) return json({ ok: false, message: "unauthorized" }, 401);

	const rows = await db
		.prepare(
			`SELECT c.convo_id,
              c.convo_type,
              c.listing_pk,
              c.title,
              c.updated_at,
              NULL AS listing_id,
              c.title AS listing_title,
              (
                SELECT u.avatar_url
                  FROM chat_participants cp
                  JOIN users u ON u.user_pk = cp.user_pk
                 WHERE cp.convo_id = c.convo_id
                   AND cp.user_pk != ?
                 LIMIT 1
              ) AS avatar_url,
              (
                SELECT u.name
                  FROM chat_participants cp
                  JOIN users u ON u.user_pk = cp.user_pk
                 WHERE cp.convo_id = c.convo_id
                   AND cp.user_pk != ?
                 LIMIT 1
              ) AS peer_name,
              (
                SELECT u.user_id
                  FROM chat_participants cp
                  JOIN users u ON u.user_pk = cp.user_pk
                 WHERE cp.convo_id = c.convo_id
                   AND cp.user_pk != ?
                 LIMIT 1
              ) AS peer_user_id,
              (
                SELECT body FROM chat_messages m
                 WHERE m.convo_id = c.convo_id
                 ORDER BY m.message_id DESC
                 LIMIT 1
              ) AS last_body,
              (
                SELECT created_at FROM chat_messages m
                 WHERE m.convo_id = c.convo_id
                 ORDER BY m.message_id DESC
                 LIMIT 1
              ) AS last_created_at,
              (
                SELECT sender_pk FROM chat_messages m
                 WHERE m.convo_id = c.convo_id
                 ORDER BY m.message_id DESC
                 LIMIT 1
              ) AS last_sender_pk
         FROM chat_conversations c
         JOIN chat_participants p ON p.convo_id = c.convo_id
        WHERE p.user_pk = ?
        ORDER BY COALESCE(last_created_at, c.updated_at) DESC`,
		)
		.bind(user.user_pk, user.user_pk, user.user_pk, user.user_pk)
		.all<{
			convo_id: string;
			convo_type: string | null;
			listing_pk: number | null;
			title: string | null;
			updated_at: string | null;
			listing_id: string | null;
			listing_title: string | null;
			avatar_url: string | null;
			peer_name: string | null;
			peer_user_id: string | null;
			last_body: string | null;
			last_created_at: string | null;
			last_sender_pk: number | null;
		}>();

	const rooms = (rows.results ?? []).map((row) => ({
		...row,
		peerName: row.peer_name ?? null,
		peerUserId: row.peer_user_id ?? null,
	}));

	return json({
		ok: true,
		userPk: user.user_pk,
		userId: user.user_id,
		rooms,
	});
}
