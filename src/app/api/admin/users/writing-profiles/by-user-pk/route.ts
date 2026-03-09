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

function toPositiveInt(value: string | null): number | null {
	if (!value) return null;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return null;
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
		const userPk = toPositiveInt(requestUrl.searchParams.get("user_pk") ?? requestUrl.searchParams.get("userPk"));
		if (!userPk) {
			return NextResponse.json({ ok: false, message: "user_pk is required" }, { status: 400 });
		}

		const user = await db
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
          WHERE user_pk = ?
            AND writing_style IS NOT NULL
            AND trim(writing_style) <> ''
            AND writing_locale IS NOT NULL
            AND trim(writing_locale) <> ''
          LIMIT 1`,
			)
			.bind(userPk)
			.first<WritingProfileRow>();

		if (!user) {
			return NextResponse.json({ ok: false, message: "writing profile not found", user_pk: userPk }, { status: 404 });
		}

		return NextResponse.json({
			ok: true,
			user,
			filters: {
				require_writing_style: true,
				require_writing_locale: true,
				user_pk: userPk,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to load writing profile",
			},
			{ status: 500 },
		);
	}
}
