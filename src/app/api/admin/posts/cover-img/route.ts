import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type PostLookupRow = {
	post_id: number;
};

type UpdateCoverImgBody = {
	post_id?: unknown;
	cover_img_url?: unknown;
	generate_cover_img?: unknown;
};

type ParsedOptionalString = {
	ok: boolean;
	provided: boolean;
	value: string | null;
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

function parseBodyCoverImgUrl(value: unknown): ParsedOptionalString {
	if (value === undefined) return { ok: true, provided: false, value: null };
	if (value === null) return { ok: true, provided: true, value: null };
	if (typeof value !== "string") return { ok: false, provided: true, value: null };
	const trimmed = value.trim();
	return { ok: true, provided: true, value: trimmed || null };
}

export async function PATCH(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const body = (await request.json().catch(() => null)) as UpdateCoverImgBody | null;
		const postId = parseBodyPostId(body?.post_id);
		const hasCoverImgUrl = body !== null && typeof body === "object" && Object.prototype.hasOwnProperty.call(body, "cover_img_url");
		const coverImgUrl = parseBodyCoverImgUrl(hasCoverImgUrl ? body?.cover_img_url : undefined);
		const generateCoverImg = parseBodyInteger(body?.generate_cover_img);

		if (!postId) {
			return NextResponse.json({ ok: false, message: "post_id is required" }, { status: 400 });
		}
		if (!coverImgUrl.ok) {
			return NextResponse.json({ ok: false, message: "cover_img_url must be a string, null, or omitted" }, { status: 400 });
		}
		if (generateCoverImg === null) {
			return NextResponse.json({ ok: false, message: "generate_cover_img is required and must be an integer" }, { status: 400 });
		}

		const post = await db
			.prepare("SELECT post_id FROM posts WHERE post_id = ? LIMIT 1")
			.bind(postId)
			.first<PostLookupRow>();
		if (!post?.post_id) {
			return NextResponse.json({ ok: false, message: "post not found", post_id: postId }, { status: 404 });
		}

		const updateColumns: string[] = [];
		const updateBindings: Array<string | number | null> = [];
		if (coverImgUrl.provided) {
			updateColumns.push("cover_img_url = ?");
			updateBindings.push(coverImgUrl.value);
		}
		updateColumns.push("generate_cover_img = ?", "updated_at = datetime('now')");
		updateBindings.push(generateCoverImg);
		updateBindings.push(postId);

		const updateResult = await db
			.prepare(
				`UPDATE posts
				    SET ${updateColumns.join(", ")}
				  WHERE post_id = ?`,
			)
			.bind(...updateBindings)
			.run();

		if ((updateResult.meta?.changes ?? 0) < 1) {
			return NextResponse.json({ ok: false, message: "failed to update post", post_id: postId }, { status: 409 });
		}

		return NextResponse.json({
			ok: true,
			post_id: postId,
			generate_cover_img: generateCoverImg,
			...(coverImgUrl.provided ? { cover_img_url: coverImgUrl.value } : {}),
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to update cover image fields",
			},
			{ status: 500 },
		);
	}
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
