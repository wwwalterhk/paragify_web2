import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type PostLookupRow = {
	post_id: number;
};

type UpdateHeading2ImgBody = {
	post_id?: unknown;
	heading_2_img_url?: unknown;
	generate_heading_2_img?: unknown;
};

type ParsedNullableString = {
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

function parseBodyHeading2ImgUrl(value: unknown): ParsedNullableString {
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

		const body = (await request.json().catch(() => null)) as UpdateHeading2ImgBody | null;
		const postId = parseBodyPostId(body?.post_id);
		const hasHeading2ImgUrl = body !== null && typeof body === "object" && Object.prototype.hasOwnProperty.call(body, "heading_2_img_url");
		const heading2ImgUrl = parseBodyHeading2ImgUrl(hasHeading2ImgUrl ? body?.heading_2_img_url : undefined);
		const generateHeading2Img = parseBodyInteger(body?.generate_heading_2_img);

		if (!postId) {
			return NextResponse.json({ ok: false, message: "post_id is required" }, { status: 400 });
		}
		if (!heading2ImgUrl.ok) {
			return NextResponse.json({ ok: false, message: "heading_2_img_url must be a string, null, or omitted" }, { status: 400 });
		}
		if (generateHeading2Img === null) {
			return NextResponse.json({ ok: false, message: "generate_heading_2_img is required and must be an integer" }, { status: 400 });
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
		if (heading2ImgUrl.provided) {
			updateColumns.push("heading_2_img_url = ?");
			updateBindings.push(heading2ImgUrl.value);
		}
		updateColumns.push("generate_heading_2_img = ?", "updated_at = datetime('now')");
		updateBindings.push(generateHeading2Img);
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
			generate_heading_2_img: generateHeading2Img,
			...(heading2ImgUrl.provided ? { heading_2_img_url: heading2ImgUrl.value } : {}),
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to update heading-2 image fields",
			},
			{ status: 500 },
		);
	}
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
