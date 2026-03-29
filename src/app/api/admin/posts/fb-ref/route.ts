import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type UpdateFacebookReferenceBody = {
	post_id?: unknown;
	fb_id?: unknown;
	fb_perm_link?: unknown;
};

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseBodyPostId(value: unknown): number | null {
	const raw = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
	if (!Number.isFinite(raw) || raw <= 0) return null;
	return Math.floor(raw);
}

async function ensureFacebookPostRefTable(db: D1Database): Promise<void> {
	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS social_publish_facebook_post_refs (
				post_id INTEGER PRIMARY KEY,
				fb_id TEXT NOT NULL,
				fb_perm_link TEXT,
				created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`,
		)
		.run();
}

export async function PATCH(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		await ensureFacebookPostRefTable(db);

		const body = (await request.json().catch(() => null)) as UpdateFacebookReferenceBody | null;
		const postId = parseBodyPostId(body?.post_id);
		const fbId = readString(body?.fb_id);
		const fbPermalink = readString(body?.fb_perm_link);

		if (!postId) {
			return NextResponse.json({ ok: false, message: "post_id is required" }, { status: 400 });
		}
		if (!fbId) {
			return NextResponse.json({ ok: false, message: "fb_id is required" }, { status: 400 });
		}

		const postExists = await db
			.prepare("SELECT 1 AS present FROM posts WHERE post_id = ? LIMIT 1")
			.bind(postId)
			.first<{ present: number }>();
		if (!postExists?.present) {
			return NextResponse.json({ ok: false, message: "post not found", post_id: postId }, { status: 404 });
		}

		await db
			.prepare(
				`INSERT INTO social_publish_facebook_post_refs (
					post_id,
					fb_id,
					fb_perm_link,
					created_at,
					updated_at
				) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
				ON CONFLICT(post_id) DO UPDATE SET
					fb_id = excluded.fb_id,
					fb_perm_link = excluded.fb_perm_link,
					updated_at = CURRENT_TIMESTAMP`,
			)
			.bind(postId, fbId, fbPermalink)
			.run();

		return NextResponse.json({
			ok: true,
			post_id: postId,
			fb_id: fbId,
			fb_perm_link: fbPermalink,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to update Facebook post reference",
			},
			{ status: 500 },
		);
	}
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
