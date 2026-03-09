import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type PostLookupRow = {
	post_id: number;
	visibility: string | null;
	refine_prepare_content: number | null;
};

type UpdateRefinePrepareContentBody = {
	post_id?: unknown;
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

export async function PATCH(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const body = (await request.json().catch(() => null)) as UpdateRefinePrepareContentBody | null;
		const postId = parseBodyPostId(body?.post_id);
		const refinePrepareContent = parseBodyInteger(body?.refine_prepare_content);

		if (!postId) {
			return NextResponse.json({ ok: false, message: "post_id is required" }, { status: 400 });
		}
		if (refinePrepareContent === null) {
			return NextResponse.json({ ok: false, message: "refine_prepare_content is required and must be an integer" }, { status: 400 });
		}

		const post = await db
			.prepare("SELECT post_id, visibility, refine_prepare_content FROM posts WHERE post_id = ? LIMIT 1")
			.bind(postId)
			.first<PostLookupRow>();
		if (!post?.post_id) {
			return NextResponse.json({ ok: false, message: "post not found", post_id: postId }, { status: 404 });
		}
		if ((post.visibility ?? "").toLowerCase() !== "prepare") {
			return NextResponse.json(
				{ ok: false, message: "post visibility must be 'prepare'", post_id: postId, visibility: post.visibility ?? null },
				{ status: 409 },
			);
		}

		if ((post.refine_prepare_content ?? 0) !== refinePrepareContent) {
			const updateResult = await db
				.prepare(
					`UPDATE posts
					    SET refine_prepare_content = ?,
					        updated_at = datetime('now')
					  WHERE post_id = ?
					    AND visibility = 'prepare'`,
				)
				.bind(refinePrepareContent, postId)
				.run();

			if ((updateResult.meta?.changes ?? 0) < 1) {
				return NextResponse.json({ ok: false, message: "failed to update refine_prepare_content", post_id: postId }, { status: 409 });
			}
		}

		return NextResponse.json({
			ok: true,
			post_id: postId,
			refine_prepare_content: refinePrepareContent,
			visibility: "prepare",
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to update refine_prepare_content",
			},
			{ status: 500 },
		);
	}
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
