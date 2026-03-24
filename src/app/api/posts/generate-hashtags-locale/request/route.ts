import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse, type NextRequest } from "next/server";

const STATUS_NONE = 0;
const STATUS_REQUESTED = 1;
const STATUS_DONE = 2;
const STATUS_FAILED = 3;
const STATUS_WAITING = 4;

type RequestBody = {
	post_id?: number | string | null;
	force?: boolean | null;
};

function parsePostId(value: unknown): number | null {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
	if (typeof value === "string" && /^\d+$/.test(value.trim())) {
		const parsed = Number(value.trim());
		return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
	}
	return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
	const contentType = request.headers.get("content-type") || "";
	if (!contentType.toLowerCase().includes("application/json")) {
		return NextResponse.json({ ok: false, message: "Content-Type must be application/json" }, { status: 415 });
	}

	const body = (await request.json().catch(() => null)) as RequestBody | null;
	if (!body || !isRecord(body)) {
		return NextResponse.json({ ok: false, message: "invalid json body" }, { status: 400 });
	}

	const postId = parsePostId(body.post_id);
	if (!postId) {
		return NextResponse.json({ ok: false, message: "invalid post_id" }, { status: 400 });
	}

	const force = body.force === true;

	const { env } = await getCloudflareContext({ async: true });
	const db = (env as CloudflareEnv & { DB?: D1Database }).DB;
	if (!db) {
		return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
	}

	const post = await db
		.prepare(
			`SELECT
			    post_id,
			    visibility,
			    prepare_content,
			    prepare_content_refined,
			    generate_hashtags_locale,
			    batch_id
			   FROM posts
			  WHERE post_id = ?
			  LIMIT 1`
		)
		.bind(postId)
		.first<{
			post_id: number;
			visibility: string | null;
			prepare_content: string | null;
			prepare_content_refined: string | null;
			generate_hashtags_locale: number | null;
			batch_id: string | null;
		}>();

	if (!post?.post_id) {
		return NextResponse.json({ ok: false, message: "post not found", post_id: postId }, { status: 404 });
	}

	if ((post.visibility ?? "") !== "prepare") {
		return NextResponse.json(
			{ ok: false, message: "post is not in prepare visibility", post_id: postId, visibility: post.visibility },
			{ status: 409 }
		);
	}

	const prepareContent = typeof post.prepare_content === "string" ? post.prepare_content.trim() : "";
	if (!prepareContent) {
		return NextResponse.json(
			{ ok: false, message: "prepare_content is empty", post_id: postId },
			{ status: 409 }
		);
	}

	if ((post.generate_hashtags_locale ?? STATUS_NONE) === STATUS_WAITING && !force) {
		return NextResponse.json(
			{
				ok: false,
				message: "post is already waiting for generate_hashtags_locale result; resend with force=true to requeue",
				post_id: postId,
				generate_hashtags_locale: post.generate_hashtags_locale ?? STATUS_NONE,
				batch_id: post.batch_id,
			},
			{ status: 409 }
		);
	}

	await db
		.prepare(
			`UPDATE posts
			    SET generate_hashtags_locale = ?,
			        batch_id = NULL,
			        updated_at = datetime('now')
			  WHERE post_id = ?`
		)
		.bind(STATUS_REQUESTED, postId)
		.run();

	return NextResponse.json({
		ok: true,
		post_id: postId,
		force,
		previous_generate_hashtags_locale: post.generate_hashtags_locale ?? STATUS_NONE,
		previous_batch_id: post.batch_id,
		generate_hashtags_locale: STATUS_REQUESTED,
		has_prepare_content_refined: Boolean(post.prepare_content_refined?.trim()),
		status_map: {
			none: STATUS_NONE,
			requested: STATUS_REQUESTED,
			done: STATUS_DONE,
			failed: STATUS_FAILED,
			waiting: STATUS_WAITING,
		},
	});
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
