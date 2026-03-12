import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type PostPrepareSrcRow = {
	post_id: number;
	prepare_src: string | null;
};

function parsePostId(value: string | null): number | null {
	const raw = value ? Number(value) : NaN;
	if (!Number.isFinite(raw) || raw <= 0) {
		return null;
	}
	return Math.floor(raw);
}

function parsePossiblyEscapedJson(value: unknown, maxDepth = 4): unknown {
	let current: unknown = value;

	for (let depth = 0; depth < maxDepth; depth += 1) {
		if (typeof current !== "string") {
			break;
		}

		const trimmed = current.trim();
		if (!trimmed) {
			return null;
		}

		try {
			current = JSON.parse(trimmed) as unknown;
		} catch {
			return current;
		}
	}

	return current;
}

export async function GET(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const db = (env as CloudflareEnv & { DB?: D1Database }).DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const requestUrl = new URL(request.url);
		const postId = parsePostId(requestUrl.searchParams.get("post_id") ?? requestUrl.searchParams.get("postId"));
		if (!postId) {
			return NextResponse.json({ ok: false, message: "invalid post_id" }, { status: 400 });
		}

		const post = await db
			.prepare("SELECT post_id, prepare_src FROM posts WHERE post_id = ? LIMIT 1")
			.bind(postId)
			.first<PostPrepareSrcRow>();

		if (!post?.post_id) {
			return NextResponse.json({ ok: false, message: "post not found", post_id: postId }, { status: 404 });
		}

		const prepareSrc = post.prepare_src?.trim() ?? "";
		if (!prepareSrc) {
			return NextResponse.json({ ok: false, message: "prepare_src is empty", post_id: post.post_id }, { status: 404 });
		}

		const parsedPrepareSrc = parsePossiblyEscapedJson(prepareSrc, 4);
		if (!parsedPrepareSrc || typeof parsedPrepareSrc !== "object" || Array.isArray(parsedPrepareSrc)) {
			return NextResponse.json(
				{ ok: false, message: "prepare_src is not a valid JSON object", post_id: post.post_id },
				{ status: 422 },
			);
		}

		const imagesRaw = (parsedPrepareSrc as Record<string, unknown>).images;
		const images = parsePossiblyEscapedJson(imagesRaw, 2);
		if (typeof images === "undefined") {
			return NextResponse.json({ ok: false, message: "images not found in prepare_src", post_id: post.post_id }, { status: 404 });
		}

		return NextResponse.json({
			ok: true,
			post_id: post.post_id,
			images,
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: "failed to fetch prepare_src images", detail: `${error}` },
			{ status: 500 },
		);
	}
}

export function POST() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
