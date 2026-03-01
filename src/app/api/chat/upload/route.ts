import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jwtVerify } from "jose";
import { authOptions } from "@/lib/auth-options";

type DbBindings = CloudflareEnv & { DB?: D1Database; R2?: R2Bucket; JWT_SECRET?: string };
const CDN_BASE = "https://cdn.paragify.com";
const CDN_IMAGE_BASE = "https://cdn.paragify.com/cdn-cgi/image/width=768,quality=75,format=auto";

async function resolveUserPk(req: Request, env: DbBindings): Promise<number | null> {
	// 1) NextAuth cookie session (web)
	try {
		const session = await getServerSession(authOptions);
		const email = session?.user?.email?.toLowerCase();
		if (email && env.DB) {
			const row = await env.DB.prepare("SELECT user_pk FROM users WHERE lower(email) = ? LIMIT 1").bind(email).first<{ user_pk: number }>();
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
		if (!secret) return null;
		try {
			const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
				algorithms: ["HS256"],
				clockTolerance: "120s",
			});
			const jti = typeof payload.jti === "string" ? payload.jti : null;
			const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
			if (jti && email && env.DB) {
				const row = await env.DB.prepare(
					`SELECT us.user_pk
           FROM user_sessions us
           JOIN users u ON us.user_pk = u.user_pk
          WHERE us.session_token = ? AND us.expires_at > datetime('now') AND lower(u.email)=?
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

	// 3) Dev headers/query (?userPk= & ?user=)
	const url = new URL(req.url);
	const qpUserPk = url.searchParams.get("userPk") || url.searchParams.get("userpk");
	const headerUserPk = req.headers.get("x-user-pk");
	const userPkRaw = qpUserPk ?? headerUserPk;
	if (userPkRaw) {
		const n = Number(userPkRaw);
		if (Number.isFinite(n) && n > 0) return n;
	}

	return null;
}

function extFromMime(mime: string | null) {
	if (!mime) return "bin";
	const map: Record<string, string> = {
		"image/jpeg": "jpg",
		"image/jpg": "jpg",
		"image/png": "png",
		"image/webp": "webp",
		"image/gif": "gif",
		"application/pdf": "pdf",
	};
	return map[mime.toLowerCase()] || mime.split("/")[1] || "bin";
}

export async function POST(req: Request) {
	const { env } = await getCloudflareContext({ async: true });
	const bindings = env as DbBindings;
	const r2 = bindings.R2;
	if (!r2) return NextResponse.json({ ok: false, message: 'Missing binding "R2"' }, { status: 500 });

	const userPk = await resolveUserPk(req, bindings);
	if (!userPk) return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });

	const url = new URL(req.url);
	const contentType = req.headers.get("content-type");
	const ext = extFromMime(contentType);
	const key = `attachments/${userPk}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

	const buf = new Uint8Array(await req.arrayBuffer());
	const clientSize = Number(url.searchParams.get("size_bytes") || req.headers.get("x-size-bytes") || NaN);
	const size = Number.isFinite(clientSize) && clientSize > 0 ? clientSize : buf.byteLength;

	try {
		await r2.put(key, buf, {
			httpMetadata: { contentType: contentType || "application/octet-stream" },
		});
		const relPath = `/${key}`;
		const cdnUrl = `${CDN_IMAGE_BASE}${relPath}`;

		// Optional DB record if message_id provided
		const messageIdParam = url.searchParams.get("messageId") || url.searchParams.get("message_id") || req.headers.get("x-message-id");
		const messageIdNum = messageIdParam ? Number(messageIdParam) : NaN;
		if (bindings.DB && Number.isFinite(messageIdNum) && messageIdNum > 0) {
			await bindings.DB.prepare(
				`INSERT INTO chat_message_attachments (message_id, url, mime_type, size_bytes)
         VALUES (?, ?, ?, ?)`
			)
				.bind(messageIdNum, `/${key}`, contentType || null, size)
				.run()
				.catch(() => {
					// ignore DB insert errors to avoid failing upload
				});
		}

		return NextResponse.json({ ok: true, key, url: `/${key}`, cdnUrl, size });
	} catch (err) {
		return NextResponse.json({ ok: false, message: "upload failed", detail: `${err}` }, { status: 500 });
	}
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
