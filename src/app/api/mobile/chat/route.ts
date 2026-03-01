import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

type DbBindings = CloudflareEnv & { DB?: D1Database; JWT_SECRET?: string };

type PeerRow = { user_pk: number; user_id: string; name: string | null };

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function resolveUserPk(req: Request, env: DbBindings): Promise<number | null> {
	const db = env.DB;
	if (!db) return null;

	const session = await getServerSession(authOptions);
	const email = session?.user?.email?.toLowerCase();
	if (email) {
		const row = await db
			.prepare("SELECT user_pk FROM users WHERE lower(email) = ? LIMIT 1")
			.bind(email)
			.first<{ user_pk: number }>();
		if (row?.user_pk) return row.user_pk;
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

		const row = await db
			.prepare(
				`SELECT us.user_pk
           FROM user_sessions us
           JOIN users u ON u.user_pk = us.user_pk
          WHERE us.session_token = ?
            AND us.expires_at > datetime('now')
            AND lower(u.email) = ?
          LIMIT 1`,
			)
			.bind(jti, tokenEmail)
			.first<{ user_pk: number }>();
		if (row?.user_pk) return row.user_pk;
	} catch {
		return null;
	}

	return null;
}

export async function POST(req: Request) {
	const { env } = await getCloudflareContext({ async: true });
	const bindings = env as DbBindings;
	const db = bindings.DB;
	if (!db) return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });

	const viewerPk = await resolveUserPk(req, bindings);
	if (!viewerPk) return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });

	const body = (await req.json().catch(() => null)) as { action?: unknown; user_id?: unknown } | null;
	const action = readString(body?.action);
	const peerUserIdRaw = readString(body?.user_id);
	const normalizedPeerUserId = peerUserIdRaw?.toLowerCase() ?? null;

	if (action !== "direct") {
		return NextResponse.json({ ok: false, message: "unsupported action" }, { status: 400 });
	}
	if (!normalizedPeerUserId) {
		return NextResponse.json({ ok: false, message: "missing user_id" }, { status: 400 });
	}

	let peer = await db
		.prepare("SELECT user_pk, user_id, name FROM users WHERE lower(user_id) = ? LIMIT 1")
		.bind(normalizedPeerUserId)
		.first<PeerRow>();

	if (!peer?.user_pk) {
		peer = await db
			.prepare(
				`SELECT u.user_pk, u.user_id, u.name
           FROM user_id_history h
           JOIN users u ON u.user_pk = h.user_pk
          WHERE lower(h.old_user_id) = ?
             OR lower(h.new_user_id) = ?
          ORDER BY h.created_at DESC
          LIMIT 1`,
			)
			.bind(normalizedPeerUserId, normalizedPeerUserId)
			.first<PeerRow>();
	}

	if (!peer?.user_pk) {
		return NextResponse.json({ ok: false, message: "peer not found" }, { status: 404 });
	}
	if (peer.user_pk === viewerPk) {
		return NextResponse.json({ ok: false, message: "cannot chat with yourself" }, { status: 400 });
	}

	const existing = await db
		.prepare(
			`SELECT c.convo_id
         FROM chat_conversations c
         WHERE c.convo_type = 'direct'
           AND EXISTS (SELECT 1 FROM chat_participants p WHERE p.convo_id = c.convo_id AND p.user_pk = ?)
           AND EXISTS (SELECT 1 FROM chat_participants p2 WHERE p2.convo_id = c.convo_id AND p2.user_pk = ?)
         LIMIT 1`,
		)
		.bind(viewerPk, peer.user_pk)
		.first<{ convo_id: string }>();

	let convoId = existing?.convo_id ?? null;
	if (!convoId) {
		convoId = crypto.randomUUID();
		await db
			.prepare(
				"INSERT INTO chat_conversations (convo_id, convo_type, created_by, title) VALUES (?, 'direct', ?, NULL)",
			)
			.bind(convoId, viewerPk)
			.run();
		await db
			.prepare("INSERT OR IGNORE INTO chat_participants (convo_id, user_pk, role) VALUES (?, ?, 'member')")
			.bind(convoId, viewerPk)
			.run();
		await db
			.prepare("INSERT OR IGNORE INTO chat_participants (convo_id, user_pk, role) VALUES (?, ?, 'member')")
			.bind(convoId, peer.user_pk)
			.run();
	}

	return NextResponse.json({
		ok: true,
		convoId,
		peerPk: peer.user_pk,
		peerUserId: peer.user_id,
		peerName: peer.name ?? null,
	});
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
