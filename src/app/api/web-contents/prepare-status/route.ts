import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type UpdatePrepareStatusPayload = {
	post_id?: unknown;
	content_id?: unknown;
	prepare_status?: unknown;
	html?: unknown;
	prepare_html?: unknown;
	source_html?: unknown;
	raw_html?: unknown;
};

type WebContentPrepareStatusRow = {
	content_id: number;
	prepare_status: number | null;
	html_length: number | null;
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

function sanitizeHtml(html: string): string {
	const raw = `${html ?? ""}`;
	if (!raw) return "";

	return raw
		.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
		.replace(/<script\b[^>]*\/\s*>/gi, "")
		.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
		.replace(/<style\b[^>]*\/\s*>/gi, "")
		.replace(/<link\b[^>]*>/gi, "");
}

function pickHtmlSource(body: UpdatePrepareStatusPayload): { hasHtml: boolean; html: string | null } {
	const keys: Array<keyof UpdatePrepareStatusPayload> = ["html", "prepare_html", "source_html", "raw_html"];
	for (const key of keys) {
		if (!Object.prototype.hasOwnProperty.call(body, key)) {
			continue;
		}
		const value = body[key];
		if (typeof value !== "string") {
			return { hasHtml: true, html: null };
		}
		return { hasHtml: true, html: value };
	}
	return { hasHtml: false, html: null };
}

async function handleUpdatePrepareStatus(request: Request) {
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

		const body = (await request.json().catch(() => null)) as UpdatePrepareStatusPayload | null;
		if (!body || typeof body !== "object" || Array.isArray(body)) {
			return NextResponse.json({ ok: false, message: "invalid json body" }, { status: 400 });
		}

		const contentId = readPositiveInteger(body.content_id ?? body.post_id);
		const prepareStatus = readPrepareStatus(body.prepare_status);
		const htmlSource = pickHtmlSource(body);

		if (!contentId) {
			return NextResponse.json({ ok: false, message: "invalid post_id" }, { status: 400 });
		}
		if (prepareStatus === null) {
			return NextResponse.json({ ok: false, message: "invalid prepare_status" }, { status: 400 });
		}
		if (htmlSource.hasHtml && htmlSource.html === null) {
			return NextResponse.json({ ok: false, message: "invalid html" }, { status: 400 });
		}

		const htmlLength = htmlSource.hasHtml ? sanitizeHtml(htmlSource.html ?? "").length : null;

		const updateResult = await db
			.prepare(
				`UPDATE web_contents
				    SET prepare_status = ?,
				        html_length = COALESCE(?, html_length),
				        updated_at = datetime('now')
				  WHERE content_id = ?`,
			)
			.bind(prepareStatus, htmlLength, contentId)
			.run();

		if ((updateResult.meta?.changes ?? 0) < 1) {
			return NextResponse.json({ ok: false, message: "web_content not found", post_id: contentId }, { status: 404 });
		}

		const row = await db
			.prepare(
				`SELECT content_id, prepare_status, html_length, updated_at
           FROM web_contents
          WHERE content_id = ?
          LIMIT 1`,
			)
			.bind(contentId)
			.first<WebContentPrepareStatusRow>();

		return NextResponse.json({
			ok: true,
			post_id: contentId,
			sanitized_html_length: htmlLength,
			web_content: row ?? {
				content_id: contentId,
				prepare_status: prepareStatus,
				html_length: htmlLength,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "failed to update web content prepare_status" },
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	return handleUpdatePrepareStatus(request);
}

export async function PATCH(request: Request) {
	return handleUpdatePrepareStatus(request);
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
