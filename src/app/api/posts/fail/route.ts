import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type MarkFailPayload = {
	post_id?: number | string | null;
};

function parsePostId(value: unknown): number | null {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (/^\d+$/.test(trimmed)) return Number(trimmed);
	}
	return null;
}

export async function POST(request: Request) {
	const contentType = request.headers.get("content-type") || "";
	if (!contentType.toLowerCase().includes("application/json")) {
		return NextResponse.json({ ok: false, message: "Content-Type must be application/json" }, { status: 415 });
	}

	const body = (await request.json().catch(() => null)) as MarkFailPayload | null;
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		return NextResponse.json({ ok: false, message: "invalid json body" }, { status: 400 });
	}

	const postId = parsePostId(body.post_id);
	if (!postId) return NextResponse.json({ ok: false, message: "invalid post_id" }, { status: 400 });

	const { env } = await getCloudflareContext({ async: true });
	const db = (env as CloudflareEnv & { DB?: D1Database }).DB;
	if (!db) return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });

	try {
		const update = await db
			.prepare(
				`UPDATE posts
				    SET prepare_status = 'fail',
				        visibility = 'fail',
				        updated_at = datetime('now')
				  WHERE post_id = ?`
			)
			.bind(postId)
			.run();

		if ((update.meta?.changes ?? 0) < 1) {
			return NextResponse.json({ ok: false, message: "post not found", post_id: postId }, { status: 404 });
		}

		return NextResponse.json({ ok: true, post_id: postId, prepare_status: "fail", visibility: "fail" });
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: "failed to mark post as fail", detail: `${error}` },
			{ status: 500 }
		);
	}
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
