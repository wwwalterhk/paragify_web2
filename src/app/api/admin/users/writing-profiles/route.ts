import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type WritingProfileRow = {
	user_pk: number;
	user_id: string | null;
	site: string | null;
	name: string | null;
	avatar_url: string | null;
	writing_style: string;
	writing_locale: string;
};

function toPositiveInt(value: string | null, fallback: number): number {
	if (!value) return fallback;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
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
		const limit = Math.min(toPositiveInt(requestUrl.searchParams.get("limit"), 50), 200);
		const offset = (page - 1) * limit;

		const whereClause = `
      writing_style IS NOT NULL
      AND trim(writing_style) <> ''
      AND writing_locale IS NOT NULL
      AND trim(writing_locale) <> ''
    `;

		const totalRow = await db
			.prepare(`SELECT COUNT(1) AS total FROM users WHERE ${whereClause}`)
			.first<{ total: number }>();
		const total = totalRow?.total ?? 0;

		const usersResult = await db
			.prepare(
				`SELECT
            user_pk,
            user_id,
            site,
            name,
            avatar_url,
            writing_style,
            writing_locale
          FROM users
          WHERE ${whereClause}
          ORDER BY user_pk DESC
          LIMIT ? OFFSET ?`,
			)
			.bind(limit, offset)
			.all<WritingProfileRow>();

		const users = usersResult.results ?? [];
		const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
		const hasMore = offset + users.length < total;

		return NextResponse.json({
			ok: true,
			users,
			paging: {
				page,
				limit,
				total,
				total_pages: totalPages,
				has_more: hasMore,
				next_page: hasMore ? page + 1 : null,
			},
			filters: {
				require_writing_style: true,
				require_writing_locale: true,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to load writing profiles",
			},
			{ status: 500 },
		);
	}
}
