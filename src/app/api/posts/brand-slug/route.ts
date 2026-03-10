import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type UpdateBrandSlugPayload = {
	post_id?: number | string | null;
	brand_slug?: unknown;
};

function parsePostId(value: unknown): number | null {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (/^\d+$/.test(trimmed)) return Number(trimmed);
	}
	return null;
}

function readString(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

async function handleUpdateBrandSlug(request: Request) {
	const contentType = request.headers.get("content-type") || "";
	if (!contentType.toLowerCase().includes("application/json")) {
		return NextResponse.json({ ok: false, message: "Content-Type must be application/json" }, { status: 415 });
	}

	const body = (await request.json().catch(() => null)) as UpdateBrandSlugPayload | null;
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		return NextResponse.json({ ok: false, message: "invalid json body" }, { status: 400 });
	}

	const postId = parsePostId(body.post_id);
	const brandSlug = readString(body.brand_slug)?.toLowerCase() ?? null;
	if (!postId) {
		return NextResponse.json({ ok: false, message: "invalid post_id" }, { status: 400 });
	}
	if (!brandSlug) {
		return NextResponse.json({ ok: false, message: "invalid brand_slug" }, { status: 400 });
	}

	const { env } = await getCloudflareContext({ async: true });
	const db = (env as CloudflareEnv & { DB?: D1Database }).DB;
	if (!db) return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });

	try {
		const targetPost = await db
			.prepare("SELECT post_id FROM posts WHERE post_id = ? LIMIT 1")
			.bind(postId)
			.first<{ post_id: number }>();
		if (!targetPost?.post_id) {
			return NextResponse.json({ ok: false, message: "post not found", post_id: postId }, { status: 404 });
		}

		await db
			.prepare(
				`UPDATE posts
				    SET brand_slug = ?,
				        updated_at = datetime('now')
				  WHERE post_id = ?`,
			)
			.bind(brandSlug, postId)
			.run();

		return NextResponse.json({
			ok: true,
			post_id: postId,
			brand_slug: brandSlug,
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: "failed to update brand_slug", detail: `${error}` },
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	return handleUpdateBrandSlug(request);
}

export async function PATCH(request: Request) {
	return handleUpdateBrandSlug(request);
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}

