import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type UpdateWebContentBatchPayload = {
	post_id?: unknown;
	content_id?: unknown;
	batch_id?: unknown;
	prepare_status?: unknown;
};

type WebContentBatchRow = {
	content_id: number;
	batch_id: string | null;
	prepare_status: number | null;
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

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
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

async function handleUpdateBatchId(request: Request) {
	const contentType = request.headers.get("content-type") || "";
	if (!contentType.toLowerCase().includes("application/json")) {
		return NextResponse.json({ ok: false, message: "Content-Type must be application/json" }, { status: 415 });
	}

	try {
		const { env } = await getCloudflareContext({ async: true });
		const db = (env as DbBindings).DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const body = (await request.json().catch(() => null)) as UpdateWebContentBatchPayload | null;
		if (!body || typeof body !== "object" || Array.isArray(body)) {
			return NextResponse.json({ ok: false, message: "invalid json body" }, { status: 400 });
		}

		const contentId = readPositiveInteger(body.content_id ?? body.post_id);
		const batchId = readString(body.batch_id);
		const prepareStatus = readStatus(body.prepare_status);

		if (!contentId) {
			return NextResponse.json({ ok: false, message: "invalid post_id" }, { status: 400 });
		}
		if (!batchId) {
			return NextResponse.json({ ok: false, message: "invalid batch_id" }, { status: 400 });
		}
		if (prepareStatus === null) {
			return NextResponse.json({ ok: false, message: "invalid prepare_status" }, { status: 400 });
		}

		const updateResult = await db
			.prepare(
				`UPDATE web_contents
				    SET batch_id = ?,
				        prepare_status = ?,
				        updated_at = datetime('now')
				  WHERE content_id = ?`,
			)
			.bind(batchId, prepareStatus, contentId)
			.run();

		if ((updateResult.meta?.changes ?? 0) < 1) {
			return NextResponse.json({ ok: false, message: "web_content not found", post_id: contentId }, { status: 404 });
		}

		const row = await db
			.prepare(
				`SELECT content_id, batch_id, prepare_status, updated_at
           FROM web_contents
          WHERE content_id = ?
          LIMIT 1`,
			)
			.bind(contentId)
			.first<WebContentBatchRow>();

		return NextResponse.json({
			ok: true,
			post_id: contentId,
			web_content: row ?? {
				content_id: contentId,
				batch_id: batchId,
				prepare_status: prepareStatus,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "failed to update web content batch_id" },
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	return handleUpdateBatchId(request);
}

export async function PATCH(request: Request) {
	return handleUpdateBatchId(request);
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
