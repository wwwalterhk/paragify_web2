import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type PostLookupRow = {
	post_id: number;
};

type UpdatePrepareContentRefinedBody = {
	post_id?: unknown;
	prepare_content_refined?: unknown;
	refine_prepare_content?: unknown;
};

function parseBodyPostId(value: unknown): number | null {
	const raw = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
	if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw <= 0) return null;
	return raw;
}

function parseBodyInteger(value: unknown): number | null {
	const raw = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
	if (!Number.isFinite(raw) || !Number.isInteger(raw)) return null;
	return raw;
}

function parseBodyPrepareContentRefined(value: unknown): string | null {
	if (typeof value !== "string") return null;
	return value;
}

export async function PATCH(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const body = (await request.json().catch(() => null)) as UpdatePrepareContentRefinedBody | null;
		const postId = parseBodyPostId(body?.post_id);
		const prepareContentRefined = parseBodyPrepareContentRefined(body?.prepare_content_refined);
		const refinePrepareContent = parseBodyInteger(body?.refine_prepare_content);

		if (!postId) {
			return NextResponse.json({ ok: false, message: "post_id is required" }, { status: 400 });
		}
		if (prepareContentRefined === null) {
			return NextResponse.json({ ok: false, message: "prepare_content_refined is required and must be a string" }, { status: 400 });
		}
		if (refinePrepareContent === null) {
			return NextResponse.json({ ok: false, message: "refine_prepare_content is required and must be an integer" }, { status: 400 });
		}

		const post = await db
			.prepare("SELECT post_id FROM posts WHERE post_id = ? LIMIT 1")
			.bind(postId)
			.first<PostLookupRow>();
		if (!post?.post_id) {
			return NextResponse.json({ ok: false, message: "post not found", post_id: postId }, { status: 404 });
		}

		const updateResult = await db
			.prepare(
				`UPDATE posts
				    SET prepare_content_refined = ?,
				        refine_prepare_content = ?,
				        updated_at = datetime('now')
				  WHERE post_id = ?`,
			)
			.bind(prepareContentRefined, refinePrepareContent, postId)
			.run();

		if ((updateResult.meta?.changes ?? 0) < 1) {
			return NextResponse.json({ ok: false, message: "failed to update post", post_id: postId }, { status: 409 });
		}

		return NextResponse.json({
			ok: true,
			post_id: postId,
			prepare_content_refined: prepareContentRefined,
			refine_prepare_content: refinePrepareContent,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to update post",
			},
			{ status: 500 },
		);
	}
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
