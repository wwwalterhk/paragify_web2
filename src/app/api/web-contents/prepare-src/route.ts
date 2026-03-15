import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sendWebContentPrepareStatusPush } from "@/lib/web-content-push";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type UpdateWebContentPrepareSrcPayload = {
	post_id?: unknown;
	content_id?: unknown;
	prepare_src?: unknown;
	prepare_status?: unknown;
};

type WebContentPrepareSrcRow = {
	content_id: number;
	prepare_src: string | null;
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

async function handleUpdatePrepareSrc(request: Request) {
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

		const body = (await request.json().catch(() => null)) as UpdateWebContentPrepareSrcPayload | null;
		if (!body || typeof body !== "object" || Array.isArray(body)) {
			return NextResponse.json({ ok: false, message: "invalid json body" }, { status: 400 });
		}

		const contentId = readPositiveInteger(body.content_id ?? body.post_id);
		const prepareStatus = readStatus(body.prepare_status);
		const hasPrepareSrc = Object.prototype.hasOwnProperty.call(body, "prepare_src");
		const prepareSrc = typeof body.prepare_src === "string" ? body.prepare_src : null;

		if (!contentId) {
			return NextResponse.json({ ok: false, message: "invalid post_id" }, { status: 400 });
		}
		if (!hasPrepareSrc || prepareSrc === null) {
			return NextResponse.json({ ok: false, message: "invalid prepare_src" }, { status: 400 });
		}
		if (prepareStatus === null) {
			return NextResponse.json({ ok: false, message: "invalid prepare_status" }, { status: 400 });
		}

		const updateResult = await db
			.prepare(
				`UPDATE web_contents
				    SET prepare_src = ?,
				        prepare_status = ?,
				        updated_at = datetime('now')
				  WHERE content_id = ?`,
			)
			.bind(prepareSrc, prepareStatus, contentId)
			.run();

		if ((updateResult.meta?.changes ?? 0) < 1) {
			return NextResponse.json({ ok: false, message: "web_content not found", post_id: contentId }, { status: 404 });
		}

		const row = await db
			.prepare(
				`SELECT content_id, prepare_src, prepare_status, updated_at
           FROM web_contents
          WHERE content_id = ?
          LIMIT 1`,
			)
			.bind(contentId)
			.first<WebContentPrepareSrcRow>();

		await sendWebContentPrepareStatusPush(db, contentId, prepareStatus);

		return NextResponse.json({
			ok: true,
			post_id: contentId,
			web_content: row ?? {
				content_id: contentId,
				prepare_src: prepareSrc,
				prepare_status: prepareStatus,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "failed to update web content prepare_src" },
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	return handleUpdatePrepareSrc(request);
}

export async function PATCH(request: Request) {
	return handleUpdatePrepareSrc(request);
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
