import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

type DbBindings = CloudflareEnv & { DB?: D1Database; JWT_SECRET?: string };

type AdminUserRow = {
	user_pk: number;
	role: string | null;
};

type CategoryLookupRow = {
	posts_category_id: number;
	code: string;
	name: string | null;
	slug: string | null;
	description: string | null;
	sort_order: number;
};

type SubcategoryRow = {
	posts_subcategory_id: number;
	code: string;
	sort_order: number;
	name: string | null;
	slug: string | null;
	description: string | null;
	is_active: number | null;
};

type CreateSubcategoryRequestBody = {
	category_code?: unknown;
	code?: unknown;
	name?: unknown;
	sort_order?: unknown;
	locale?: unknown;
	slug?: unknown;
	description?: unknown;
	is_active?: unknown;
};

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readCode(value: unknown): string | null {
	return readString(value)?.toLowerCase() ?? null;
}

function readLocale(value: unknown): string {
	const trimmed = readString(value)?.toLowerCase() ?? "";
	return trimmed || "en";
}

function readBoolean(value: unknown, fallback: boolean): boolean {
	if (typeof value === "boolean") return value;
	if (typeof value === "number") return value !== 0;
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
		if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
	}
	return fallback;
}

function parseSortOrder(value: unknown): number | null {
	const raw = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
	if (!Number.isFinite(raw)) return null;
	return Math.max(0, Math.floor(raw));
}

function toSlug(value: string): string {
	const normalized = value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");
	return normalized || "item";
}

async function resolveEmail(req: Request, env: DbBindings, db: D1Database): Promise<string | null> {
	try {
		const session = await getServerSession(authOptions);
		const email = readString(session?.user?.email);
		if (email) return email.toLowerCase();
	} catch {
		// ignore and fallback to bearer token
	}

	const authorization = req.headers.get("authorization") || "";
	if (!authorization.toLowerCase().startsWith("bearer ")) {
		return null;
	}

	const token = authorization.slice(7).trim();
	if (!token) return null;

	const jwtSecret = readString(env.JWT_SECRET) ?? readString(process.env.JWT_SECRET);
	if (!jwtSecret) return null;

	try {
		const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret), {
			algorithms: ["HS256"],
			clockTolerance: "120s",
		});
		const email = readString(payload.email)?.toLowerCase();
		const jti = readString(payload.jti);
		if (!email || !jti) return null;

		const sessionRow = await db
			.prepare(
				`SELECT 1
           FROM user_sessions us
           JOIN users u ON us.user_pk = u.user_pk
          WHERE us.session_token = ?
            AND us.expires_at > datetime('now')
            AND lower(u.email) = ?
          LIMIT 1`,
			)
			.bind(jti, email)
			.first<{ 1: number }>();

		return sessionRow ? email : null;
	} catch {
		return null;
	}
}

async function assertAdmin(req: Request, bindings: DbBindings, db: D1Database): Promise<NextResponse | null> {
	const email = await resolveEmail(req, bindings, db);
	if (!email) {
		return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
	}

	const adminUser = await db
		.prepare("SELECT user_pk, role FROM users WHERE lower(email) = ? LIMIT 1")
		.bind(email)
		.first<AdminUserRow>();
	if (!adminUser?.user_pk) {
		return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
	}
	if ((adminUser.role ?? "").toLowerCase() !== "admin") {
		return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
	}
	return null;
}

async function readCategoryByCode(db: D1Database, locale: string, categoryCode: string): Promise<CategoryLookupRow | null> {
	return db
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
        WHERE lower(pc.code) = ?
        LIMIT 1`,
		)
		.bind(locale, categoryCode)
		.first<CategoryLookupRow>();
}

async function readSubcategoryByCode(
	db: D1Database,
	locale: string,
	categoryId: number,
	code: string,
): Promise<SubcategoryRow | null> {
	return db
		.prepare(
			`SELECT
          psc.posts_subcategory_id,
          psc.code,
          psc.sort_order,
          psc.is_active,
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
        WHERE psc.posts_category_id = ?
          AND lower(psc.code) = ?
        LIMIT 1`,
		)
		.bind(locale, categoryId, code)
		.first<SubcategoryRow>();
}

export async function GET(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const authError = await assertAdmin(request, bindings, db);
		if (authError) return authError;

		const requestUrl = new URL(request.url);
		const locale = readLocale(requestUrl.searchParams.get("locale"));
		const categoryCode = readCode(
			requestUrl.searchParams.get("category_code") ?? requestUrl.searchParams.get("categoryCode"),
		);
		const includeInactive = readBoolean(requestUrl.searchParams.get("include_inactive"), false);

		if (!categoryCode) {
			return NextResponse.json({ ok: false, message: "category_code is required" }, { status: 400 });
		}

		const category = await readCategoryByCode(db, locale, categoryCode);
		if (!category?.posts_category_id) {
			return NextResponse.json({ ok: false, message: "posts category not found", category_code: categoryCode }, { status: 404 });
		}

		const whereClause = includeInactive ? "1=1" : "psc.is_active = 1";
		const rows = await db
			.prepare(
				`SELECT
            psc.posts_subcategory_id,
            psc.code,
            psc.sort_order,
            psc.is_active,
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
          WHERE psc.posts_category_id = ?
            AND ${whereClause}
          ORDER BY psc.sort_order ASC, psc.posts_subcategory_id ASC`,
			)
			.bind(locale, category.posts_category_id)
			.all<SubcategoryRow>();

		const subcategories = (rows.results ?? []).map((row) => ({
			posts_subcategory_id: row.posts_subcategory_id,
			code: row.code,
			sort_order: row.sort_order,
			is_active: row.is_active ?? 0,
			name: row.name ?? row.code,
			slug: row.slug ?? row.code,
			description: row.description,
		}));

		return NextResponse.json({
			ok: true,
			locale,
			include_inactive: includeInactive,
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
			{ ok: false, message: error instanceof Error ? error.message : "Failed to load posts subcategories" },
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const authError = await assertAdmin(request, bindings, db);
		if (authError) return authError;

		const body = (await request.json().catch(() => null)) as CreateSubcategoryRequestBody | null;
		const categoryCode = readCode(body?.category_code);
		const code = readCode(body?.code);
		if (!categoryCode) {
			return NextResponse.json({ ok: false, message: "category_code is required" }, { status: 400 });
		}
		if (!code) {
			return NextResponse.json({ ok: false, message: "code is required" }, { status: 400 });
		}

		const locale = readLocale(body?.locale);
		const category = await readCategoryByCode(db, locale, categoryCode);
		if (!category?.posts_category_id) {
			return NextResponse.json({ ok: false, message: "posts category not found", category_code: categoryCode }, { status: 404 });
		}

		const name = readString(body?.name) ?? code;
		const slug = readString(body?.slug) ?? toSlug(name);
		const description = readString(body?.description);
		const sortOrder = parseSortOrder(body?.sort_order) ?? 1000;
		const isActive = readBoolean(body?.is_active, true) ? 1 : 0;

		const existing = await db
			.prepare(
				`SELECT posts_subcategory_id
         FROM posts_subcategories
        WHERE posts_category_id = ?
          AND lower(code) = ?
        LIMIT 1`,
			)
			.bind(category.posts_category_id, code)
			.first<{ posts_subcategory_id: number }>();

		let postsSubcategoryId = existing?.posts_subcategory_id ?? null;
		let action: "created" | "updated" = "updated";

		if (postsSubcategoryId) {
			await db
				.prepare("UPDATE posts_subcategories SET sort_order = ?, is_active = ? WHERE posts_subcategory_id = ?")
				.bind(sortOrder, isActive, postsSubcategoryId)
				.run();
		} else {
			action = "created";
			const insertResult = await db
				.prepare("INSERT INTO posts_subcategories (posts_category_id, code, sort_order, is_active) VALUES (?, ?, ?, ?)")
				.bind(category.posts_category_id, code, sortOrder, isActive)
				.run();
			postsSubcategoryId = Number(insertResult.meta?.last_row_id ?? 0) || null;
		}

		if (!postsSubcategoryId) {
			const fallback = await db
				.prepare(
					`SELECT posts_subcategory_id
             FROM posts_subcategories
            WHERE posts_category_id = ?
              AND lower(code) = ?
            LIMIT 1`,
				)
				.bind(category.posts_category_id, code)
				.first<{ posts_subcategory_id: number }>();
			postsSubcategoryId = fallback?.posts_subcategory_id ?? null;
		}

		if (!postsSubcategoryId) {
			return NextResponse.json({ ok: false, message: "Failed to resolve posts_subcategory_id" }, { status: 500 });
		}

		const translationExists = await db
			.prepare(
				`SELECT 1
         FROM posts_subcategory_translations
        WHERE posts_subcategory_id = ?
          AND lower(locale) = ?
        LIMIT 1`,
			)
			.bind(postsSubcategoryId, locale)
			.first<{ 1: number }>();

		if (translationExists) {
			await db
				.prepare(
					`UPDATE posts_subcategory_translations
              SET name = ?, slug = ?, description = ?
            WHERE posts_subcategory_id = ?
              AND lower(locale) = ?`,
				)
				.bind(name, slug, description, postsSubcategoryId, locale)
				.run();
		} else {
			await db
				.prepare(
					`INSERT INTO posts_subcategory_translations (posts_subcategory_id, locale, name, slug, description)
             VALUES (?, ?, ?, ?, ?)`,
				)
				.bind(postsSubcategoryId, locale, name, slug, description)
				.run();
		}

		const subcategory = await readSubcategoryByCode(db, locale, category.posts_category_id, code);
		if (!subcategory?.posts_subcategory_id) {
			return NextResponse.json({ ok: false, message: "Failed to load saved subcategory", code }, { status: 500 });
		}

		return NextResponse.json({
			ok: true,
			action,
			message: action === "created" ? "Subcategory created" : "Subcategory updated",
			locale,
			category: {
				posts_category_id: category.posts_category_id,
				code: category.code,
				sort_order: category.sort_order,
				name: category.name ?? category.code,
				slug: category.slug ?? category.code,
				description: category.description,
			},
			subcategory: {
				posts_subcategory_id: subcategory.posts_subcategory_id,
				code: subcategory.code,
				sort_order: subcategory.sort_order,
				is_active: subcategory.is_active ?? 0,
				name: subcategory.name ?? subcategory.code,
				slug: subcategory.slug ?? subcategory.code,
				description: subcategory.description,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "Failed to save posts subcategory" },
			{ status: 500 },
		);
	}
}

export function PATCH() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}

export function PUT() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}

export function DELETE() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
