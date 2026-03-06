import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type DbBindings = CloudflareEnv & { DB?: D1Database };

const PREPARE_POST_ID_CNT_SQL = `(
  SELECT COUNT(1)
  FROM posts p2
  WHERE p2.prepare_post_id = p.post_id
    AND p2.visibility = 'public'
)`;

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toOptionalNonNegativeInt(value: string | null): number | null {
	if (value === null) return null;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) return null;
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
		const preparePostIdCntRaw = readString(requestUrl.searchParams.get("prepare_post_id_cnt"));
		const preparePostIdCnt = toOptionalNonNegativeInt(preparePostIdCntRaw);
		if (preparePostIdCntRaw !== null && preparePostIdCnt === null) {
			return NextResponse.json({ ok: false, message: "prepare_post_id_cnt must be a non-negative integer" }, { status: 400 });
		}

		const whereConditions = [
			`p.prepare_status = 'prepare_content_batch_done'`,
			`p.visibility = 'prepare'`,
			`p.prepare_content IS NOT NULL`,
			`p.refine_prepare_content = 1`,
		];
		const whereBindings: Array<number> = [];
		if (preparePostIdCnt !== null) {
			whereConditions.push(`${PREPARE_POST_ID_CNT_SQL} = ?`);
			whereBindings.push(preparePostIdCnt);
		}
		const whereClause = whereConditions.join("\n            AND ");

		const totalRow = await db
			.prepare(
				`SELECT COUNT(1) AS total
           FROM posts p
          WHERE ${whereClause}`,
			)
			.bind(...whereBindings)
			.first<{ total: number }>();

		return NextResponse.json({
			ok: true,
			count: totalRow?.total ?? 0,
			filters: {
				prepare_status: "prepare_content_batch_done",
				visibility: "prepare",
				require_prepare_content_non_null: true,
				refine_prepare_content: 1,
				prepare_post_id_cnt: preparePostIdCnt,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to load count",
			},
			{ status: 500 },
		);
	}
}
