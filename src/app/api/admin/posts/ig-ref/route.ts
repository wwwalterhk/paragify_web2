import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type UpdateIgRefBody = {
	post_id?: unknown;
	ig_ref?: unknown;
};

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseBodyPostId(value: unknown): number | null {
	const raw = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
	if (!Number.isFinite(raw) || raw <= 0) return null;
	return Math.floor(raw);
}

export async function PATCH(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const body = (await request.json().catch(() => null)) as UpdateIgRefBody | null;
		const postId = parseBodyPostId(body?.post_id);
		const igRef = readString(body?.ig_ref);

		if (!postId) {
			return NextResponse.json({ ok: false, message: "post_id is required" }, { status: 400 });
		}
		if (!igRef) {
			return NextResponse.json({ ok: false, message: "ig_ref is required" }, { status: 400 });
		}

		const updateResult = await db
			.prepare(
				`UPDATE posts
				    SET ig_ref = ?,
				        updated_at = datetime('now')
				  WHERE post_id = ?`,
			)
			.bind(igRef, postId)
			.run();

		if ((updateResult.meta?.changes ?? 0) < 1) {
			return NextResponse.json({ ok: false, message: "post not found", post_id: postId }, { status: 404 });
		}

		return NextResponse.json({
			ok: true,
			post_id: postId,
			ig_ref: igRef,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to update ig_ref",
			},
			{ status: 500 },
		);
	}
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
