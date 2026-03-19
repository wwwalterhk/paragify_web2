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

type CategoryRow = {
	posts_category_id: number;
	code: string;
	sort_order: number;
	name: string | null;
	slug: string | null;
	description: string | null;
	is_active: number | null;
};

type CreateCategoryRequestBody = {
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

async function readCategoryByCode(db: D1Database, locale: string, code: string): Promise<CategoryRow | null> {
	return db
		.prepare(
			`SELECT
          pc.posts_category_id,
          pc.code,
          pc.sort_order,
          pc.is_active,
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
		.bind(locale, code)
		.first<CategoryRow>();
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
		const includeInactive = readBoolean(requestUrl.searchParams.get("include_inactive"), false);
		const categoryCode = readCode(requestUrl.searchParams.get("category_code"));

		if (categoryCode) {
			const category = await readCategoryByCode(db, locale, categoryCode);
			if (!category?.posts_category_id) {
				return NextResponse.json({ ok: false, message: "posts category not found", category_code: categoryCode }, { status: 404 });
			}
			if (!includeInactive && (category.is_active ?? 0) !== 1) {
				return NextResponse.json({ ok: false, message: "posts category not active", category_code: categoryCode }, { status: 404 });
			}
			return NextResponse.json({
				ok: true,
				locale,
				category: {
					posts_category_id: category.posts_category_id,
					code: category.code,
					sort_order: category.sort_order,
					is_active: category.is_active ?? 0,
					name: category.name ?? category.code,
					slug: category.slug ?? category.code,
					description: category.description,
				},
			});
		}

		const whereClause = includeInactive ? "1=1" : "pc.is_active = 1";
		const rows = await db
			.prepare(
				`SELECT
            pc.posts_category_id,
            pc.code,
            pc.sort_order,
            pc.is_active,
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
          WHERE ${whereClause}
          ORDER BY pc.sort_order ASC, pc.posts_category_id ASC`,
			)
			.bind(locale)
			.all<CategoryRow>();

		const categories = (rows.results ?? []).map((row) => ({
			posts_category_id: row.posts_category_id,
			code: row.code,
			sort_order: row.sort_order,
			is_active: row.is_active ?? 0,
			name: row.name ?? row.code,
			slug: row.slug ?? row.code,
			description: row.description,
		}));

		return NextResponse.json({ ok: true, locale, categories, include_inactive: includeInactive });
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "Failed to load posts categories" },
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

		const body = (await request.json().catch(() => null)) as CreateCategoryRequestBody | null;
		const code = readCode(body?.code);
		if (!code) {
			return NextResponse.json({ ok: false, message: "code is required" }, { status: 400 });
		}

		const locale = readLocale(body?.locale);
		const name = readString(body?.name) ?? code;
		const slug = readString(body?.slug) ?? toSlug(name);
		const description = readString(body?.description);
		const sortOrder = parseSortOrder(body?.sort_order) ?? 1000;
		const isActive = readBoolean(body?.is_active, true) ? 1 : 0;

		const existing = await db
			.prepare("SELECT posts_category_id FROM posts_categories WHERE lower(code) = ? LIMIT 1")
			.bind(code)
			.first<{ posts_category_id: number }>();

		let postsCategoryId = existing?.posts_category_id ?? null;
		let action: "created" | "updated" = "updated";

		if (postsCategoryId) {
			await db
				.prepare("UPDATE posts_categories SET sort_order = ?, is_active = ? WHERE posts_category_id = ?")
				.bind(sortOrder, isActive, postsCategoryId)
				.run();
		} else {
			action = "created";
			const insertResult = await db
				.prepare("INSERT INTO posts_categories (code, sort_order, is_active) VALUES (?, ?, ?)")
				.bind(code, sortOrder, isActive)
				.run();
			postsCategoryId = Number(insertResult.meta?.last_row_id ?? 0) || null;
		}

		if (!postsCategoryId) {
			const fallback = await db
				.prepare("SELECT posts_category_id FROM posts_categories WHERE lower(code) = ? LIMIT 1")
				.bind(code)
				.first<{ posts_category_id: number }>();
			postsCategoryId = fallback?.posts_category_id ?? null;
		}

		if (!postsCategoryId) {
			return NextResponse.json({ ok: false, message: "Failed to resolve posts_category_id" }, { status: 500 });
		}

		const translationExists = await db
			.prepare(
				`SELECT 1
         FROM posts_category_translations
        WHERE posts_category_id = ?
          AND lower(locale) = ?
        LIMIT 1`,
			)
			.bind(postsCategoryId, locale)
			.first<{ 1: number }>();

		if (translationExists) {
			await db
				.prepare(
					`UPDATE posts_category_translations
              SET name = ?, slug = ?, description = ?
            WHERE posts_category_id = ?
              AND lower(locale) = ?`,
				)
				.bind(name, slug, description, postsCategoryId, locale)
				.run();
		} else {
			await db
				.prepare(
					`INSERT INTO posts_category_translations (posts_category_id, locale, name, slug, description)
             VALUES (?, ?, ?, ?, ?)`,
				)
				.bind(postsCategoryId, locale, name, slug, description)
				.run();
		}

		const category = await readCategoryByCode(db, locale, code);
		if (!category?.posts_category_id) {
			return NextResponse.json({ ok: false, message: "Failed to load saved category", code }, { status: 500 });
		}

		return NextResponse.json({
			ok: true,
			action,
			message: action === "created" ? "Category created" : "Category updated",
			locale,
			category: {
				posts_category_id: category.posts_category_id,
				code: category.code,
				sort_order: category.sort_order,
				is_active: category.is_active ?? 0,
				name: category.name ?? category.code,
				slug: category.slug ?? category.code,
				description: category.description,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "Failed to save posts category" },
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
