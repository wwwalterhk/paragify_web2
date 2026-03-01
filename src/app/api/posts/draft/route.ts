import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type DraftStatusPayload = {
	post_id?: number | string | null;
	prepare_mode?: string | null;
};

function parsePostId(value: unknown): number | null {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (/^\d+$/.test(trimmed)) return Number(trimmed);
	}
	return null;
}

function asTrimmedOrNull(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

export async function POST(request: Request) {
	const contentType = request.headers.get("content-type") || "";
	if (!contentType.toLowerCase().includes("application/json")) {
		return NextResponse.json({ ok: false, message: "Content-Type must be application/json" }, { status: 415 });
	}

	const body = (await request.json().catch(() => null)) as DraftStatusPayload | null;
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		return NextResponse.json({ ok: false, message: "invalid json body" }, { status: 400 });
	}

	const postId = parsePostId(body.post_id);
	if (!postId) return NextResponse.json({ ok: false, message: "invalid post_id" }, { status: 400 });
	const prepareMode = asTrimmedOrNull(body.prepare_mode);

	const { env } = await getCloudflareContext({ async: true });
	const db = (env as CloudflareEnv & { DB?: D1Database }).DB;
	if (!db) return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });

	try {
		const update = await db
			.prepare(
				`UPDATE posts
				    SET prepare_status = 'drafted',
				        visibility = 'prepare_done',
				        prepare_mode = COALESCE(?, prepare_mode),
				        updated_at = datetime('now')
				  WHERE post_id = ?
				    AND prepare_status = 'fetch_plan_done'
				    AND visibility = 'prepare'`
			)
			.bind(prepareMode, postId)
			.run();

		if ((update.meta?.changes ?? 0) < 1) {
			return NextResponse.json(
				{ ok: false, message: "post is not in prepare visibility with fetch_plan_done status", post_id: postId },
				{ status: 409 }
			);
		}

		return NextResponse.json({ ok: true, post_id: postId, prepare_status: "drafted", visibility: "prepare_done" });
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: "failed to update prepare_status", detail: `${error}` },
			{ status: 500 }
		);
	}
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
