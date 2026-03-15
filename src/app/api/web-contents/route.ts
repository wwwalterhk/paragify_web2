import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type CreateWebContentPayload = {
	user_pk?: unknown;
	prepare_url?: unknown;
	locale?: unknown;
	write_style?: unknown;
	title?: unknown;
};

type WebContentRow = {
	content_id: number;
	user_pk: number;
	write_style: string | null;
	content_slug: string | null;
	locale: string | null;
	title: string | null;
	cover_img_url: string | null;
	prepare_status: number | null;
	prepare_url: string | null;
	prepare_src: string | null;
	prepare_content: string | null;
	prepare_content_refined: string | null;
	refine_prepare_content: number | null;
	batch_id: string | null;
	created_at: string | null;
	updated_at: string | null;
};

const CONTENT_SLUG_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const CONTENT_SLUG_LENGTH = 10;
const CONTENT_SLUG_INSERT_ATTEMPTS = 8;

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPositiveInteger(value: unknown): number | null {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) {
		return value;
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (/^\d+$/.test(trimmed)) {
			const parsed = Number(trimmed);
			if (Number.isInteger(parsed) && parsed > 0) {
				return parsed;
			}
		}
	}
	return null;
}

function toSafeLimit(raw: unknown, fallback = 20, max = 100): number {
	const parsed = readPositiveInteger(raw);
	if (!parsed) return fallback;
	return Math.min(parsed, max);
}

function generateContentSlug(length: number): string {
	const bytes = randomBytes(length);
	let output = "";
	for (let index = 0; index < bytes.length; index += 1) {
		output += CONTENT_SLUG_ALPHABET[bytes[index] % CONTENT_SLUG_ALPHABET.length];
	}
	return output;
}

function isContentSlugUniqueConstraintError(error: unknown): boolean {
	const message = `${error}`.toLowerCase();
	return message.includes("unique constraint failed") && message.includes("web_contents.content_slug");
}

export async function POST(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const db = (env as DbBindings).DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const body = (await request.json().catch(() => null)) as CreateWebContentPayload | null;
		const userPk = readPositiveInteger(body?.user_pk);
		const prepareUrl = readString(body?.prepare_url);
		const locale = readString(body?.locale) ?? "zh";
		const writeStyle = readString(body?.write_style);
		const title = readString(body?.title);

		if (!userPk) {
			return NextResponse.json({ ok: false, message: "invalid user_pk" }, { status: 400 });
		}
		if (!prepareUrl) {
			return NextResponse.json({ ok: false, message: "prepare_url is required" }, { status: 400 });
		}

		let createdId: number | null = null;
		let contentSlug: string | null = null;

		for (let attempt = 0; attempt < CONTENT_SLUG_INSERT_ATTEMPTS; attempt += 1) {
			const candidateSlug = generateContentSlug(CONTENT_SLUG_LENGTH);
			try {
				const insertResult = await db
					.prepare(
						`INSERT INTO web_contents (
              user_pk,
              write_style,
              content_slug,
              locale,
              title,
              prepare_status,
              prepare_url,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
					)
					.bind(userPk, writeStyle, candidateSlug, locale, title, 0, prepareUrl)
					.run();

				const nextId = Number(insertResult.meta?.last_row_id ?? 0);
				if (!nextId) {
					return NextResponse.json({ ok: false, message: "failed to create web content" }, { status: 500 });
				}

				createdId = nextId;
				contentSlug = candidateSlug;
				break;
			} catch (error) {
				if (isContentSlugUniqueConstraintError(error) && attempt < CONTENT_SLUG_INSERT_ATTEMPTS - 1) {
					continue;
				}
				throw error;
			}
		}

		if (!createdId || !contentSlug) {
			return NextResponse.json({ ok: false, message: "failed to generate unique content_slug" }, { status: 500 });
		}

		const created = await db
			.prepare(
				`SELECT
            content_id,
            user_pk,
            write_style,
            content_slug,
            locale,
            title,
            cover_img_url,
            prepare_status,
            prepare_url,
            prepare_src,
            prepare_content,
            prepare_content_refined,
            refine_prepare_content,
            batch_id,
            created_at,
            updated_at
          FROM web_contents
          WHERE content_id = ?
          LIMIT 1`,
			)
			.bind(createdId)
			.first<WebContentRow>();

		return NextResponse.json({
			ok: true,
			web_content: created ?? {
				content_id: createdId,
				user_pk: userPk,
				content_slug: contentSlug,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "failed to create web content" },
			{ status: 500 },
		);
	}
}

export async function GET(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const db = (env as DbBindings).DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const requestUrl = new URL(request.url);
		const contentSlug = readString(requestUrl.searchParams.get("content_slug"));
		const contentId = readPositiveInteger(requestUrl.searchParams.get("content_id"));
		const userPk = readPositiveInteger(requestUrl.searchParams.get("user_pk"));
		const limit = toSafeLimit(requestUrl.searchParams.get("limit"));

		if (contentSlug || contentId) {
			const row = contentSlug
				? await db
						.prepare(
							`SELECT
                  content_id,
                  user_pk,
                  write_style,
                  content_slug,
                  locale,
                  title,
                  cover_img_url,
                  prepare_status,
                  prepare_url,
                  prepare_src,
                  prepare_content,
                  prepare_content_refined,
                  refine_prepare_content,
                  batch_id,
                  created_at,
                  updated_at
                FROM web_contents
                WHERE content_slug = ?
                LIMIT 1`,
						)
						.bind(contentSlug)
						.first<WebContentRow>()
				: await db
						.prepare(
							`SELECT
                  content_id,
                  user_pk,
                  write_style,
                  content_slug,
                  locale,
                  title,
                  cover_img_url,
                  prepare_status,
                  prepare_url,
                  prepare_src,
                  prepare_content,
                  prepare_content_refined,
                  refine_prepare_content,
                  batch_id,
                  created_at,
                  updated_at
                FROM web_contents
                WHERE content_id = ?
                LIMIT 1`,
						)
						.bind(contentId as number)
						.first<WebContentRow>();

			if (!row) {
				return NextResponse.json({ ok: false, message: "web_content not found" }, { status: 404 });
			}
			return NextResponse.json({ ok: true, web_content: row });
		}

		if (!userPk) {
			return NextResponse.json(
				{ ok: false, message: "provide content_slug/content_id or user_pk" },
				{ status: 400 },
			);
		}

		const rows = await db
			.prepare(
				`SELECT
            content_id,
            user_pk,
            write_style,
            content_slug,
            locale,
            title,
            cover_img_url,
            prepare_status,
            prepare_url,
            prepare_src,
            prepare_content,
            prepare_content_refined,
            refine_prepare_content,
            batch_id,
            created_at,
            updated_at
          FROM web_contents
          WHERE user_pk = ?
          ORDER BY created_at DESC, content_id DESC
          LIMIT ?`,
			)
			.bind(userPk, limit)
			.all<WebContentRow>();

		return NextResponse.json({
			ok: true,
			web_contents: rows.results ?? [],
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "failed to enquire web contents" },
			{ status: 500 },
		);
	}
}
