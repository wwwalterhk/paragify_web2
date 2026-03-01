import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jwtVerify } from "jose";
import { authOptions } from "@/lib/auth-options";

type DbBindings = CloudflareEnv & { DB?: D1Database; R2?: R2Bucket; JWT_SECRET?: string };

type LinkPreviewRequest = {
	url?: string;
	text?: string;
	messageId?: number | string | null;
	store?: boolean;
	storeImage?: boolean;
	forceRefresh?: boolean;
};

type ColumnRow = { name: string };

type LinkPreviewData = {
	url: string;
	title: string | null;
	description: string | null;
	siteName: string | null;
	imageSourceUrl: string | null;
	imageUrl: string | null;
	imageStorageKey: string | null;
	imageMimeType: string | null;
	imageSizeBytes: number | null;
	imageWidth: number | null;
	imageHeight: number | null;
	imageSha256: string | null;
	imageStatus: "pending" | "ok" | "failed" | "skipped";
	imageErrorMessage: string | null;
	imageFetchedAt: string | null;
	status: "ok" | "failed" | "pending";
	errorMessage: string | null;
};

const CDN_IMAGE_BASE = "https://cdn.paragify.com/cdn-cgi/image/width=900,quality=85,format=auto";
const UA =
	"Mozilla/5.0 (compatible; paragify-link-preview-bot/1.0; +https://www.paragify.com)";
const MAX_HTML_CHARS = 250_000;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

function json(data: unknown, status = 200) {
	return NextResponse.json(data, { status });
}

function decodeHtmlEntities(value: string): string {
	return value
		.replace(/&amp;/gi, "&")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&#x2F;/gi, "/")
		.replace(/&#47;/gi, "/");
}

function trimNullable(value: string | null | undefined): string | null {
	const v = (value ?? "").trim();
	return v ? v : null;
}

function extractFirstUrl(raw: string): string | null {
	const m = raw.match(/https?:\/\/[^\s<>"')\]}]+/i);
	if (!m?.[0]) return null;
	return m[0].trim();
}

function normalizeHttpUrl(raw: string): string | null {
	try {
		const u = new URL(raw);
		const protocol = u.protocol.toLowerCase();
		if (protocol !== "http:" && protocol !== "https:") return null;
		if (isBlockedHostname(u.hostname)) return null;
		return u.toString();
	} catch {
		return null;
	}
}

function isPrivateIpv4(hostname: string): boolean {
	const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (!m) return false;
	const parts = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
	if (parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return true;
	const [a, b] = parts;
	if (a === 10) return true;
	if (a === 127) return true;
	if (a === 0) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	return false;
}

function isBlockedHostname(hostnameRaw: string): boolean {
	const hostname = hostnameRaw.trim().toLowerCase();
	if (!hostname) return true;
	if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
	if (hostname.endsWith(".local")) return true;
	if (hostname === "[::1]" || hostname === "::1") return true;
	if (hostname.startsWith("fe80:") || hostname.startsWith("fc") || hostname.startsWith("fd")) return true;
	if (isPrivateIpv4(hostname)) return true;
	return false;
}

function parseMetaTags(html: string): Record<string, string> {
	const out: Record<string, string> = {};
	const tags = html.match(/<meta\s+[^>]*>/gi) ?? [];
	for (const tag of tags) {
		const attrs: Record<string, string> = {};
		const attrRegex = /([a-zA-Z_:][a-zA-Z0-9_:\-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
		let m: RegExpExecArray | null = null;
		while ((m = attrRegex.exec(tag)) !== null) {
			const key = m[1]?.toLowerCase();
			const value = (m[3] ?? m[4] ?? m[5] ?? "").trim();
			if (key) attrs[key] = value;
		}
		const nameKey = (attrs.property || attrs.name || attrs["http-equiv"] || "").toLowerCase();
		const content = attrs.content || "";
		if (!nameKey || !content) continue;
		out[nameKey] = decodeHtmlEntities(content);
	}
	return out;
}

function extractTitle(html: string, meta: Record<string, string>): string | null {
	const fromMeta =
		meta["og:title"] || meta["twitter:title"] || meta["title"] || null;
	if (fromMeta) return trimNullable(fromMeta);
	const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	if (!m?.[1]) return null;
	return trimNullable(decodeHtmlEntities(m[1].replace(/\s+/g, " ")));
}

function absolutizeUrl(baseUrl: string, candidate: string | null): string | null {
	if (!candidate) return null;
	try {
		return new URL(candidate, baseUrl).toString();
	} catch {
		return null;
	}
}

function extFromMimeOrUrl(mime: string | null, url?: string | null): string {
	const normalized = (mime || "").toLowerCase();
	const byMime: Record<string, string> = {
		"image/jpeg": "jpg",
		"image/jpg": "jpg",
		"image/png": "png",
		"image/webp": "webp",
		"image/gif": "gif",
		"image/avif": "avif",
		"image/svg+xml": "svg",
	};
	if (byMime[normalized]) return byMime[normalized];
	if (url) {
		try {
			const u = new URL(url);
			const ext = (u.pathname.split(".").pop() || "").trim().toLowerCase();
			if (ext && ext.length <= 6) return ext;
		} catch {
			// ignore
		}
	}
	return "bin";
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
	const hash = await crypto.subtle.digest("SHA-256", data);
	const bytes = Array.from(new Uint8Array(hash));
	return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function resolveUserPk(req: Request, env: DbBindings): Promise<number | null> {
	// 1) Web: NextAuth cookie session
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

	// 2) Mobile: Bearer HS256 JWT
	const auth = req.headers.get("authorization") || "";
	if (auth.toLowerCase().startsWith("bearer ")) {
		const token = auth.slice(7).trim();
		const secret = env.JWT_SECRET;
		if (secret && env.DB) {
			try {
				const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
					algorithms: ["HS256"],
					clockTolerance: "120s",
				});
				const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
				const jti = typeof payload.jti === "string" ? payload.jti : null;
				if (email && jti) {
					const row = await env.DB
						.prepare(
							`SELECT us.user_pk
                 FROM user_sessions us
                 JOIN users u ON us.user_pk = u.user_pk
                WHERE us.session_token = ?
                  AND us.expires_at > datetime('now')
                  AND lower(u.email) = ?
                LIMIT 1`
						)
						.bind(jti, email)
						.first<{ user_pk: number }>();
					if (row?.user_pk) return row.user_pk;
				}
			} catch {
				// ignore invalid token
			}
		}
	}

	// 3) Dev override
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

async function ensureMessageAccess(
	db: D1Database,
	messageId: number,
	viewerPk: number
): Promise<{ ok: boolean; convoId: string | null }> {
	const row = await db
		.prepare(
			`SELECT m.convo_id
         FROM chat_messages m
         JOIN chat_participants p ON p.convo_id = m.convo_id
        WHERE m.message_id = ? AND p.user_pk = ?
        LIMIT 1`
		)
		.bind(messageId, viewerPk)
		.first<{ convo_id: string }>();
	if (!row?.convo_id) return { ok: false, convoId: null };
	return { ok: true, convoId: row.convo_id };
}

async function getLinkPreviewColumns(db: D1Database): Promise<Set<string>> {
	const res = await db
		.prepare("PRAGMA table_info(chat_message_link_previews)")
		.all<ColumnRow>();
	return new Set((res.results ?? []).map((r) => r.name));
}

async function upsertLinkPreview(
	db: D1Database,
	columns: Set<string>,
	messageId: number,
	data: LinkPreviewData
) {
	const writeMap: Record<string, unknown> = {
		message_id: messageId,
		url: data.url,
		title: data.title,
		description: data.description,
		image_url: data.imageUrl,
		image_source_url: data.imageSourceUrl,
		image_storage_key: data.imageStorageKey,
		image_mime_type: data.imageMimeType,
		image_size_bytes: data.imageSizeBytes,
		image_width: data.imageWidth,
		image_height: data.imageHeight,
		image_sha256: data.imageSha256,
		image_status: data.imageStatus,
		image_error_message: data.imageErrorMessage,
		image_fetched_at: data.imageFetchedAt,
		site_name: data.siteName,
		fetched_at: new Date().toISOString(),
		status: data.status,
		error_message: data.errorMessage,
	};

	const allowedKeys = Object.keys(writeMap).filter((k) => columns.has(k));
	if (!allowedKeys.includes("message_id") || !allowedKeys.includes("url")) {
		throw new Error("chat_message_link_previews missing required columns");
	}

	const placeholders = allowedKeys.map(() => "?").join(", ");
	const values = allowedKeys.map((k) => writeMap[k]);
	const updateKeys = allowedKeys.filter((k) => k !== "message_id");
	const updateSql = updateKeys.map((k) => `${k}=excluded.${k}`).join(", ");

	await db
		.prepare(
			`INSERT INTO chat_message_link_previews (${allowedKeys.join(", ")})
       VALUES (${placeholders})
       ON CONFLICT(message_id) DO UPDATE SET ${updateSql}`
		)
		.bind(...values)
		.run();
}

async function fetchHtmlPreview(targetUrl: string): Promise<{
	finalUrl: string;
	title: string | null;
	description: string | null;
	siteName: string | null;
	imageSourceUrl: string | null;
}> {
	const res = await fetch(targetUrl, {
		method: "GET",
		redirect: "follow",
		headers: {
			"user-agent": UA,
			accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
		},
	});

	if (!res.ok) throw new Error(`upstream returned ${res.status}`);

	const finalUrl = res.url || targetUrl;
	try {
		const finalHost = new URL(finalUrl).hostname;
		if (isBlockedHostname(finalHost)) {
			throw new Error("blocked final host");
		}
	} catch {
		throw new Error("invalid final URL");
	}
	const contentType = (res.headers.get("content-type") || "").toLowerCase();
	if (!contentType.includes("text/html")) {
		const fallbackTitle = (() => {
			try {
				const u = new URL(finalUrl);
				return u.hostname;
			} catch {
				return null;
			}
		})();
		return {
			finalUrl,
			title: fallbackTitle,
			description: null,
			siteName: null,
			imageSourceUrl: null,
		};
	}

	const htmlRaw = await res.text();
	const html = htmlRaw.slice(0, MAX_HTML_CHARS);
	const meta = parseMetaTags(html);
	const title = extractTitle(html, meta);
	const description = trimNullable(
		meta["og:description"] || meta["description"] || meta["twitter:description"] || null
	);
	const siteName = trimNullable(meta["og:site_name"] || null);
	const imageCandidate = trimNullable(
		meta["og:image:secure_url"] ||
			meta["og:image"] ||
			meta["twitter:image:src"] ||
			meta["twitter:image"] ||
			null
	);
	const imageSourceUrl = absolutizeUrl(finalUrl, imageCandidate);

	return {
		finalUrl,
		title,
		description,
		siteName,
		imageSourceUrl,
	};
}

async function storePreviewImage(
	r2: R2Bucket,
	imageSourceUrl: string
): Promise<{
	imageUrl: string;
	imageStorageKey: string;
	imageMimeType: string | null;
	imageSizeBytes: number;
	imageSha256: string;
	imageWidth: number | null;
	imageHeight: number | null;
}> {
	const imgUrl = new URL(imageSourceUrl);
	if (isBlockedHostname(imgUrl.hostname)) {
		throw new Error("blocked image host");
	}

	const res = await fetch(imageSourceUrl, {
		method: "GET",
		redirect: "follow",
		headers: {
			"user-agent": UA,
			accept: "image/*,*/*;q=0.8",
		},
	});
	if (!res.ok) throw new Error(`image fetch returned ${res.status}`);

	const contentType = (res.headers.get("content-type") || "").toLowerCase();
	if (!contentType.startsWith("image/")) {
		throw new Error(`image content-type not supported: ${contentType || "unknown"}`);
	}

	const contentLen = Number(res.headers.get("content-length") || NaN);
	if (Number.isFinite(contentLen) && contentLen > MAX_IMAGE_BYTES) {
		throw new Error("image too large");
	}

	const buffer = await res.arrayBuffer();
	if (buffer.byteLength > MAX_IMAGE_BYTES) {
		throw new Error("image too large");
	}

	const imageSha256 = await sha256Hex(buffer);
	const ext = extFromMimeOrUrl(contentType, res.url || imageSourceUrl);
	const now = new Date();
	const yyyy = `${now.getUTCFullYear()}`;
	const mm = `${now.getUTCMonth() + 1}`.padStart(2, "0");
	const key = `link-previews/${yyyy}/${mm}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

	await r2.put(key, new Uint8Array(buffer), {
		httpMetadata: { contentType: contentType || "application/octet-stream" },
	});

	return {
		imageUrl: `${CDN_IMAGE_BASE}/${key}`,
		imageStorageKey: key,
		imageMimeType: contentType || null,
		imageSizeBytes: buffer.byteLength,
		imageSha256,
		imageWidth: null,
		imageHeight: null,
	};
}

export async function POST(req: Request) {
	const { env } = await getCloudflareContext({ async: true });
	const bindings = env as DbBindings;
	const db = bindings.DB;
	if (!db) return json({ ok: false, message: "DB unavailable" }, 500);

	const viewerPk = await resolveUserPk(req, bindings);
	if (!viewerPk) return json({ ok: false, message: "unauthorized" }, 401);

	const body = (await req.json().catch(() => null)) as LinkPreviewRequest | null;
	const rawUrl = trimNullable(body?.url);
	const rawText = trimNullable(body?.text);
	const extractedFromText = rawText ? extractFirstUrl(rawText) : null;
	const candidate = rawUrl || extractedFromText || null;
	if (!candidate) {
		return json({ ok: false, message: "missing url or text with a valid URL" }, 400);
	}

	const normalizedUrl = normalizeHttpUrl(candidate);
	if (!normalizedUrl) return json({ ok: false, message: "invalid URL" }, 400);

	const messageIdRaw = body?.messageId;
	const messageId =
		typeof messageIdRaw === "number"
			? messageIdRaw
			: typeof messageIdRaw === "string" && /^\d+$/.test(messageIdRaw.trim())
				? Number(messageIdRaw.trim())
				: null;
	const store = Boolean(body?.store ?? messageId != null);
	const storeImage = Boolean(body?.storeImage ?? true);
	const forceRefresh = Boolean(body?.forceRefresh ?? false);

	if (messageId != null) {
		const access = await ensureMessageAccess(db, messageId, viewerPk);
		if (!access.ok) return json({ ok: false, message: "forbidden messageId" }, 403);
	}

	if (store && messageId != null && !forceRefresh) {
		const existing = await db
			.prepare(
				`SELECT message_id, url, title, description, image_url, site_name, status, error_message
           FROM chat_message_link_previews
          WHERE message_id = ?
          LIMIT 1`
			)
			.bind(messageId)
			.first<{
				message_id: number;
				url: string;
				title: string | null;
				description: string | null;
				image_url: string | null;
				site_name: string | null;
				status: string | null;
				error_message: string | null;
			}>()
			.catch(() => null);

		if (existing?.message_id) {
			return json({
				ok: true,
				messageId: existing.message_id,
				preview: {
					url: existing.url,
					title: existing.title,
					description: existing.description,
					imageUrl: existing.image_url,
					siteName: existing.site_name,
					status: existing.status ?? "ok",
					errorMessage: existing.error_message ?? null,
				},
				cached: true,
			});
		}
	}

	const nowIso = new Date().toISOString();
	const preview: LinkPreviewData = {
		url: normalizedUrl,
		title: null,
		description: null,
		siteName: null,
		imageSourceUrl: null,
		imageUrl: null,
		imageStorageKey: null,
		imageMimeType: null,
		imageSizeBytes: null,
		imageWidth: null,
		imageHeight: null,
		imageSha256: null,
		imageStatus: "skipped",
		imageErrorMessage: null,
		imageFetchedAt: null,
		status: "pending",
		errorMessage: null,
	};

	try {
		const htmlPreview = await fetchHtmlPreview(normalizedUrl);
		preview.url = htmlPreview.finalUrl || normalizedUrl;
		preview.title = htmlPreview.title;
		preview.description = htmlPreview.description;
		preview.siteName = htmlPreview.siteName;
		preview.imageSourceUrl = htmlPreview.imageSourceUrl;
		preview.status = "ok";
		preview.errorMessage = null;

		if (storeImage && preview.imageSourceUrl) {
			if (!bindings.R2) {
				preview.imageStatus = "failed";
				preview.imageErrorMessage = 'Missing binding "R2"';
			} else {
				try {
					const img = await storePreviewImage(bindings.R2, preview.imageSourceUrl);
					preview.imageUrl = img.imageUrl;
					preview.imageStorageKey = img.imageStorageKey;
					preview.imageMimeType = img.imageMimeType;
					preview.imageSizeBytes = img.imageSizeBytes;
					preview.imageWidth = img.imageWidth;
					preview.imageHeight = img.imageHeight;
					preview.imageSha256 = img.imageSha256;
					preview.imageStatus = "ok";
					preview.imageErrorMessage = null;
					preview.imageFetchedAt = nowIso;
				} catch (err) {
					preview.imageStatus = "failed";
					preview.imageErrorMessage = err instanceof Error ? err.message : "image fetch failed";
					preview.imageFetchedAt = nowIso;
				}
			}
		}
	} catch (err) {
		preview.status = "failed";
		preview.errorMessage = err instanceof Error ? err.message : "failed to fetch link preview";
	}

	if (store && messageId != null) {
		try {
			const columns = await getLinkPreviewColumns(db);
			await upsertLinkPreview(db, columns, messageId, preview);
		} catch (err) {
			return json(
				{
					ok: false,
					message: "failed to store link preview",
					detail: err instanceof Error ? err.message : String(err),
					preview: {
						url: preview.url,
						title: preview.title,
						description: preview.description,
						imageUrl: preview.imageUrl,
						siteName: preview.siteName,
						status: preview.status,
						errorMessage: preview.errorMessage,
						imageStatus: preview.imageStatus,
						imageErrorMessage: preview.imageErrorMessage,
					},
				},
				500
			);
		}
	}

	return json({
		ok: true,
		messageId: messageId ?? null,
		preview: {
			url: preview.url,
			title: preview.title,
			description: preview.description,
			imageUrl: preview.imageUrl,
			imageSourceUrl: preview.imageSourceUrl,
			imageStorageKey: preview.imageStorageKey,
			imageMimeType: preview.imageMimeType,
			imageSizeBytes: preview.imageSizeBytes,
			imageWidth: preview.imageWidth,
			imageHeight: preview.imageHeight,
			imageSha256: preview.imageSha256,
			siteName: preview.siteName,
			status: preview.status,
			errorMessage: preview.errorMessage,
			imageStatus: preview.imageStatus,
			imageErrorMessage: preview.imageErrorMessage,
			imageFetchedAt: preview.imageFetchedAt,
		},
		stored: Boolean(store && messageId != null),
	});
}

export function GET() {
	return json({ ok: false, message: "Method not allowed" }, 405);
}
