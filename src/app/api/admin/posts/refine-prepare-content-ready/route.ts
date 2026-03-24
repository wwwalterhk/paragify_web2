import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type RefinedPreparePostRow = {
	post_id: number;
	user_pk: number;
	post_slug: string | null;
	cat_code: string | null;
	sub_cat_code: string | null;
	prepare_post_id_cnt: number;
	title: string | null;
	prepare_status: string | null;
	visibility: string;
	prepare_content: string | null;
	refine_prepare_content: number;
	heading_1_img_url: string | null;
	generate_heading_1_img: number;
	heading_2_img_url: string | null;
	generate_heading_2_img: number;
	prepare_url: string | null;
	prepare_plan: string | null;
	prepare_mode: string | null;
	created_at: string | null;
	updated_at: string | null;
	author_name: string | null;
	author_handle: string | null;
};

const PREPARE_POST_ID_CNT_SQL = `(
  SELECT COUNT(1)
  FROM posts p2
  WHERE p2.prepare_post_id = p.post_id
    AND p2.visibility = 'public'
)`;

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toPositiveInt(value: string | null, fallback: number): number {
	if (!value) return fallback;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.floor(parsed);
}

function toOptionalNonNegativeInt(value: string | null): number | null {
	if (value === null) return null;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) return null;
	return Math.floor(parsed);
}

function toOptionalInteger(value: string | null): number | null {
	if (value === null) return null;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return null;
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
		const preparePostIdCntRaw = readString(requestUrl.searchParams.get("prepare_post_id_cnt"));
		const preparePostIdCnt = toOptionalNonNegativeInt(preparePostIdCntRaw);
		if (preparePostIdCntRaw !== null && preparePostIdCnt === null) {
			return NextResponse.json({ ok: false, message: "prepare_post_id_cnt must be a non-negative integer" }, { status: 400 });
		}
		const refinePrepareContentRaw = readString(requestUrl.searchParams.get("refine_prepare_content"));
		const refinePrepareContent = toOptionalInteger(refinePrepareContentRaw);
		if (refinePrepareContentRaw !== null && refinePrepareContent === null) {
			return NextResponse.json({ ok: false, message: "refine_prepare_content must be an integer" }, { status: 400 });
		}
		const refinePrepareContentFilter = refinePrepareContent ?? 1;

		const whereConditions = [
			`
      p.prepare_status = 'prepare_content_batch_done'
      AND p.visibility = 'prepare'
      AND p.prepare_content IS NOT NULL
      AND p.refine_prepare_content = ?
    `,
		];
		const whereBindings: Array<number> = [refinePrepareContentFilter];
		if (preparePostIdCnt !== null) {
			whereConditions.push(`AND ${PREPARE_POST_ID_CNT_SQL} = ?`);
			whereBindings.push(preparePostIdCnt);
		}
		const whereClause = whereConditions.join("\n");

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
            p.cat_code,
            p.sub_cat_code,
            ${PREPARE_POST_ID_CNT_SQL} AS prepare_post_id_cnt,
            p.title,
            p.prepare_status,
            p.visibility,
            p.prepare_content,
            p.refine_prepare_content,
            p.heading_1_img_url,
            p.generate_heading_1_img,
            p.heading_2_img_url,
            p.generate_heading_2_img,
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
			.all<RefinedPreparePostRow>();

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
				prepare_status: "prepare_content_batch_done",
				visibility: "prepare",
				require_prepare_content_non_null: true,
				refine_prepare_content: refinePrepareContentFilter,
				prepare_post_id_cnt: preparePostIdCnt,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to load refined prepare-content posts",
			},
			{ status: 500 },
		);
	}
}
