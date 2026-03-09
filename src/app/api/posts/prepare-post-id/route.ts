import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type UpdatePreparePostIdPayload = {
	post_id?: number | string | null;
	prepare_post_id?: number | string | null;
};

function parsePostId(value: unknown): number | null {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (/^\d+$/.test(trimmed)) return Number(trimmed);
	}
	return null;
}

async function handleUpdatePreparePostId(request: Request) {
	const contentType = request.headers.get("content-type") || "";
	if (!contentType.toLowerCase().includes("application/json")) {
		return NextResponse.json({ ok: false, message: "Content-Type must be application/json" }, { status: 415 });
	}

	const body = (await request.json().catch(() => null)) as UpdatePreparePostIdPayload | null;
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		return NextResponse.json({ ok: false, message: "invalid json body" }, { status: 400 });
	}

	const postId = parsePostId(body.post_id);
	const preparePostId = parsePostId(body.prepare_post_id);
	if (!postId) {
		return NextResponse.json({ ok: false, message: "invalid post_id" }, { status: 400 });
	}
	if (!preparePostId) {
		return NextResponse.json({ ok: false, message: "invalid prepare_post_id" }, { status: 400 });
	}

	const { env } = await getCloudflareContext({ async: true });
	const db = (env as CloudflareEnv & { DB?: D1Database }).DB;
	if (!db) return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });

	try {
		const [targetPost, sourcePost] = await Promise.all([
			db.prepare("SELECT post_id FROM posts WHERE post_id = ? LIMIT 1").bind(postId).first<{ post_id: number }>(),
			db.prepare("SELECT post_id FROM posts WHERE post_id = ? LIMIT 1").bind(preparePostId).first<{ post_id: number }>(),
		]);

		if (!targetPost?.post_id) {
			return NextResponse.json({ ok: false, message: "post not found", post_id: postId }, { status: 404 });
		}
		if (!sourcePost?.post_id) {
			return NextResponse.json(
				{ ok: false, message: "prepare_post_id not found", prepare_post_id: preparePostId },
				{ status: 404 },
			);
		}

		await db
			.prepare(
				`UPDATE posts
				    SET prepare_post_id = ?,
				        updated_at = datetime('now')
				  WHERE post_id = ?`,
			)
			.bind(preparePostId, postId)
			.run();

		return NextResponse.json({
			ok: true,
			post_id: postId,
			prepare_post_id: preparePostId,
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: "failed to update prepare_post_id", detail: `${error}` },
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	return handleUpdatePreparePostId(request);
}

export async function PATCH(request: Request) {
	return handleUpdatePreparePostId(request);
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
