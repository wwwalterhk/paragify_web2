import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sendWebContentPrepareStatusPush } from "@/lib/web-content-push";

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

function readActiveStatus(value: unknown): number | null {
	if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1) {
		return value;
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (/^\d+$/.test(trimmed)) {
			const parsed = Number(trimmed);
			if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 1) {
				return parsed;
			}
		}
	}
	return null;
}

function readPrepareStatus(value: unknown): number | null {
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

		if (!contentId) {
			return NextResponse.json({ ok: false, message: "invalid content_id" }, { status: 400 });
		}

		let column: "status" | "prepare_status";
		let nextValue: number | null;
		let invalidMessage: string;

		if (body?.status !== undefined) {
			column = "status";
			nextValue = readActiveStatus(body.status);
			invalidMessage = "invalid status";
		} else if (body?.prepare_status !== undefined) {
			column = "prepare_status";
			nextValue = readPrepareStatus(body.prepare_status);
			invalidMessage = "invalid prepare_status";
		} else {
			return NextResponse.json({ ok: false, message: "status or prepare_status is required" }, { status: 400 });
		}

		if (nextValue === null) {
			return NextResponse.json({ ok: false, message: invalidMessage }, { status: 400 });
		}

		const updateResult = await db
			.prepare(`UPDATE web_contents SET ${column} = ?, updated_at = datetime('now') WHERE content_id = ?`)
			.bind(nextValue, contentId)
			.run();

		if ((updateResult.meta?.changes ?? 0) < 1) {
			return NextResponse.json({ ok: false, message: "web_content not found" }, { status: 404 });
		}

		const row = await db
			.prepare(
				`SELECT content_id, content_slug, user_pk, status, prepare_status, updated_at
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
				prepare_status: number | null;
				updated_at: string | null;
			}>();

		if (column === "prepare_status" && nextValue === 3) {
			await sendWebContentPrepareStatusPush(db, contentId, nextValue);
		}

		return NextResponse.json({
			ok: true,
			web_content: row ?? {
				content_id: contentId,
				status: column === "status" ? nextValue : null,
				prepare_status: column === "prepare_status" ? nextValue : null,
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
