import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type DbBindings = CloudflareEnv & { DB?: D1Database };

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
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
		const generateCoverImgRaw = readString(requestUrl.searchParams.get("generate_cover_img"));
		const generateCoverImg = toOptionalInteger(generateCoverImgRaw);
		if (generateCoverImgRaw !== null && generateCoverImg === null) {
			return NextResponse.json({ ok: false, message: "generate_cover_img must be an integer" }, { status: 400 });
		}
		const generateCoverImgFilter = generateCoverImg ?? 1;

		const totalRow = await db
			.prepare(
				`SELECT COUNT(1) AS total
           FROM posts p
          WHERE p.visibility = 'prepare'
            AND p.prepare_content IS NOT NULL
            AND trim(p.prepare_content) <> ''
            AND p.generate_cover_img = ?`,
			)
			.bind(generateCoverImgFilter)
			.first<{ total: number }>();

		return NextResponse.json({
			ok: true,
			count: totalRow?.total ?? 0,
			filters: {
				visibility: "prepare",
				require_prepare_content_non_empty: true,
				generate_cover_img: generateCoverImgFilter,
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
