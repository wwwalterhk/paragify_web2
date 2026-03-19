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

type PostSubcategoryRow = {
	posts_subcategory_id: number;
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

function readCategoryCode(value: string | null): string | null {
	const trimmed = value?.trim().toLowerCase() ?? "";
	return trimmed || null;
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
		const categoryCode = readCategoryCode(
			requestUrl.searchParams.get("category_code") ?? requestUrl.searchParams.get("categoryCode"),
		);
		if (!categoryCode) {
			return NextResponse.json({ ok: false, message: "category_code is required" }, { status: 400 });
		}

		const category = await db
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
            AND lower(pc.code) = ?
          LIMIT 1`,
			)
			.bind(locale, categoryCode)
			.first<PostCategoryRow>();

		if (!category?.posts_category_id) {
			return NextResponse.json({ ok: false, message: "posts category not found", category_code: categoryCode }, { status: 404 });
		}

		const subcategoriesResult = await db
			.prepare(
				`SELECT
            psc.posts_subcategory_id,
            psc.code,
            psc.sort_order,
            COALESCE(psct_local.name, psct_en.name, psc.code) AS name,
            COALESCE(psct_local.slug, psct_en.slug, psc.code) AS slug,
            COALESCE(psct_local.description, psct_en.description) AS description
          FROM posts_subcategories psc
          LEFT JOIN posts_subcategory_translations psct_local
            ON psct_local.posts_subcategory_id = psc.posts_subcategory_id
           AND lower(psct_local.locale) = ?
          LEFT JOIN posts_subcategory_translations psct_en
            ON psct_en.posts_subcategory_id = psc.posts_subcategory_id
           AND lower(psct_en.locale) = 'en'
          WHERE psc.is_active = 1
            AND psc.posts_category_id = ?
          ORDER BY psc.sort_order ASC, psc.posts_subcategory_id ASC`,
			)
			.bind(locale, category.posts_category_id)
			.all<PostSubcategoryRow>();

		const subcategories = (subcategoriesResult.results ?? []).map((row) => ({
			posts_subcategory_id: row.posts_subcategory_id,
			code: row.code,
			sort_order: row.sort_order,
			name: row.name ?? row.code,
			slug: row.slug ?? row.code,
			description: row.description,
		}));

		return NextResponse.json({
			ok: true,
			locale,
			category: {
				posts_category_id: category.posts_category_id,
				code: category.code,
				sort_order: category.sort_order,
				name: category.name ?? category.code,
				slug: category.slug ?? category.code,
				description: category.description,
			},
			subcategories,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to load posts subcategories",
			},
			{ status: 500 },
		);
	}
}

export function POST() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
