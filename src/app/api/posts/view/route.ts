import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type ViewPayload = {
	post_id?: unknown;
	postId?: unknown;
};

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

export async function POST(request: Request) {
	const { env } = await getCloudflareContext({ async: true });
	const db = (env as DbBindings).DB;
	if (!db) {
		return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
	}

	const payload = (await request.json().catch(() => null)) as ViewPayload | null;
	const postId = toPostId(payload?.post_id) ?? toPostId(payload?.postId);
	if (!postId) {
		return NextResponse.json({ ok: false, message: "invalid post_id" }, { status: 400 });
	}

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
		post_id: postId,
		view_count: row?.view_count ?? 0,
	});
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
