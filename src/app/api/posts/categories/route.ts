import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type PostCategoryRow = {
	posts_category_id: number;
	code: string;
	sort_order: number;
	name: string | null;
	slug: string | null;
	description: string | null;
};

function readLocale(value: string | null): string {
	const trimmed = value?.trim().toLowerCase() ?? "";
	return trimmed || "en";
}

export async function GET(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const db = (env as CloudflareEnv & { DB?: D1Database }).DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const requestUrl = new URL(request.url);
		const locale = readLocale(requestUrl.searchParams.get("locale"));

		const categoriesResult = await db
			.prepare(
				`SELECT
            pc.posts_category_id,
            pc.code,
            pc.sort_order,
            COALESCE(pct_local.name, pct_en.name, pc.code) AS name,
            COALESCE(pct_local.slug, pct_en.slug, pc.code) AS slug,
            COALESCE(pct_local.description, pct_en.description) AS description
          FROM posts_categories pc
          LEFT JOIN posts_category_translations pct_local
            ON pct_local.posts_category_id = pc.posts_category_id
           AND lower(pct_local.locale) = ?
          LEFT JOIN posts_category_translations pct_en
            ON pct_en.posts_category_id = pc.posts_category_id
           AND lower(pct_en.locale) = 'en'
          WHERE pc.is_active = 1
          ORDER BY pc.sort_order ASC, pc.posts_category_id ASC`,
			)
			.bind(locale)
			.all<PostCategoryRow>();

		const categories = (categoriesResult.results ?? []).map((row) => ({
			posts_category_id: row.posts_category_id,
			code: row.code,
			sort_order: row.sort_order,
			name: row.name ?? row.code,
			slug: row.slug ?? row.code,
			description: row.description,
		}));

		return NextResponse.json({
			ok: true,
			locale,
			categories,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to load posts categories",
			},
			{ status: 500 },
		);
	}
}

export function POST() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
