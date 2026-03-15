import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type UpdateStatusPayload = {
	content_id?: unknown;
	status?: unknown;
	prepare_status?: unknown;
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

function readStatus(value: unknown): number | null {
	if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3) {
		return value;
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (/^\d+$/.test(trimmed)) {
			const parsed = Number(trimmed);
			if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 3) {
				return parsed;
			}
		}
	}
	return null;
}

export async function POST(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const db = (env as DbBindings).DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const body = (await request.json().catch(() => null)) as UpdateStatusPayload | null;
		const contentId = readPositiveInteger(body?.content_id);
		const status = readStatus(body?.status ?? body?.prepare_status);

		if (!contentId) {
			return NextResponse.json({ ok: false, message: "invalid content_id" }, { status: 400 });
		}
		if (status === null) {
			return NextResponse.json({ ok: false, message: "invalid status" }, { status: 400 });
		}

		const updateResult = await db
			.prepare("UPDATE web_contents SET status = ?, updated_at = datetime('now') WHERE content_id = ?")
			.bind(status, contentId)
			.run();

		if ((updateResult.meta?.changes ?? 0) < 1) {
			return NextResponse.json({ ok: false, message: "web_content not found" }, { status: 404 });
		}

		const row = await db
			.prepare(
				`SELECT content_id, content_slug, user_pk, status, updated_at
         FROM web_contents
         WHERE content_id = ?
         LIMIT 1`,
			)
			.bind(contentId)
			.first<{
				content_id: number;
				content_slug: string | null;
				user_pk: number;
				status: number | null;
				updated_at: string | null;
			}>();

		return NextResponse.json({
			ok: true,
			web_content: row ?? {
				content_id: contentId,
				status,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "failed to update status" },
			{ status: 500 },
		);
	}
}

export const PUT = POST;

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
