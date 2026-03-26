import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getServerSession } from "next-auth";
import { jwtVerify } from "jose";
import { authOptions } from "@/lib/auth-options";

type DbBindings = CloudflareEnv & { DB?: D1Database; JWT_SECRET?: string };

type ViewPayload = {
	post_id?: unknown;
	postId?: unknown;
	post_slug?: unknown;
	postSlug?: unknown;
};

const BOT_UA_PATTERN =
	/(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|facebookcatalog|whatsapp|telegrambot|googlebot|googleother|adsbot|mediapartners|petalbot|bytespider|duckduckbot|yandex|baiduspider|applebot|semrush|ahrefs|mj12bot|dotbot|linkedinbot|embedly|quora link preview|slackbot|discordbot|chrome-lighthouse|headlesschrome|pagespeed|gtmetrix|pingdom|uptimerobot|monitor)/i;

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
				const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
					algorithms: ["HS256"],
					clockTolerance: "120s",
				});
				const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
				const jti = typeof payload.jti === "string" ? payload.jti : null;
				if (email && jti && env.DB) {
					const row = await env.DB.prepare(
						`SELECT us.user_pk
             FROM user_sessions us
             JOIN users u ON u.user_pk = us.user_pk
            WHERE us.session_token=? AND us.expires_at > datetime('now') AND lower(u.email)=?
            LIMIT 1`,
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

	const url = new URL(req.url);
	const qp = url.searchParams.get("userPk");
	const header = req.headers.get("x-user-pk");
	const raw = qp ?? header;
	if (raw) {
		const parsed = Number(raw);
		if (Number.isFinite(parsed) && parsed > 0) {
			return parsed;
		}
	}

	return null;
}

function shouldSkipView(request: Request): boolean {
	const purpose = (request.headers.get("purpose") || request.headers.get("sec-purpose") || "").toLowerCase();
	if (purpose.includes("prefetch")) {
		return true;
	}

	if ((request.headers.get("x-middleware-prefetch") || "").toLowerCase() === "1") {
		return true;
	}

	if ((request.headers.get("next-router-prefetch") || "").toLowerCase() === "1") {
		return true;
	}

	const userAgent = request.headers.get("user-agent") || "";
	return BOT_UA_PATTERN.test(userAgent);
}

let ensuredPostViewUniques = false;

async function ensurePostViewUniquesTable(db: D1Database) {
	if (ensuredPostViewUniques) {
		return;
	}

	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS post_view_uniques (
				post_id INTEGER NOT NULL,
				user_pk INTEGER NOT NULL,
				view_count INTEGER NOT NULL DEFAULT 1,
				first_viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				last_viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (post_id, user_pk)
			)`,
		)
		.run();
	await db.prepare("CREATE INDEX IF NOT EXISTS idx_post_view_uniques_user_last ON post_view_uniques(user_pk, last_viewed_at DESC)").run();
	ensuredPostViewUniques = true;
}

function toPostId(value: unknown): number | null {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) {
		return value;
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (/^\d+$/.test(trimmed)) {
			const parsed = Number(trimmed);
			if (Number.isInteger(parsed) && parsed > 0) {
				return parsed;
			}
		}
	}
	return null;
}

function toPostSlug(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

export async function POST(request: Request) {
	const { env } = await getCloudflareContext({ async: true });
	const bindings = env as DbBindings;
	const db = bindings.DB;
	if (!db) {
		return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
	}

	if (shouldSkipView(request)) {
		return NextResponse.json({ ok: true, skipped: true });
	}

	const payload = (await request.json().catch(() => null)) as ViewPayload | null;
	const postSlug = toPostSlug(payload?.post_slug) ?? toPostSlug(payload?.postSlug);
	let postId = toPostId(payload?.post_id) ?? toPostId(payload?.postId);
	if (!postId && postSlug) {
		const row = await db.prepare("SELECT post_id FROM posts WHERE post_slug = ? LIMIT 1").bind(postSlug).first<{ post_id: number }>();
		postId = row?.post_id ?? null;
	}
	if (!postId) {
		return NextResponse.json({ ok: false, message: "invalid post reference" }, { status: 400 });
	}

	const userPk = await resolveUserPk(request, bindings);
	const effectiveUserPk = userPk ?? 0;
	await ensurePostViewUniquesTable(db);
	await db
		.prepare(
			`INSERT INTO post_view_uniques (post_id, user_pk, view_count, first_viewed_at, last_viewed_at)
			 VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			 ON CONFLICT(post_id, user_pk) DO UPDATE SET
			 	view_count = COALESCE(post_view_uniques.view_count, 0) + 1,
			 	last_viewed_at = CURRENT_TIMESTAMP`,
		)
		.bind(postId, effectiveUserPk)
		.run();

	const updateResult = await db
		.prepare("UPDATE posts SET view_count = COALESCE(view_count, 0) + 1 WHERE post_id = ?")
		.bind(postId)
		.run();

	if ((updateResult.meta?.changes ?? 0) < 1) {
		return NextResponse.json({ ok: false, message: "post not found" }, { status: 404 });
	}

	const row = await db
		.prepare("SELECT view_count FROM posts WHERE post_id = ? LIMIT 1")
		.bind(postId)
		.first<{ view_count: number | null }>();

	return NextResponse.json({
		ok: true,
		post_slug: postSlug ?? null,
		view_count: row?.view_count ?? 0,
		logged_in: Boolean(userPk),
	});
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
