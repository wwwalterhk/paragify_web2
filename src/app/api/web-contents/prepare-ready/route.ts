import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type WebContentRow = {
	content_id: number;
	user_pk: number;
	write_style: string | null;
	content_slug: string | null;
	locale: string | null;
	title: string | null;
	cover_img_url: string | null;
	status: number | null;
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

function toSafeLimit(value: unknown, fallback = 20, max = 100): number {
	const parsed = readPositiveInteger(value);
	if (!parsed) return fallback;
	return Math.min(parsed, max);
}

export async function GET(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const db = (env as DbBindings).DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const requestUrl = new URL(request.url);
		const limit = toSafeLimit(requestUrl.searchParams.get("limit"));

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
            status,
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
          WHERE status = 1
            AND prepare_status = 0
          ORDER BY created_at ASC, content_id ASC
          LIMIT ?`,
			)
			.bind(limit)
			.all<WebContentRow>();

		return NextResponse.json({
			ok: true,
			web_contents: rows.results ?? [],
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "failed to get prepare-ready web contents" },
			{ status: 500 },
		);
	}
}

export function POST() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
