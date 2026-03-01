import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { decodeProtectedHeader, jwtVerify } from "jose";
import { authOptions } from "@/lib/auth-options";

type DbBindings = CloudflareEnv & { DB?: D1Database; JWT_SECRET?: string };
const CDN_BASE = "https://cdn.paragify.com";
const CDN_IMAGE_BASE = "https://cdn.paragify.com/cdn-cgi/image/width=768,quality=75,format=auto";

export async function POST(req: Request) {
	const { env } = await getCloudflareContext({ async: true });
	const db = (env as DbBindings).DB;
	if (!db) return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });

	const body = (await req.json().catch(() => null)) as {
		convo_id?: string;
		since_message_id?: number | string;
		action?: string;
	} | null;
	const convoIdParam = body?.convo_id?.trim() || null;
	const action = typeof body?.action === "string" ? body.action.trim() : null;
	const sinceMessageIdRaw = body?.since_message_id;
	const sinceMessageId =
		typeof sinceMessageIdRaw === "number"
			? sinceMessageIdRaw
			: typeof sinceMessageIdRaw === "string" && /^\d+$/.test(sinceMessageIdRaw.trim())
				? Number(sinceMessageIdRaw.trim())
				: null;
	if (action !== "all-room" && !convoIdParam) {
		return NextResponse.json({ ok: false, message: "missing convo_id" }, { status: 400 });
	}

	let viewer: { user_pk: number; user_id: string | null } | null = null;

	// 1) Cookie session (web)
	const session = await getServerSession(authOptions);
	const email = session?.user?.email?.toLowerCase();
	if (email) {
		viewer = await db
			.prepare("SELECT user_pk, user_id FROM users WHERE lower(email) = ? LIMIT 1")
			.bind(email)
			.first<{ user_pk: number; user_id: string | null }>();
	}

	// 2) Bearer HS256 (mobile)
	if (!viewer) {
		const auth = req.headers.get("authorization") || "";
		if (auth.toLowerCase().startsWith("bearer ")) {
			const token = auth.slice(7).trim();
			viewer = await resolveUserFromHsToken(token, db, env as DbBindings);
		}
	}

	if (!viewer?.user_pk) return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });

	// Action: return all rooms with messages newer than since_message_id
	if (action === "all-room") {
		if (sinceMessageId == null) return NextResponse.json({ ok: false, message: "missing since_message_id" }, { status: 400 });

		const convoRows = await db
			.prepare(
				`SELECT c.convo_id,
				        c.listing_pk,
				        c.title,
				        c.created_by AS owner_pk
				   FROM chat_conversations c
				   JOIN chat_participants p ON p.convo_id = c.convo_id
				  WHERE p.user_pk = ?`
			)
			.bind(viewer.user_pk)
			.all<{ convo_id: string; listing_pk: number | null; title: string | null; owner_pk: number | null }>();

		const rooms = [];
		for (const row of convoRows.results ?? []) {
			const participantMeta = await fetchParticipantMeta(db, row.convo_id, viewer.user_pk);

			const messages = await fetchMessagesWithAttachments(db, row.convo_id, sinceMessageId);

			rooms.push({
				convoId: row.convo_id,
				currentUserPk: viewer.user_pk,
				currentUserId: viewer.user_id || `user-${viewer.user_pk}`,
				listingPk: row.listing_pk ?? null,
				listingTitle: row.title ?? null,
				listingOwnerPk: row.owner_pk ?? null,
				participantPks: participantMeta.participantPks,
				latestMyReceivedMessageId: participantMeta.latestMyReceivedMessageId,
				latestMyReadMessageId: participantMeta.latestMyReadMessageId,
				latestPeerReceivedMessageId: participantMeta.latestPeerReceivedMessageId,
				latestPeerReadMessageId: participantMeta.latestPeerReadMessageId,
				messages,
			});
		}

		return NextResponse.json({ ok: true, rooms });
	}

	let listingPk: number | null = null;
	let listingTitle: string | null = null;
	let listingOwnerPk: number | null = null;
	let convoId = convoIdParam;
	let participantPks: number[] = [];
	let latestMyReceivedMessageId: number | null = null;
	let latestMyReadMessageId: number | null = null;
	let latestPeerReceivedMessageId: number | null = null;
	let latestPeerReadMessageId: number | null = null;

	if (!convoId) return NextResponse.json({ ok: false, message: "missing convo_id" }, { status: 400 });

	const convoRow = await db
		.prepare(
			`SELECT c.convo_id, c.listing_pk, c.title, c.created_by
         FROM chat_conversations c
         JOIN chat_participants p ON p.convo_id = c.convo_id
        WHERE c.convo_id = ? AND p.user_pk = ?
        LIMIT 1`
		)
		.bind(convoId, viewer.user_pk)
		.first<{ convo_id: string; listing_pk: number | null; title: string | null; created_by: number | null }>();
	if (!convoRow?.convo_id) return NextResponse.json({ ok: false, message: "convo not found" }, { status: 404 });

	convoId = convoRow.convo_id;
	listingPk = convoRow.listing_pk ?? null;
	listingTitle = convoRow.title ?? null;
	listingOwnerPk = convoRow.created_by ?? null;
	const participantMeta = await fetchParticipantMeta(db, convoId, viewer.user_pk);
	participantPks = participantMeta.participantPks;
	latestMyReceivedMessageId = participantMeta.latestMyReceivedMessageId;
	latestMyReadMessageId = participantMeta.latestMyReadMessageId;
	latestPeerReceivedMessageId = participantMeta.latestPeerReceivedMessageId;
	latestPeerReadMessageId = participantMeta.latestPeerReadMessageId;

	const hydratedMessages = await fetchMessagesWithAttachments(db, convoId, sinceMessageId);

	return NextResponse.json({
		ok: true,
		convoId,
		currentUserPk: viewer.user_pk,
		currentUserId: viewer.user_id || `user-${viewer.user_pk}`,
		listingPk,
		listingTitle,
		listingOwnerPk,
		participantPks,
		latestMyReceivedMessageId,
		latestMyReadMessageId,
		latestPeerReceivedMessageId,
		latestPeerReadMessageId,
		messages: hydratedMessages,
	});
}

async function resolveUserFromHsToken(token: string, db: D1Database, env: DbBindings) {
	const alg = getAlg(token);
	if (alg && alg !== "HS256") return null;
	const secret = env.JWT_SECRET;
	if (!secret) return null;
	try {
		const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
			algorithms: ["HS256"],
			clockTolerance: "120s",
		});
		const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
		const jti = typeof payload.jti === "string" ? payload.jti : null;
		if (!email || !jti) return null;
		return db
			.prepare(
				`SELECT us.user_pk, u.user_id
         FROM user_sessions us
         JOIN users u ON us.user_pk = u.user_pk
         WHERE us.session_token = ? AND us.expires_at > datetime('now') AND lower(u.email) = ?
         LIMIT 1`
			)
			.bind(jti, email)
			.first<{ user_pk: number; user_id: string | null }>();
	} catch {
		return null;
	}
}

function getAlg(token: string): string | null {
	try {
		const { alg } = decodeProtectedHeader(token);
		return typeof alg === "string" ? alg : null;
	} catch {
		return null;
	}
}

type ParticipantMeta = {
	participantPks: number[];
	latestMyReceivedMessageId: number | null;
	latestMyReadMessageId: number | null;
	latestPeerReceivedMessageId: number | null;
	latestPeerReadMessageId: number | null;
};

async function fetchParticipantMeta(db: D1Database, convoId: string, viewerPk: number): Promise<ParticipantMeta> {
	type ParticipantRow = {
		user_pk: number;
		last_read_msg_id?: number | null;
		last_rece_msg_id?: number | null;
	};

	let participantRows: ParticipantRow[] = [];

	try {
		const rows = await db
			.prepare("SELECT user_pk, last_read_msg_id, last_rece_msg_id FROM chat_participants WHERE convo_id = ?")
			.bind(convoId)
			.all<ParticipantRow>();
		participantRows = rows.results ?? [];
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error ?? "");
		if (!errorMessage.includes("no such column")) throw error;

		try {
			const rowsWithoutRece = await db
				.prepare("SELECT user_pk, last_read_msg_id FROM chat_participants WHERE convo_id = ?")
				.bind(convoId)
				.all<ParticipantRow>();
			participantRows = (rowsWithoutRece.results ?? []).map((row) => ({
				...row,
				last_rece_msg_id: null,
			}));
		} catch (fallbackError) {
			const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError ?? "");
			if (!fallbackMessage.includes("no such column")) throw fallbackError;

			const minimalRows = await db
				.prepare("SELECT user_pk FROM chat_participants WHERE convo_id = ?")
				.bind(convoId)
				.all<ParticipantRow>();
			participantRows = (minimalRows.results ?? []).map((row) => ({
				...row,
				last_read_msg_id: null,
				last_rece_msg_id: null,
			}));
		}
	}

	const participantPks = participantRows.map((r) => r.user_pk).filter((n) => typeof n === "number");
	let latestMyReceivedMessageId: number | null = null;
	let latestMyReadMessageId: number | null = null;
	let latestPeerReceivedMessageId: number | null = null;
	let latestPeerReadMessageId: number | null = null;

	for (const r of participantRows) {
		if (r.user_pk === viewerPk) {
			latestMyReceivedMessageId = typeof r.last_rece_msg_id === "number" ? r.last_rece_msg_id : null;
			latestMyReadMessageId = typeof r.last_read_msg_id === "number" ? r.last_read_msg_id : null;
		} else {
			// For multiple peers, pick the max message id seen/read
			const peerRece = typeof r.last_rece_msg_id === "number" ? r.last_rece_msg_id : null;
			const peerRead = typeof r.last_read_msg_id === "number" ? r.last_read_msg_id : null;
			if (peerRece != null) latestPeerReceivedMessageId = latestPeerReceivedMessageId == null ? peerRece : Math.max(latestPeerReceivedMessageId, peerRece);
			if (peerRead != null) latestPeerReadMessageId = latestPeerReadMessageId == null ? peerRead : Math.max(latestPeerReadMessageId, peerRead);
		}
	}

	return {
		participantPks,
		latestMyReceivedMessageId,
		latestMyReadMessageId,
		latestPeerReceivedMessageId,
		latestPeerReadMessageId,
	};
}

async function fetchMessagesWithAttachments(db: D1Database, convoId: string, sinceMessageId: number | null) {
	const messagesStmt = db.prepare(
		`SELECT m.message_id, m.sender_pk, m.body, m.created_at, m.reply_message_id,
	              COALESCE(u.name, u.email, 'User') AS sender_name,
	              u.avatar_url AS sender_avatar
	         FROM chat_messages m
	         LEFT JOIN users u ON u.user_pk = m.sender_pk
	         WHERE m.convo_id = ?
	         ${sinceMessageId != null ? "AND m.message_id > ?" : ""}
	         ORDER BY m.message_id ASC`
	);
	const messages = await (sinceMessageId != null ? messagesStmt.bind(convoId, sinceMessageId) : messagesStmt.bind(convoId)).all<{
		message_id: number;
		sender_pk: number;
		body: string;
		created_at: string;
		reply_message_id: number | null;
		sender_name: string | null;
		sender_avatar: string | null;
	}>();

	const messageRows = messages.results ?? [];
	if (!messageRows.length) return [];

	const attachmentsByMessageId: Record<number, { url: string; mimeType: string | null; width: number | null; height: number | null; size?: number | null }[]> = {};
	const linkPreviewByMessageId: Record<
		number,
		{
			url: string;
			title: string | null;
			description: string | null;
			imageUrl: string | null;
			siteName: string | null;
			status: string | null;
			errorMessage: string | null;
		}
	> = {};

	const attachmentQuery = sinceMessageId != null
		? `SELECT a.message_id, a.url, a.mime_type, a.width, a.height, a.size_bytes
         FROM chat_message_attachments a
         JOIN chat_messages m ON m.message_id = a.message_id
        WHERE m.convo_id = ? AND m.message_id > ?
        ORDER BY a.attachment_id ASC`
		: `SELECT a.message_id, a.url, a.mime_type, a.width, a.height, a.size_bytes
         FROM chat_message_attachments a
         JOIN chat_messages m ON m.message_id = a.message_id
        WHERE m.convo_id = ?
        ORDER BY a.attachment_id ASC`;

	const attachmentRows = await (sinceMessageId != null
		? db.prepare(attachmentQuery).bind(convoId, sinceMessageId)
		: db.prepare(attachmentQuery).bind(convoId)
	).all<{
		message_id: number;
		url: string;
		mime_type: string | null;
		width: number | null;
		height: number | null;
		size_bytes: number | null;
	}>();

	(attachmentRows.results ?? []).forEach((row) => {
		const key = row.message_id;
		const entry = attachmentsByMessageId[key] || [];
		const rawUrl = row.url || "";
		const isAbsolute = rawUrl.startsWith("http://") || rawUrl.startsWith("https://");
		const rel = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
		const normalizedUrl =
			row.mime_type && row.mime_type.toLowerCase().startsWith("image/")
				? `${CDN_IMAGE_BASE}${rel}`
				: isAbsolute
					? rawUrl
					: `${CDN_BASE}${rel}`;
		entry.push({
			url: normalizedUrl,
			mimeType: row.mime_type ?? null,
			width: typeof row.width === "number" ? row.width : null,
			height: typeof row.height === "number" ? row.height : null,
			size: typeof row.size_bytes === "number" ? row.size_bytes : null,
		});
		attachmentsByMessageId[key] = entry;
	});

	const previewQuery =
		sinceMessageId != null
			? `SELECT lp.message_id, lp.url, lp.title, lp.description, lp.image_url, lp.site_name, lp.status, lp.error_message
         FROM chat_message_link_previews lp
         JOIN chat_messages m ON m.message_id = lp.message_id
        WHERE m.convo_id = ? AND m.message_id > ?
        ORDER BY lp.message_id ASC`
			: `SELECT lp.message_id, lp.url, lp.title, lp.description, lp.image_url, lp.site_name, lp.status, lp.error_message
         FROM chat_message_link_previews lp
         JOIN chat_messages m ON m.message_id = lp.message_id
        WHERE m.convo_id = ?
        ORDER BY lp.message_id ASC`;

	const previewRows = await (sinceMessageId != null
		? db.prepare(previewQuery).bind(convoId, sinceMessageId)
		: db.prepare(previewQuery).bind(convoId)
	)
		.all<{
			message_id: number;
			url: string;
			title: string | null;
			description: string | null;
			image_url: string | null;
			site_name: string | null;
			status: string | null;
			error_message: string | null;
		}>()
		.catch(() => ({ results: [] as {
			message_id: number;
			url: string;
			title: string | null;
			description: string | null;
			image_url: string | null;
			site_name: string | null;
			status: string | null;
			error_message: string | null;
		}[] }));

	(previewRows.results ?? []).forEach((row) => {
		const rawImage = row.image_url || "";
		const normalizedImage = rawImage
			? rawImage.startsWith("http://") || rawImage.startsWith("https://")
				? rawImage
				: `${CDN_IMAGE_BASE}${rawImage.startsWith("/") ? rawImage : `/${rawImage}`}`
			: null;
		linkPreviewByMessageId[row.message_id] = {
			url: row.url,
			title: row.title ?? null,
			description: row.description ?? null,
			imageUrl: normalizedImage,
			siteName: row.site_name ?? null,
			status: row.status ?? null,
			errorMessage: row.error_message ?? null,
		};
	});

	return messageRows.map((m) => ({
		...m,
		reply_message_id: typeof m.reply_message_id === "number" ? m.reply_message_id : null,
		attachments: attachmentsByMessageId[m.message_id] ?? [],
		link_preview: linkPreviewByMessageId[m.message_id] ?? null,
	}));
}
