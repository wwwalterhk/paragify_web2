import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type GenerateHeading1ImgReadyPostRow = {
	post_id: number;
	user_pk: number;
	post_slug: string | null;
	title: string | null;
	prepare_status: string | null;
	visibility: string;
	prepare_content: string | null;
	prepare_content_refined: string | null;
	refine_prepare_content: number | null;
	cover_img_url: string | null;
	generate_cover_img: number | null;
	heading_1_img_url: string | null;
	generate_heading_1_img: number;
	prepare_url: string | null;
	prepare_plan: string | null;
	prepare_mode: string | null;
	created_at: string | null;
	updated_at: string | null;
	author_name: string | null;
	author_handle: string | null;
};

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toPositiveInt(value: string | null, fallback: number): number {
	if (!value) return fallback;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.floor(parsed);
}

function toOptionalInteger(value: string | null): number | null {
	if (value === null) return null;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return null;
	return Math.floor(parsed);
}

export async function GET(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const requestUrl = new URL(request.url);
		const page = toPositiveInt(requestUrl.searchParams.get("page"), 1);
		const limit = Math.min(toPositiveInt(requestUrl.searchParams.get("limit"), 20), 100);
		const offset = (page - 1) * limit;
		const generateHeading1ImgRaw = readString(requestUrl.searchParams.get("generate_heading_1_img"));
		const generateHeading1Img = toOptionalInteger(generateHeading1ImgRaw);
		if (generateHeading1ImgRaw !== null && generateHeading1Img === null) {
			return NextResponse.json({ ok: false, message: "generate_heading_1_img must be an integer" }, { status: 400 });
		}
		const generateHeading1ImgFilter = generateHeading1Img ?? 1;

		const whereClause = `
      p.visibility = 'prepare'
      AND p.prepare_content IS NOT NULL
      AND trim(p.prepare_content) <> ''
      AND p.generate_heading_1_img = ?
    `;
		const whereBindings: Array<number> = [generateHeading1ImgFilter];

		const totalRow = await db
			.prepare(`SELECT COUNT(1) AS total FROM posts p WHERE ${whereClause}`)
			.bind(...whereBindings)
			.first<{ total: number }>();
		const total = totalRow?.total ?? 0;

		const postsResult = await db
			.prepare(
				`SELECT
            p.post_id,
            p.user_pk,
            p.post_slug,
            p.title,
            p.prepare_status,
            p.visibility,
            p.prepare_content,
            p.prepare_content_refined,
            p.refine_prepare_content,
            p.cover_img_url,
            p.generate_cover_img,
            p.heading_1_img_url,
            p.generate_heading_1_img,
            p.prepare_url,
            p.prepare_plan,
            p.prepare_mode,
            p.created_at,
            p.updated_at,
            u.name AS author_name,
            u.user_id AS author_handle
          FROM posts p
          LEFT JOIN users u ON u.user_pk = p.user_pk
          WHERE ${whereClause}
          ORDER BY p.updated_at DESC, p.post_id DESC
          LIMIT ? OFFSET ?`,
			)
			.bind(...whereBindings, limit, offset)
			.all<GenerateHeading1ImgReadyPostRow>();

		const posts = postsResult.results ?? [];
		const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
		const hasMore = offset + posts.length < total;

		return NextResponse.json({
			ok: true,
			posts,
			paging: {
				page,
				limit,
				total,
				total_pages: totalPages,
				has_more: hasMore,
				next_page: hasMore ? page + 1 : null,
			},
			filters: {
				visibility: "prepare",
				require_prepare_content_non_empty: true,
				generate_heading_1_img: generateHeading1ImgFilter,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to load generate-heading-1-img posts",
			},
			{ status: 500 },
		);
	}
}
