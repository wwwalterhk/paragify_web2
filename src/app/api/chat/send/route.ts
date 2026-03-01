import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jwtVerify } from "jose";
import { authOptions } from "@/lib/auth-options";

type DbBindings = CloudflareEnv & { DB?: D1Database; JWT_SECRET?: string };

type SendAttachmentInput = {
	url?: unknown;
	mimeType?: unknown;
	mime_type?: unknown;
	width?: unknown;
	height?: unknown;
	size?: unknown;
	size_bytes?: unknown;
};

type SendRequestBody = {
	convo_id?: unknown;
	convoId?: unknown;
	text?: unknown;
	reply_message_id?: unknown;
	replyMessageId?: unknown;
	attachments?: unknown;
	clientTempId?: unknown;
};

type ViewerRow = { user_pk: number };

type ParsedAttachment = {
	url: string;
	mimeType: string | null;
	width: number | null;
	height: number | null;
	size: number | null;
};

const CDN_BASE = "https://cdn.paragify.com";

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const numeric = Number(value.trim());
		return Number.isFinite(numeric) ? numeric : null;
	}
	return null;
}

function normalizeAttachmentUrl(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return "";

	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		try {
			const parsed = new URL(trimmed);
			if (parsed.hostname === new URL(CDN_BASE).hostname) {
				return `${parsed.pathname}${parsed.search}`;
			}
			return trimmed;
		} catch {
			return trimmed;
		}
	}

	if (trimmed.startsWith("/")) return trimmed;
	return `/${trimmed}`;
}

function parseAttachments(value: unknown): ParsedAttachment[] {
	if (!Array.isArray(value)) return [];
	return value
		.map((raw) => {
			const attachment = raw as SendAttachmentInput;
			const url = readString(attachment?.url);
			if (!url) return null;
			const mimeType = readString(attachment?.mimeType) ?? readString(attachment?.mime_type);
			const width = readNumber(attachment?.width);
			const height = readNumber(attachment?.height);
			const size = readNumber(attachment?.size) ?? readNumber(attachment?.size_bytes);
			return {
				url: normalizeAttachmentUrl(url),
				mimeType,
				width,
				height,
				size,
			} satisfies ParsedAttachment;
		})
		.filter((value): value is ParsedAttachment => Boolean(value?.url));
}

async function resolveViewer(req: Request, db: D1Database, env: DbBindings): Promise<ViewerRow | null> {
	const session = await getServerSession(authOptions);
	const email = session?.user?.email?.toLowerCase();
	if (email) {
		const viewer = await db
			.prepare("SELECT user_pk FROM users WHERE lower(email) = ? LIMIT 1")
			.bind(email)
			.first<ViewerRow>();
		if (viewer?.user_pk) return viewer;
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
				`SELECT us.user_pk
           FROM user_sessions us
           JOIN users u ON u.user_pk = us.user_pk
          WHERE us.session_token = ?
            AND us.expires_at > datetime('now')
            AND lower(u.email) = ?
          LIMIT 1`,
			)
			.bind(jti, tokenEmail)
			.first<ViewerRow>();
	} catch {
		return null;
	}
}

export async function POST(req: Request) {
	const { env } = await getCloudflareContext({ async: true });
	const db = (env as DbBindings).DB;
	if (!db) return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });

	const body = (await req.json().catch(() => null)) as SendRequestBody | null;
	const convoIdInput = readString(body?.convo_id) ?? readString(body?.convoId);
	const text = readString(body?.text) ?? "";
	const replyMessageId =
		readNumber(body?.reply_message_id) ?? readNumber(body?.replyMessageId);
	const attachments = parseAttachments(body?.attachments);
	const clientTempId = readString(body?.clientTempId);

	if (!convoIdInput) {
		return NextResponse.json({ ok: false, message: "missing convo_id" }, { status: 400 });
	}
	if (!text && attachments.length === 0) {
		return NextResponse.json({ ok: false, message: "missing text or attachments" }, { status: 400 });
	}

	const viewer = await resolveViewer(req, db, env as DbBindings);
	if (!viewer?.user_pk) return NextResponse.json({ ok: false, message: "user not found" }, { status: 404 });

	const convoId = convoIdInput;

	const participant = await db
		.prepare("SELECT 1 FROM chat_participants WHERE convo_id = ? AND user_pk = ? LIMIT 1")
		.bind(convoId, viewer.user_pk)
		.first<{ 1: number }>();
	if (!participant) {
		return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
	}

	const insert = await db
		.prepare(
			"INSERT INTO chat_messages (convo_id, sender_pk, msg_type, body, reply_message_id) VALUES (?, ?, 'text', ?, ?)",
		)
		.bind(convoId, viewer.user_pk, text || null, replyMessageId ?? null)
		.run();

	const messageId = insert.meta?.last_row_id;
	if (!messageId) return NextResponse.json({ ok: false, message: "insert_failed" }, { status: 500 });

	if (attachments.length) {
		for (const attachment of attachments) {
			await db
				.prepare(
					`INSERT INTO chat_message_attachments (message_id, url, mime_type, size_bytes, width, height)
           VALUES (?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					messageId,
					attachment.url,
					attachment.mimeType,
					attachment.size,
					attachment.width,
					attachment.height,
				)
				.run();
		}
	}

	await db
		.prepare("UPDATE chat_conversations SET updated_at = datetime('now') WHERE convo_id = ?")
		.bind(convoId)
		.run()
		.catch(() => {
			// ignore timestamp update errors
		});

	return NextResponse.json({
		ok: true,
		convoId,
		messageId,
		clientTempId: clientTempId ?? undefined,
		message: {
			id: messageId,
			convoId,
			senderPk: viewer.user_pk,
			body: text || "",
			replyMessageId: replyMessageId ?? null,
			attachments,
			createdAt: new Date().toISOString(),
		},
	});
}
