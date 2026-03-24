import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type PostRow = {
	post_id: number;
	user_pk: number;
	post_slug: string | null;
	brand_slug: string | null;
	cat_code: string | null;
	sub_cat_code: string | null;
	site: string | null;
	locale: string | null;
	caption: string | null;
	sell_car: number | null;
	title: string | null;
	model_name: string | null;
	prepare_status: string | null;
	batch_id: string | null;
	prepare_url: string | null;
	prepare_src: string | null;
	prepare_plan: string | null;
	prepare_mode: string | null;
	manu_year: number | null;
	miles_km: number | null;
	cylinder: number | null;
	price: number | null;
	template_id: string | null;
	cover_page: number | null;
	visibility: string;
	like_count: number | null;
	comment_count: number | null;
	created_at: string | null;
	updated_at: string | null;
	author_name: string | null;
	author_handle: string | null;
	author_avatar: string | null;
};

type PageRow = {
	post_id: number;
	page_num: number;
	media_url: string;
	raw_media_url: string | null;
	media_type: string | null;
	width: number | null;
	height: number | null;
	alt_text: string | null;
	caption: string | null;
	title: string | null;
};

type PostEditRow = {
	post_id: number;
	post_slug: string | null;
	user_pk: number;
	cat_code: string | null;
	sub_cat_code: string | null;
	site: string | null;
	locale: string | null;
	caption: string | null;
	show_page_content: number | null;
	custom_content: string | null;
	title: string | null;
	template_id: string | null;
	batch_id: string | null;
	visibility: string;
	created_at: string | null;
	updated_at: string | null;
};

type PostEditPageRow = {
	post_id: number;
	page_num: number;
	media_url: string | null;
	raw_media_url: string | null;
	bg_media_url: string | null;
	media_type: string | null;
	width: number | null;
	height: number | null;
	media_crop_top_left_x: number | null;
	media_crop_top_left_y: number | null;
	media_crop_bottom_right_x: number | null;
	media_crop_bottom_right_y: number | null;
	alt_text: string | null;
	title: string | null;
	h1: string | null;
	h2: string | null;
	h3: string | null;
	h4: string | null;
	caption: string | null;
	layout_json: string | null;
};

type PreparePlanSourcePostRow = {
	post_id: number;
	title: string | null;
	caption: string | null;
};

type PreparePostUpdatePayload = {
	post_id?: number | string | null;
	title?: string | null;
	content?: string | null;
	url?: string | null;
	images?: unknown;
	prepare_mode?: string | null;
};

type PreparePlanUpdatePayload = {
	post_id?: number | string | null;
	prepare_plan?: unknown;
	prepare_mode?: string | null;
};

type GeminiBatchUpdatePayload = {
	action?: string | null;
	post_id?: number | string | null;
	prepare_status?: string | null;
	batch_id?: string | null;
	prepare_data?: unknown;
	gemini_info?: unknown;
};

type GeminiBatchJobInfo = {
	batch_job_id: number | null;
	gemini_batch_id: string | null;
	status: string | null;
	item_purpose: string | null;
	submitted_by_admin_id: number | null;
	model_name: string | null;
	prompt_version: string | null;
	prepare_mode: string | null;
	request_payload_ref: string | null;
	response_payload_ref: string | null;
	queued_at: string | null;
	started_at: string | null;
	completed_at: string | null;
	duration_ms: number | null;
	input_tokens: number | null;
	output_tokens: number | null;
	total_tokens: number | null;
	estimated_cost_usd: number | null;
	attempt_count: number | null;
	last_error_code: string | null;
	last_error_message: string | null;
};

type GeminiBatchItemInfo = {
	item_id: number | null;
	item_purpose: string | null;
	item_type: string | null;
	gemini_custom_id: string | null;
	item_status: string | null;
	parse_ok: 0 | 1 | null;
	validation_ok: 0 | 1 | null;
	failure_stage: string | null;
	result_json: string | null;
	input_ref: string | null;
	output_ref: string | null;
	input_tokens: number | null;
	output_tokens: number | null;
	total_tokens: number | null;
	estimated_cost_usd: number | null;
	attempt_count: number | null;
	error_code: string | null;
	error_message: string | null;
};

type GeminiBatchInfo = {
	job: GeminiBatchJobInfo;
	item: GeminiBatchItemInfo;
};

type GeminiBatchUpdateResult =
	| {
			ok: true;
			postId: number;
			prepareStatus: GeminiBatchPrepareStatus;
			batchJobId: number;
			batchItemId: number;
			batchId: string | null;
			geminiBatchId: string | null;
	  }
	| {
			ok: false;
			status: number;
			message: string;
			postId: number | null;
	  };

type PendingGeminiBatchRow = {
	post_id: number;
	user_pk: number;
	cat_code: string | null;
	sub_cat_code: string | null;
	site: string | null;
	prepare_status: string | null;
	prepare_url: string | null;
	title: string | null;
	updated_at: string | null;
	batch_job_id: number | null;
	gemini_batch_id: string | null;
	batch_job_status: string | null;
	model_name: string | null;
	batch_item_id: number | null;
	item_purpose: string | null;
	gemini_custom_id: string | null;
	batch_item_status: string | null;
};

type FetchUrlBatchDoneReadyRow = {
	post_id: number;
	user_pk: number;
	cat_code: string | null;
	sub_cat_code: string | null;
	site: string | null;
	prepare_status: string | null;
	prepare_url: string | null;
	title: string | null;
	prepare_src: string | null;
	updated_at: string | null;
};

type GenerateHashtagsLocaleRow = {
	post_id: number;
	user_pk: number;
	locale: string | null;
	title: string | null;
	batch_id: string | null;
	generate_hashtags_locale: number | null;
	prepare_content_refined: string | null;
	updated_at: string | null;
};

type Visibility = "public" | "followers" | "private" | "draft" | "prepare" | "published";
type GeminiBatchPrepareStatus =
	| "fetch_url_batch_create"
	| "fetch_url_batch_done"
	| "prepare_content_batch_create"
	| "prepare_content_batch_done";
type GeminiBatchItemPurpose = "fetch_url_batch" | "prepare_content_batch";

type SavePostPageInput = {
	page_num: number;
	media_url: string;
	media_type: string;
	width: number | null;
	height: number | null;
	media_crop_top_left_x: number | null;
	media_crop_top_left_y: number | null;
	media_crop_bottom_right_x: number | null;
	media_crop_bottom_right_y: number | null;
	alt_text: string | null;
	title: string | null;
	h1: string | null;
	h2: string | null;
	h3: string | null;
	h4: string | null;
	caption: string | null;
	layout_json: string | null;
	raw_media_url: string | null;
	bg_media_url: string | null;
};

type SavePostPayload = {
	post_pk?: number | string | null;
	post_id?: number | string | null;
	prepare_post_id?: number | string | null;
	prepare_mode?: string | null;
	user_pk?: number | string | null;
	locale?: string | null;
	caption?: string | null;
	show_page_content?: number | boolean | null;
	custom_content?: string | null;
	prepare_content?: unknown;
	title?: string | null;
	template_id?: string | null;
	visibility?: string | null;
	pages?: unknown;
};

type GenerateHashtagsLocaleUpdatePayload = {
	action?: string | null;
	post_id?: number | string | null;
	batch_id?: string | null;
	generate_hashtags_locale?: number | string | null;
	src_org_locale?: unknown;
};

type SavePostResult =
	| {
			ok: true;
			postId: number;
			postSlug: string | null;
			pagesSaved: number;
			created: boolean;
	  }
		| {
				ok: false;
				status: number;
				message: string;
		  };

type GenerateHashtagsLocaleUpdateResult =
	| {
			ok: true;
			postId: number;
			generateHashtagsLocale: number;
			batchId: string | null;
			prepareContentRefined: string | null;
	  }
	| {
			ok: false;
			status: number;
			message: string;
			postId: number | null;
	  };

const POST_SLUG_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const POST_SLUG_LENGTH = 10;
const POST_SLUG_INSERT_ATTEMPTS = 8;
const GEMINI_BATCH_ACTION = "gemini_batch_update";
const GENERATE_HASHTAGS_LOCALE_UPDATE_ACTION = "generate_hashtags_locale_update";
const GENERATE_HASHTAGS_LOCALE_STATUS_REQUESTED = 1;
const GEMINI_BATCH_ITEM_TYPE_POSTS = "posts";
const GEMINI_BATCH_ITEM_PURPOSE_FETCH_URL = "fetch_url_batch";
const GEMINI_BATCH_ITEM_PURPOSE_PREPARE_CONTENT = "prepare_content_batch";
const GEMINI_BATCH_PREPARE_STATUS_FETCH_URL_CREATE: GeminiBatchPrepareStatus = "fetch_url_batch_create";
const GEMINI_BATCH_PREPARE_STATUS_FETCH_URL_DONE: GeminiBatchPrepareStatus = "fetch_url_batch_done";
const GEMINI_BATCH_PREPARE_STATUS_PREPARE_CONTENT_CREATE: GeminiBatchPrepareStatus = "prepare_content_batch_create";
const GEMINI_BATCH_PREPARE_STATUS_PREPARE_CONTENT_DONE: GeminiBatchPrepareStatus = "prepare_content_batch_done";
const GEMINI_BATCH_UPDATE_GEMINI_INFO_SPEC = {
	prepare_status: [
		GEMINI_BATCH_PREPARE_STATUS_FETCH_URL_CREATE,
		GEMINI_BATCH_PREPARE_STATUS_FETCH_URL_DONE,
		GEMINI_BATCH_PREPARE_STATUS_PREPARE_CONTENT_CREATE,
		GEMINI_BATCH_PREPARE_STATUS_PREPARE_CONTENT_DONE,
	],
	job: {
		defaults: {
			item_purpose_by_prepare_status: {
				[GEMINI_BATCH_PREPARE_STATUS_FETCH_URL_CREATE]: GEMINI_BATCH_ITEM_PURPOSE_FETCH_URL,
				[GEMINI_BATCH_PREPARE_STATUS_FETCH_URL_DONE]: GEMINI_BATCH_ITEM_PURPOSE_FETCH_URL,
				[GEMINI_BATCH_PREPARE_STATUS_PREPARE_CONTENT_CREATE]: GEMINI_BATCH_ITEM_PURPOSE_PREPARE_CONTENT,
				[GEMINI_BATCH_PREPARE_STATUS_PREPARE_CONTENT_DONE]: GEMINI_BATCH_ITEM_PURPOSE_PREPARE_CONTENT,
			},
		},
		required_for_batch_create: ["batch_id (root) or gemini_batch_id", "model_name"],
		recommended_for_batch_done: ["status"],
		optional: [
			"batch_job_id",
			"status",
			"item_purpose",
			"submitted_by_admin_id",
			"prompt_version",
			"prepare_mode",
			"request_payload_ref",
			"response_payload_ref",
			"queued_at",
			"started_at",
			"completed_at",
			"duration_ms",
			"input_tokens",
			"output_tokens",
			"total_tokens",
			"estimated_cost_usd",
			"attempt_count",
			"last_error_code",
			"last_error_message",
		],
	},
	item: {
		defaults: {
			item_type: GEMINI_BATCH_ITEM_TYPE_POSTS,
			item_id: "post_id",
			item_purpose_by_prepare_status: {
				[GEMINI_BATCH_PREPARE_STATUS_FETCH_URL_CREATE]: GEMINI_BATCH_ITEM_PURPOSE_FETCH_URL,
				[GEMINI_BATCH_PREPARE_STATUS_FETCH_URL_DONE]: GEMINI_BATCH_ITEM_PURPOSE_FETCH_URL,
				[GEMINI_BATCH_PREPARE_STATUS_PREPARE_CONTENT_CREATE]: GEMINI_BATCH_ITEM_PURPOSE_PREPARE_CONTENT,
				[GEMINI_BATCH_PREPARE_STATUS_PREPARE_CONTENT_DONE]: GEMINI_BATCH_ITEM_PURPOSE_PREPARE_CONTENT,
			},
		},
		required_for_batch_create: ["gemini_custom_id"],
		recommended_for_batch_done: ["item_status"],
		optional: [
			"item_status",
			"parse_ok",
			"validation_ok",
			"failure_stage",
			"result_json",
			"input_ref",
			"output_ref",
			"input_tokens",
			"output_tokens",
			"total_tokens",
			"estimated_cost_usd",
			"attempt_count",
			"error_code",
			"error_message",
		],
	},
} as const;
const POSTS_DEBUG_ENABLED = (() => {
	const env = typeof process === "undefined" ? undefined : process.env;
	return env?.DEBUG_POSTS_API === "1" || env?.NODE_ENV !== "production";
})();

function describeValueType(value: unknown): string {
	if (Array.isArray(value)) return `array(${value.length})`;
	if (value === null) return "null";
	return typeof value;
}

function debugPosts(message: string, details?: Record<string, unknown>) {
	if (!POSTS_DEBUG_ENABLED) return;
	if (details) {
		console.info(`[api/posts] ${message}`, details);
		return;
	}
	console.info(`[api/posts] ${message}`);
}

function sumBatchChanges(results: Array<{ meta?: { changes?: number } }>): number {
	return results.reduce((total, result) => total + Number(result.meta?.changes ?? 0), 0);
}

const PREPARE_POSTS_QUERY_LEGACY = `SELECT p.post_id, p.user_pk, p.post_slug, p.brand_slug, p.locale, p.caption, p.sell_car, p.title, p.model_name,
				        p.prepare_status, p.batch_id, p.prepare_url, p.prepare_src, p.prepare_plan, p.prepare_mode, p.manu_year, p.miles_km, p.cylinder, p.price, p.template_id, p.cover_page, p.visibility,
				        p.like_count, p.comment_count, p.created_at, p.updated_at,
				        u.name AS author_name, u.user_id AS author_handle, u.avatar_url AS author_avatar
				   FROM posts p
				   LEFT JOIN users u ON u.user_pk = p.user_pk
				  WHERE p.visibility = 'prepare'
				  ORDER BY p.created_at DESC`;

const PREPARE_POSTS_QUERY_SCHEMA_V2 = `SELECT p.post_id, p.user_pk, p.post_slug, NULL AS brand_slug, p.locale, p.caption, p.sell AS sell_car, p.title, p.model_name,
				        p.prepare_status, p.batch_id, p.prepare_url, p.prepare_src, p.prepare_plan, p.prepare_mode, NULL AS manu_year, NULL AS miles_km, NULL AS cylinder, p.price, p.template_id, p.cover_page, p.visibility,
				        p.like_count, p.comment_count, p.created_at, p.updated_at,
				        u.name AS author_name, u.user_id AS author_handle, u.avatar_url AS author_avatar
				   FROM posts p
				   LEFT JOIN users u ON u.user_pk = p.user_pk
				  WHERE p.visibility = 'prepare'
				  ORDER BY p.created_at DESC`;

function parsePostId(value: unknown): number | null {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (/^\d+$/.test(trimmed)) return Number(trimmed);
	}
	return null;
}

function asTrimmedOrNull(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function normalizeImageUrls(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	const urls: string[] = [];
	for (const item of value) {
		if (typeof item !== "string") continue;
		const url = item.trim();
		if (!url || seen.has(url)) continue;
		seen.add(url);
		urls.push(url);
	}
	return urls;
}

function normalizePreparePlan(value: unknown): string | null {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed ? trimmed : null;
	}
	if (value && typeof value === "object") return JSON.stringify(value);
	return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

function toOptionalInteger(value: unknown): number | null {
	if (value === null || value === undefined || value === "") return null;
	const numericValue = typeof value === "number" ? value : Number(value);
	if (!Number.isInteger(numericValue)) return null;
	return numericValue;
}

function toOptionalNumber(value: unknown): number | null {
	if (value === null || value === undefined || value === "") return null;
	const numericValue = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(numericValue)) return null;
	return numericValue;
}

function toOptionalBinaryFlag(value: unknown): 0 | 1 | null {
	if (value === null || value === undefined || value === "") return null;
	if (value === true) return 1;
	if (value === false) return 0;
	if (value === 1 || value === "1") return 1;
	if (value === 0 || value === "0") return 0;
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "true") return 1;
		if (normalized === "false") return 0;
	}
	return null;
}

function toOptionalString(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function toOptionalUrlLikeString(value: unknown): string | null {
	const raw = toOptionalString(value);
	if (!raw) return null;

	const markdownLinkMatch = raw.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
	if (!markdownLinkMatch) {
		return raw;
	}

	const href = toOptionalString(markdownLinkMatch[2]);
	const label = toOptionalString(markdownLinkMatch[1]);
	return href ?? label ?? raw;
}

function parsePossiblyEscapedJson(value: unknown, maxDepth = 3): unknown {
	let current: unknown = value;

	for (let depth = 0; depth < maxDepth; depth += 1) {
		if (typeof current !== "string") return current;
		const trimmed = current.trim();
		if (!trimmed) return trimmed;

		try {
			const parsed = JSON.parse(trimmed) as unknown;
			if (parsed === current) return parsed;
			current = parsed;
		} catch {
			return trimmed;
		}
	}

	return current;
}

function normalizeLayoutJson(value: unknown): string | null {
	if (value === null || value === undefined) return null;

	const normalized = parsePossiblyEscapedJson(value, 4);
	if (!normalized) return null;
	if (typeof normalized === "object") return JSON.stringify(normalized);
	if (typeof normalized === "string") {
		const trimmed = normalized.trim();
		return trimmed ? trimmed : null;
	}
	return null;
}

function normalizeJsonText(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	const parsed = parsePossiblyEscapedJson(value, 4);
	if (parsed === null || parsed === undefined) return null;
	if (typeof parsed === "string") {
		const trimmed = parsed.trim();
		return trimmed ? trimmed : null;
	}
	return JSON.stringify(parsed);
}

function isGeminiBatchPrepareStatus(value: string | null | undefined): value is GeminiBatchPrepareStatus {
	return (
		value === GEMINI_BATCH_PREPARE_STATUS_FETCH_URL_CREATE ||
		value === GEMINI_BATCH_PREPARE_STATUS_FETCH_URL_DONE ||
		value === GEMINI_BATCH_PREPARE_STATUS_PREPARE_CONTENT_CREATE ||
		value === GEMINI_BATCH_PREPARE_STATUS_PREPARE_CONTENT_DONE
	);
}

function isGeminiBatchCreateStatus(value: GeminiBatchPrepareStatus): boolean {
	return value === GEMINI_BATCH_PREPARE_STATUS_FETCH_URL_CREATE || value === GEMINI_BATCH_PREPARE_STATUS_PREPARE_CONTENT_CREATE;
}

function getGeminiBatchItemPurposeForPrepareStatus(status: GeminiBatchPrepareStatus): GeminiBatchItemPurpose {
	if (status === GEMINI_BATCH_PREPARE_STATUS_PREPARE_CONTENT_CREATE || status === GEMINI_BATCH_PREPARE_STATUS_PREPARE_CONTENT_DONE) {
		return GEMINI_BATCH_ITEM_PURPOSE_PREPARE_CONTENT;
	}
	return GEMINI_BATCH_ITEM_PURPOSE_FETCH_URL;
}

function isGeminiBatchUpdateRequest(record: Record<string, unknown>): boolean {
	const action = asTrimmedOrNull(record.action);
	if (action === GEMINI_BATCH_ACTION) return true;
	const prepareStatus = asTrimmedOrNull(record.prepare_status);
	return isGeminiBatchPrepareStatus(prepareStatus);
}

function isGenerateHashtagsLocaleUpdateRequest(record: Record<string, unknown>): boolean {
	return asTrimmedOrNull(record.action) === GENERATE_HASHTAGS_LOCALE_UPDATE_ACTION;
}

function isVisibility(value: string): value is Visibility {
	return (
		value === "public" ||
		value === "followers" ||
		value === "private" ||
		value === "draft" ||
		value === "prepare" ||
		value === "published"
	);
}

function normalizeVisibilityForStorage(value: Visibility | null | undefined): "public" | "followers" | "private" | "draft" | "prepare" {
	if (!value) return "draft";
	if (value === "published") return "public";
	return value;
}

function generatePostSlug(length: number): string {
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	let output = "";
	for (const byte of bytes) {
		output += POST_SLUG_ALPHABET[byte % POST_SLUG_ALPHABET.length];
	}
	return output;
}

function isPostSlugUniqueConstraintError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const message = error.message.toLowerCase();
	return message.includes("unique constraint failed") && message.includes("posts.post_slug");
}

function normalizeHashtagToken(value: string): string {
	return value
		.normalize("NFKC")
		.replace(/^[^A-Za-z0-9\u00C0-\uFFFF_-]+/, "")
		.replace(/[^A-Za-z0-9\u00C0-\uFFFF_-]+$/, "")
		.toLowerCase();
}

function extractHashtagsFromContent(content: string): string[] {
	const matches = content.match(/#([^\s#]+)/gu) ?? [];
	return Array.from(
		new Set(
			matches
				.map((match) => match.slice(1))
				.map((match) => normalizeHashtagToken(match))
				.filter((tag) => tag.length > 0)
		)
	);
}

function parseSavePages(value: unknown): { pages: SavePostPageInput[]; error: string | null } {
	debugPosts("parsing pages payload", { input_type: describeValueType(value) });
	const parsedValue = parsePossiblyEscapedJson(value, 3);
	debugPosts("pages payload parsed", { parsed_type: describeValueType(parsedValue) });
	if (!Array.isArray(parsedValue) || parsedValue.length === 0) {
		debugPosts("pages payload invalid", { reason: "At least one page is required." });
		return { pages: [], error: "At least one page is required." };
	}

	const pages: SavePostPageInput[] = [];
	let escapedPageObjects = 0;
	let layoutJsonNormalizedCount = 0;
	let mediaFallbackCount = 0;

	for (let index = 0; index < parsedValue.length; index += 1) {
		const rawPageEntry = parsedValue[index];
		const parsedRow = parsePossiblyEscapedJson(parsedValue[index], 3);
		if (typeof rawPageEntry === "string" && parsedRow && typeof parsedRow === "object" && !Array.isArray(parsedRow)) {
			escapedPageObjects += 1;
		}
		const row = asRecord(parsedRow);
		if (!row) {
			debugPosts("page parse failed", { index, page_entry_type: describeValueType(rawPageEntry) });
			return { pages: [], error: `pages[${index}] must be an object.` };
		}

		const rawMediaUrl = toOptionalUrlLikeString(row.raw_media_url);
		const bgMediaUrl = toOptionalUrlLikeString(row.bg_media_url);
		const mediaUrlInput = toOptionalUrlLikeString(row.media_url);
		const mediaUrl = mediaUrlInput ?? rawMediaUrl ?? bgMediaUrl ?? "";
		if (!mediaUrlInput && (rawMediaUrl || bgMediaUrl)) {
			mediaFallbackCount += 1;
		}
		const mediaType = toOptionalString(row.media_type) ?? "image";
		const pageNum = toOptionalInteger(row.page_num);
		const parsedLayout = parsePossiblyEscapedJson(row.layout_json, 4);
		const layoutRecord = asRecord(parsedLayout);
		const mediaCropTopLeftX =
			toOptionalInteger(row.media_crop_top_left_x) ??
			(layoutRecord ? toOptionalInteger(layoutRecord.media_crop_top_left_x) : null);
		const mediaCropTopLeftY =
			toOptionalInteger(row.media_crop_top_left_y) ??
			(layoutRecord ? toOptionalInteger(layoutRecord.media_crop_top_left_y) : null);
		const mediaCropBottomRightX =
			toOptionalInteger(row.media_crop_bottom_right_x) ??
			(layoutRecord ? toOptionalInteger(layoutRecord.media_crop_bottom_right_x) : null);
		const mediaCropBottomRightY =
			toOptionalInteger(row.media_crop_bottom_right_y) ??
			(layoutRecord ? toOptionalInteger(layoutRecord.media_crop_bottom_right_y) : null);

		let normalizedLayoutJson: string | null;
		if (layoutRecord) {
			normalizedLayoutJson = normalizeLayoutJson({
				...layoutRecord,
				media_crop_top_left_x: mediaCropTopLeftX,
				media_crop_top_left_y: mediaCropTopLeftY,
				media_crop_bottom_right_x: mediaCropBottomRightX,
				media_crop_bottom_right_y: mediaCropBottomRightY,
			});
		} else if (
			mediaCropTopLeftX !== null ||
			mediaCropTopLeftY !== null ||
			mediaCropBottomRightX !== null ||
			mediaCropBottomRightY !== null
		) {
			normalizedLayoutJson = normalizeLayoutJson({
				media_crop_top_left_x: mediaCropTopLeftX,
				media_crop_top_left_y: mediaCropTopLeftY,
				media_crop_bottom_right_x: mediaCropBottomRightX,
				media_crop_bottom_right_y: mediaCropBottomRightY,
			});
		} else {
			normalizedLayoutJson = normalizeLayoutJson(parsedLayout);
		}
		if (normalizedLayoutJson) {
			layoutJsonNormalizedCount += 1;
		}

		pages.push({
			page_num: pageNum && pageNum > 0 ? pageNum : index + 1,
			media_url: mediaUrl,
			media_type: mediaType,
			width: toOptionalInteger(row.width),
			height: toOptionalInteger(row.height),
			media_crop_top_left_x: mediaCropTopLeftX,
			media_crop_top_left_y: mediaCropTopLeftY,
			media_crop_bottom_right_x: mediaCropBottomRightX,
			media_crop_bottom_right_y: mediaCropBottomRightY,
			alt_text: toOptionalString(row.alt_text),
			title: toOptionalString(row.title),
			h1: toOptionalString(row.h1),
			h2: toOptionalString(row.h2),
			h3: toOptionalString(row.h3),
			h4: toOptionalString(row.h4),
			caption: toOptionalString(row.caption),
			layout_json: normalizedLayoutJson,
			raw_media_url: rawMediaUrl,
			bg_media_url: bgMediaUrl,
		});
	}

	debugPosts("pages payload parsed successfully", {
		pages_count: pages.length,
		escaped_page_objects: escapedPageObjects,
		layout_json_normalized: layoutJsonNormalizedCount,
		media_url_fallback_used: mediaFallbackCount,
	});

	return { pages, error: null };
}

function extractSavePayloadFromPreparePlan(value: unknown): SavePostPayload | null {
	const parsed = parsePossiblyEscapedJson(value, 4);
	const record = asRecord(parsed);
	if (!record) return null;
	if (!("pages" in record)) return null;
	return record as SavePostPayload;
}

function isNoSuchColumnError(error: unknown): boolean {
	return `${error}`.toLowerCase().includes("no such column");
}

type PostMetaRow = {
	post_id: number;
	cat_code: string | null;
	sub_cat_code: string | null;
	site: string | null;
};

async function loadPostMetaMap(
	db: D1Database,
	postIds: number[],
): Promise<Map<number, { cat_code: string | null; sub_cat_code: string | null; site: string | null }>> {
	const uniquePostIds = Array.from(new Set(postIds.filter((postId) => Number.isInteger(postId) && postId > 0)));
	if (!uniquePostIds.length) return new Map();

	try {
		const placeholders = uniquePostIds.map(() => "?").join(", ");
		const rows = await db
			.prepare(`SELECT post_id, cat_code, sub_cat_code, site FROM posts WHERE post_id IN (${placeholders})`)
			.bind(...uniquePostIds)
			.all<PostMetaRow>();

		return new Map(
			(rows.results ?? []).map((row) => [
				row.post_id,
				{
					cat_code: row.cat_code,
					sub_cat_code: row.sub_cat_code,
					site: row.site,
				},
			]),
		);
	} catch (error) {
		if (isNoSuchColumnError(error)) {
			return new Map();
		}
		throw error;
	}
}

async function loadPreparePosts(db: D1Database, prepareStatus: string | null = null): Promise<PostRow[]> {
	const shouldFilterByPrepareStatus = typeof prepareStatus === "string" && prepareStatus.length > 0;
	const legacyQuery = shouldFilterByPrepareStatus
		? PREPARE_POSTS_QUERY_LEGACY.replace(
			"WHERE p.visibility = 'prepare'",
			"WHERE p.visibility = 'prepare'\n			    AND p.prepare_status = ?"
		  )
		: PREPARE_POSTS_QUERY_LEGACY;
	const schemaV2Query = shouldFilterByPrepareStatus
		? PREPARE_POSTS_QUERY_SCHEMA_V2.replace(
			"WHERE p.visibility = 'prepare'",
			"WHERE p.visibility = 'prepare'\n			    AND p.prepare_status = ?"
		  )
		: PREPARE_POSTS_QUERY_SCHEMA_V2;

	try {
		const legacyStatement = db.prepare(legacyQuery);
		const legacyRows = shouldFilterByPrepareStatus
			? await legacyStatement.bind(prepareStatus).all<PostRow>()
			: await legacyStatement.all<PostRow>();
		return legacyRows.results ?? [];
	} catch (error) {
		if (!isNoSuchColumnError(error)) {
			throw error;
		}
		const schemaV2Statement = db.prepare(schemaV2Query);
		const schemaV2Rows = shouldFilterByPrepareStatus
			? await schemaV2Statement.bind(prepareStatus).all<PostRow>()
			: await schemaV2Statement.all<PostRow>();
		return schemaV2Rows.results ?? [];
	}
}

async function loadPreparePostPages(db: D1Database, prepareStatus: string | null = null): Promise<PageRow[]> {
	const shouldFilterByPrepareStatus = typeof prepareStatus === "string" && prepareStatus.length > 0;
	const query = shouldFilterByPrepareStatus
		? `SELECT pp.post_id,
		        pp.page_num,
		        pp.media_url,
		        pp.raw_media_url,
		        pp.media_type,
		        pp.width,
		        pp.height,
		        pp.alt_text,
		        pp.caption,
		        pp.title
		   FROM post_pages pp
		   JOIN posts p ON p.post_id = pp.post_id
		  WHERE p.visibility = 'prepare'
		    AND p.prepare_status = ?
		  ORDER BY pp.post_id DESC, pp.page_num ASC`
		: `SELECT pp.post_id,
		        pp.page_num,
		        pp.media_url,
		        pp.raw_media_url,
		        pp.media_type,
		        pp.width,
		        pp.height,
		        pp.alt_text,
		        pp.caption,
		        pp.title
		   FROM post_pages pp
		   JOIN posts p ON p.post_id = pp.post_id
		  WHERE p.visibility = 'prepare'
		  ORDER BY pp.post_id DESC, pp.page_num ASC`;

	const statement = db.prepare(query);
	const pageRows = shouldFilterByPrepareStatus ? await statement.bind(prepareStatus).all<PageRow>() : await statement.all<PageRow>();
	return pageRows.results ?? [];
}

async function loadPostForEdit(db: D1Database, postId: number): Promise<{ post: PostEditRow; pages: PostEditPageRow[] } | null> {
	const post = await db
		.prepare(
			`SELECT post_id,
			        post_slug,
			        user_pk,
			        locale,
			        caption,
			        show_page_content,
			        custom_content,
			        title,
			        template_id,
			        visibility,
			        created_at,
			        updated_at
			   FROM posts
			  WHERE post_id = ?
			  LIMIT 1`
		)
		.bind(postId)
		.first<PostEditRow>();

	if (!post) return null;

	const pages = await db
		.prepare(
			`SELECT post_id,
			        page_num,
			        media_url,
			        raw_media_url,
			        bg_media_url,
			        media_type,
			        width,
			        height,
			        media_crop_top_left_x,
			        media_crop_top_left_y,
			        media_crop_bottom_right_x,
			        media_crop_bottom_right_y,
			        alt_text,
			        title,
			        h1,
			        h2,
			        h3,
			        h4,
			        caption,
			        layout_json
			   FROM post_pages
			  WHERE post_id = ?
			  ORDER BY page_num ASC`
		)
		.bind(postId)
		.all<PostEditPageRow>();

	return {
		post,
		pages: pages.results ?? [],
	};
}

async function loadPreparePlanSourcePost(db: D1Database, postId: number): Promise<PreparePlanSourcePostRow | null> {
	const sourcePost = await db
		.prepare(
			`SELECT post_id,
			        title,
			        caption
			   FROM posts
			  WHERE post_id = ?
			  LIMIT 1`
		)
		.bind(postId)
		.first<PreparePlanSourcePostRow>();

	return sourcePost ?? null;
}

function parseGeminiBatchInfo(value: unknown): { info: GeminiBatchInfo | null; error: string | null } {
	const parsed = parsePossiblyEscapedJson(value, 4);
	const root = asRecord(parsed);
	if (!root) {
		return { info: null, error: "gemini_info must be a JSON object with job and item sections" };
	}

	const jobRecord = asRecord(parsePossiblyEscapedJson(root.job, 3)) ?? {};
	const itemRecord = asRecord(parsePossiblyEscapedJson(root.item, 3)) ?? {};

	return {
			info: {
				job: {
					batch_job_id: parsePostId(jobRecord.batch_job_id),
					gemini_batch_id: asTrimmedOrNull(jobRecord.gemini_batch_id),
					status: asTrimmedOrNull(jobRecord.status),
					item_purpose: asTrimmedOrNull(jobRecord.item_purpose),
					submitted_by_admin_id: toOptionalInteger(jobRecord.submitted_by_admin_id),
					model_name: asTrimmedOrNull(jobRecord.model_name),
				prompt_version: asTrimmedOrNull(jobRecord.prompt_version),
				prepare_mode: asTrimmedOrNull(jobRecord.prepare_mode),
				request_payload_ref: asTrimmedOrNull(jobRecord.request_payload_ref),
				response_payload_ref: asTrimmedOrNull(jobRecord.response_payload_ref),
				queued_at: asTrimmedOrNull(jobRecord.queued_at),
				started_at: asTrimmedOrNull(jobRecord.started_at),
				completed_at: asTrimmedOrNull(jobRecord.completed_at),
				duration_ms: toOptionalInteger(jobRecord.duration_ms),
				input_tokens: toOptionalInteger(jobRecord.input_tokens),
				output_tokens: toOptionalInteger(jobRecord.output_tokens),
				total_tokens: toOptionalInteger(jobRecord.total_tokens),
				estimated_cost_usd: toOptionalNumber(jobRecord.estimated_cost_usd),
				attempt_count: toOptionalInteger(jobRecord.attempt_count),
				last_error_code: asTrimmedOrNull(jobRecord.last_error_code),
				last_error_message: asTrimmedOrNull(jobRecord.last_error_message),
			},
			item: {
				item_id: parsePostId(itemRecord.item_id),
				item_purpose: asTrimmedOrNull(itemRecord.item_purpose),
				item_type: asTrimmedOrNull(itemRecord.item_type),
				gemini_custom_id: asTrimmedOrNull(itemRecord.gemini_custom_id),
				item_status: asTrimmedOrNull(itemRecord.item_status),
				parse_ok: toOptionalBinaryFlag(itemRecord.parse_ok),
				validation_ok: toOptionalBinaryFlag(itemRecord.validation_ok),
				failure_stage: asTrimmedOrNull(itemRecord.failure_stage),
				result_json: normalizeJsonText(itemRecord.result_json),
				input_ref: asTrimmedOrNull(itemRecord.input_ref),
				output_ref: asTrimmedOrNull(itemRecord.output_ref),
				input_tokens: toOptionalInteger(itemRecord.input_tokens),
				output_tokens: toOptionalInteger(itemRecord.output_tokens),
				total_tokens: toOptionalInteger(itemRecord.total_tokens),
				estimated_cost_usd: toOptionalNumber(itemRecord.estimated_cost_usd),
				attempt_count: toOptionalInteger(itemRecord.attempt_count),
				error_code: asTrimmedOrNull(itemRecord.error_code),
				error_message: asTrimmedOrNull(itemRecord.error_message),
			},
		},
		error: null,
	};
}

async function loadPendingFetchUrlBatch(db: D1Database): Promise<PendingGeminiBatchRow[]> {
	const rows = await loadPendingGeminiBatchByPurpose(
		db,
		GEMINI_BATCH_PREPARE_STATUS_FETCH_URL_CREATE,
		GEMINI_BATCH_ITEM_PURPOSE_FETCH_URL
	);
	return rows;
}

async function loadPendingPrepareContentBatch(db: D1Database): Promise<PendingGeminiBatchRow[]> {
	const rows = await loadPendingGeminiBatchByPurpose(
		db,
		GEMINI_BATCH_PREPARE_STATUS_PREPARE_CONTENT_CREATE,
		GEMINI_BATCH_ITEM_PURPOSE_PREPARE_CONTENT
	);
	return rows;
}

async function loadPendingGeminiBatchByPurpose(
	db: D1Database,
	prepareStatus: GeminiBatchPrepareStatus,
	itemPurpose: GeminiBatchItemPurpose
): Promise<PendingGeminiBatchRow[]> {
	const rows = await db
		.prepare(
			`SELECT p.post_id,
			        p.user_pk,
			        p.prepare_status,
			        p.prepare_url,
			        p.title,
			        p.updated_at,
			        j.id AS batch_job_id,
			        j.gemini_batch_id,
			        j.status AS batch_job_status,
			        j.model_name,
			        i.id AS batch_item_id,
			        i.item_purpose,
			        i.gemini_custom_id,
			        i.item_status AS batch_item_status
			   FROM posts p
			   LEFT JOIN gemini_batch_items i
			     ON i.id = (
			     	SELECT i2.id
			     	  FROM gemini_batch_items i2
			     	 WHERE i2.item_type = ?
			     	   AND i2.item_purpose = ?
			     	   AND i2.item_id = p.post_id
			     	 ORDER BY i2.updated_at DESC, i2.id DESC
			     	 LIMIT 1
			     )
			   LEFT JOIN gemini_batch_jobs j
			     ON j.id = i.batch_job_id
			  WHERE p.visibility = 'prepare'
			    AND p.prepare_status = ?
			  ORDER BY p.updated_at DESC, p.post_id DESC`
		)
		.bind(GEMINI_BATCH_ITEM_TYPE_POSTS, itemPurpose, prepareStatus)
		.all<PendingGeminiBatchRow>();

	return rows.results ?? [];
}

async function loadFetchUrlBatchDoneReadyPosts(db: D1Database): Promise<FetchUrlBatchDoneReadyRow[]> {
	const rows = await db
		.prepare(
			`SELECT p.post_id,
			        p.user_pk,
			        p.prepare_status,
			        p.prepare_url,
			        p.title,
			        p.prepare_src,
			        p.updated_at
			   FROM posts p
			  WHERE p.visibility = 'prepare'
			    AND p.prepare_status = ?
			    AND p.prepare_src IS NOT NULL
			    AND trim(p.prepare_src) <> ''
			  ORDER BY p.updated_at DESC, p.post_id DESC`
		)
		.bind(GEMINI_BATCH_PREPARE_STATUS_FETCH_URL_DONE)
		.all<FetchUrlBatchDoneReadyRow>();

	return rows.results ?? [];
}

async function loadGenerateHashtagsLocaleReadyPosts(db: D1Database): Promise<GenerateHashtagsLocaleRow[]> {
	const rows = await db
		.prepare(
			`SELECT p.post_id,
			        p.user_pk,
			        p.locale,
			        p.title,
			        p.batch_id,
			        p.generate_hashtags_locale,
			        p.prepare_content_refined,
			        p.updated_at
			   FROM posts p
			  WHERE p.visibility = 'prepare'
			    AND p.generate_hashtags_locale = 1
			    AND p.prepare_content_refined IS NOT NULL
			    AND trim(p.prepare_content_refined) <> ''
			  ORDER BY p.updated_at DESC, p.post_id DESC`
		)
		.all<GenerateHashtagsLocaleRow>();

	return rows.results ?? [];
}

async function loadPendingGenerateHashtagsLocalePosts(db: D1Database): Promise<GenerateHashtagsLocaleRow[]> {
	const rows = await db
		.prepare(
			`SELECT p.post_id,
			        p.user_pk,
			        p.locale,
			        p.title,
			        p.batch_id,
			        p.generate_hashtags_locale,
			        p.prepare_content_refined,
			        p.updated_at
			   FROM posts p
			  WHERE p.visibility = 'prepare'
			    AND p.generate_hashtags_locale = 4
			    AND p.batch_id IS NOT NULL
			    AND trim(p.batch_id) <> ''
			    AND p.prepare_content_refined IS NOT NULL
			    AND trim(p.prepare_content_refined) <> ''
			  ORDER BY p.updated_at DESC, p.post_id DESC`
		)
		.all<GenerateHashtagsLocaleRow>();

	return rows.results ?? [];
}

function normalizeStringArray(value: unknown): string[] | null {
	const parsed = parsePossiblyEscapedJson(value, 2);
	if (!Array.isArray(parsed)) return null;

	const items = parsed
		.filter((item): item is string => typeof item === "string")
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
	return items;
}

function normalizeGenerateHashtagsLocaleSrcOrgLocale(value: unknown): Record<string, unknown> | null {
	const parsed = parsePossiblyEscapedJson(value, 4);
	const record = asRecord(parsed);
	if (!record) return null;

	const nextRecord: Record<string, unknown> = {};
	const hashtagsLocale = normalizeStringArray(record.hashtags_locale);
	if (hashtagsLocale && hashtagsLocale.length > 0) {
		nextRecord.hashtags_locale = hashtagsLocale;
	}

	for (const key of ["category_locale", "subcategory_locale", "brand_locale", "model_locale", "celebrity_locale"] as const) {
		const valueText = toOptionalString(record[key]);
		if (valueText !== null) nextRecord[key] = valueText;
	}

	return Object.keys(nextRecord).length > 0 ? nextRecord : null;
}

function mergePrepareContentRefinedSrcOrgLocale(
	prepareContentRefined: string,
	srcOrgLocale: unknown,
): { prepareContentRefined: string | null; error: string | null } {
	const parsedPrepareContentRefined = parsePossiblyEscapedJson(prepareContentRefined, 4);
	const prepareContentRefinedRecord = asRecord(parsedPrepareContentRefined);
	if (!prepareContentRefinedRecord) {
		return { prepareContentRefined: null, error: "prepare_content_refined must be a JSON object string" };
	}

	const srcOrgLocaleRecord = normalizeGenerateHashtagsLocaleSrcOrgLocale(srcOrgLocale);
	if (!srcOrgLocaleRecord) {
		return { prepareContentRefined: null, error: "src_org_locale must be a JSON object with locale fields" };
	}

	const existingSrcOrg = asRecord(parsePossiblyEscapedJson(prepareContentRefinedRecord.src_org, 2)) ?? {};
	const nextRecord: Record<string, unknown> = {
		...prepareContentRefinedRecord,
		src_org: {
			...existingSrcOrg,
			...srcOrgLocaleRecord,
		},
	};
	return { prepareContentRefined: JSON.stringify(nextRecord), error: null };
}

async function applyGenerateHashtagsLocaleUpdate(
	db: D1Database,
	payload: GenerateHashtagsLocaleUpdatePayload,
): Promise<GenerateHashtagsLocaleUpdateResult> {
	const postId = parsePostId(payload.post_id);
	if (!postId) return { ok: false, status: 400, message: "invalid post_id", postId: null };

	const generateHashtagsLocale = toOptionalInteger(payload.generate_hashtags_locale);
	if (generateHashtagsLocale === null || generateHashtagsLocale < 0 || generateHashtagsLocale > 4) {
		return {
			ok: false,
			status: 400,
			message: "generate_hashtags_locale must be an integer between 0 and 4",
			postId,
		};
	}

	const hasSrcOrgLocale = Object.prototype.hasOwnProperty.call(payload, "src_org_locale");
	const post = await db
		.prepare("SELECT post_id, batch_id, prepare_content_refined FROM posts WHERE post_id = ? LIMIT 1")
		.bind(postId)
		.first<{ post_id: number; batch_id: string | null; prepare_content_refined: string | null }>();
	if (!post?.post_id) {
		return { ok: false, status: 404, message: "post not found", postId };
	}

	const payloadBatchId = asTrimmedOrNull(payload.batch_id);
	let nextPrepareContentRefined: string | null = post.prepare_content_refined;
	if (hasSrcOrgLocale) {
		if (!post.prepare_content_refined || !post.prepare_content_refined.trim()) {
			return { ok: false, status: 409, message: "prepare_content_refined is empty", postId };
		}

		const mergeResult = mergePrepareContentRefinedSrcOrgLocale(post.prepare_content_refined, payload.src_org_locale);
		if (!mergeResult.prepareContentRefined) {
			return {
				ok: false,
				status: 400,
				message: mergeResult.error ?? "failed to merge src_org_locale",
				postId,
			};
		}
		nextPrepareContentRefined = mergeResult.prepareContentRefined;
	}

	const updateResult = hasSrcOrgLocale
		? await db
				.prepare(
					`UPDATE posts
					    SET generate_hashtags_locale = ?,
					        batch_id = COALESCE(?, batch_id),
					        prepare_content_refined = ?,
					        updated_at = datetime('now')
					  WHERE post_id = ?`
				)
				.bind(generateHashtagsLocale, payloadBatchId, nextPrepareContentRefined, postId)
				.run()
		: await db
				.prepare(
					`UPDATE posts
					    SET generate_hashtags_locale = ?,
					        batch_id = COALESCE(?, batch_id),
					        updated_at = datetime('now')
					  WHERE post_id = ?`
				)
				.bind(generateHashtagsLocale, payloadBatchId, postId)
				.run();

	if ((updateResult.meta?.changes ?? 0) < 1) {
		return { ok: false, status: 409, message: "failed to update generate_hashtags_locale", postId };
	}

	return {
		ok: true,
		postId,
		generateHashtagsLocale,
		batchId: payloadBatchId ?? post.batch_id ?? null,
		prepareContentRefined: nextPrepareContentRefined,
	};
}

async function applyGeminiBatchUpdate(
	db: D1Database,
	payload: GeminiBatchUpdatePayload,
	hasPrepareData: boolean
): Promise<GeminiBatchUpdateResult> {
	const postId = parsePostId(payload.post_id);
	if (!postId) return { ok: false, status: 400, message: "invalid post_id", postId: null };

	const prepareStatus = asTrimmedOrNull(payload.prepare_status);
	if (!isGeminiBatchPrepareStatus(prepareStatus)) {
		return {
			ok: false,
			status: 400,
			message:
				"prepare_status must be fetch_url_batch_create, fetch_url_batch_done, prepare_content_batch_create, or prepare_content_batch_done",
			postId,
		};
	}

	const parseGeminiInfoResult = parseGeminiBatchInfo(payload.gemini_info);
	if (!parseGeminiInfoResult.info) {
		return {
			ok: false,
			status: 400,
			message: parseGeminiInfoResult.error ?? "invalid gemini_info",
			postId,
		};
	}
	const geminiInfo = parseGeminiInfoResult.info;
	const payloadBatchId = asTrimmedOrNull(payload.batch_id);
	if (payloadBatchId) geminiInfo.job.gemini_batch_id = payloadBatchId;
	const expectedItemPurpose = getGeminiBatchItemPurposeForPrepareStatus(prepareStatus);
	const expectedJobPurpose = expectedItemPurpose;
	const itemType = geminiInfo.item.item_type ?? GEMINI_BATCH_ITEM_TYPE_POSTS;
	const itemPurpose = geminiInfo.item.item_purpose ?? expectedItemPurpose;
	const jobPurpose = geminiInfo.job.item_purpose ?? expectedJobPurpose;
	const itemId = geminiInfo.item.item_id ?? postId;

	if (itemType !== GEMINI_BATCH_ITEM_TYPE_POSTS) {
		return { ok: false, status: 400, message: "gemini_info.item.item_type must be posts", postId };
	}
	if (itemPurpose !== expectedItemPurpose) {
		return { ok: false, status: 400, message: `gemini_info.item.item_purpose must be ${expectedItemPurpose}`, postId };
	}
	if (jobPurpose !== expectedJobPurpose) {
		return { ok: false, status: 400, message: `gemini_info.job.item_purpose must be ${expectedJobPurpose}`, postId };
	}
	if (itemId !== postId) {
		return { ok: false, status: 400, message: "gemini_info.item.item_id must match post_id", postId };
	}

	const existingPost = await db
		.prepare("SELECT post_id, prepare_src FROM posts WHERE post_id = ? LIMIT 1")
		.bind(postId)
		.first<{ post_id: number; prepare_src: string | null }>();
	if (!existingPost?.post_id) {
		return { ok: false, status: 404, message: "post not found", postId };
	}

	let batchJobId: number | null = null;
	let geminiBatchId: string | null = geminiInfo.job.gemini_batch_id;
	let batchItemId: number | null = null;
	const isCreateStatus = isGeminiBatchCreateStatus(prepareStatus);

	if (isCreateStatus) {
		const jobStatus = geminiInfo.job.status ?? "queued";
		if (!geminiInfo.job.gemini_batch_id || !geminiInfo.job.model_name) {
			return {
				ok: false,
				status: 400,
				message: `batch_id (or gemini_info.job.gemini_batch_id) and gemini_info.job.model_name are required for ${prepareStatus}`,
				postId,
			};
		}
		if (!geminiInfo.item.gemini_custom_id) {
			return {
				ok: false,
				status: 400,
				message: `gemini_info.item.gemini_custom_id is required for ${prepareStatus}`,
				postId,
			};
		}

		await db
			.prepare(
				`INSERT INTO gemini_batch_jobs (
				    gemini_batch_id,
				    status,
				    item_purpose,
				    submitted_by_admin_id,
				    model_name,
				    prompt_version,
				    prepare_mode,
				    request_payload_ref,
				    response_payload_ref,
				    queued_at,
				    started_at,
				    completed_at,
				    duration_ms,
				    input_tokens,
				    output_tokens,
				    total_tokens,
				    estimated_cost_usd,
				    attempt_count,
				    last_error_code,
				    last_error_message,
				    updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
				ON CONFLICT(gemini_batch_id) DO UPDATE SET
				    status = COALESCE(excluded.status, gemini_batch_jobs.status),
				    item_purpose = COALESCE(excluded.item_purpose, gemini_batch_jobs.item_purpose),
				    submitted_by_admin_id = COALESCE(excluded.submitted_by_admin_id, gemini_batch_jobs.submitted_by_admin_id),
				    model_name = COALESCE(excluded.model_name, gemini_batch_jobs.model_name),
				    prompt_version = COALESCE(excluded.prompt_version, gemini_batch_jobs.prompt_version),
				    prepare_mode = COALESCE(excluded.prepare_mode, gemini_batch_jobs.prepare_mode),
				    request_payload_ref = COALESCE(excluded.request_payload_ref, gemini_batch_jobs.request_payload_ref),
				    response_payload_ref = COALESCE(excluded.response_payload_ref, gemini_batch_jobs.response_payload_ref),
				    queued_at = COALESCE(excluded.queued_at, gemini_batch_jobs.queued_at),
				    started_at = COALESCE(excluded.started_at, gemini_batch_jobs.started_at),
				    completed_at = COALESCE(excluded.completed_at, gemini_batch_jobs.completed_at),
				    duration_ms = COALESCE(excluded.duration_ms, gemini_batch_jobs.duration_ms),
				    input_tokens = COALESCE(excluded.input_tokens, gemini_batch_jobs.input_tokens),
				    output_tokens = COALESCE(excluded.output_tokens, gemini_batch_jobs.output_tokens),
				    total_tokens = COALESCE(excluded.total_tokens, gemini_batch_jobs.total_tokens),
				    estimated_cost_usd = COALESCE(excluded.estimated_cost_usd, gemini_batch_jobs.estimated_cost_usd),
				    attempt_count = COALESCE(excluded.attempt_count, gemini_batch_jobs.attempt_count),
				    last_error_code = COALESCE(excluded.last_error_code, gemini_batch_jobs.last_error_code),
				    last_error_message = COALESCE(excluded.last_error_message, gemini_batch_jobs.last_error_message),
				    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`
			)
			.bind(
				geminiInfo.job.gemini_batch_id,
				jobStatus,
				jobPurpose,
				geminiInfo.job.submitted_by_admin_id,
				geminiInfo.job.model_name,
				geminiInfo.job.prompt_version,
				geminiInfo.job.prepare_mode,
				geminiInfo.job.request_payload_ref,
				geminiInfo.job.response_payload_ref,
				geminiInfo.job.queued_at,
				geminiInfo.job.started_at,
				geminiInfo.job.completed_at,
				geminiInfo.job.duration_ms,
				geminiInfo.job.input_tokens,
				geminiInfo.job.output_tokens,
				geminiInfo.job.total_tokens,
				geminiInfo.job.estimated_cost_usd,
				geminiInfo.job.attempt_count ?? 0,
				geminiInfo.job.last_error_code,
				geminiInfo.job.last_error_message
			)
			.run();

		const jobRow = await db
			.prepare("SELECT id, gemini_batch_id FROM gemini_batch_jobs WHERE gemini_batch_id = ? LIMIT 1")
			.bind(geminiInfo.job.gemini_batch_id)
			.first<{ id: number; gemini_batch_id: string }>();
		if (!jobRow?.id) {
			return { ok: false, status: 500, message: "failed to resolve gemini batch job after upsert", postId };
		}
		batchJobId = jobRow.id;
		geminiBatchId = jobRow.gemini_batch_id;

		await db
			.prepare(
				`INSERT INTO gemini_batch_items (
				    batch_job_id,
				    item_purpose,
				    item_type,
				    item_id,
				    gemini_custom_id,
				    item_status,
				    parse_ok,
				    validation_ok,
				    failure_stage,
				    result_json,
				    input_ref,
				    output_ref,
				    input_tokens,
				    output_tokens,
				    total_tokens,
				    estimated_cost_usd,
				    attempt_count,
				    error_code,
				    error_message,
				    updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
				ON CONFLICT(batch_job_id, item_type, item_id) DO UPDATE SET
				    item_purpose = COALESCE(excluded.item_purpose, gemini_batch_items.item_purpose),
				    gemini_custom_id = COALESCE(excluded.gemini_custom_id, gemini_batch_items.gemini_custom_id),
				    item_status = COALESCE(excluded.item_status, gemini_batch_items.item_status),
				    parse_ok = COALESCE(excluded.parse_ok, gemini_batch_items.parse_ok),
				    validation_ok = COALESCE(excluded.validation_ok, gemini_batch_items.validation_ok),
				    failure_stage = COALESCE(excluded.failure_stage, gemini_batch_items.failure_stage),
				    result_json = COALESCE(excluded.result_json, gemini_batch_items.result_json),
				    input_ref = COALESCE(excluded.input_ref, gemini_batch_items.input_ref),
				    output_ref = COALESCE(excluded.output_ref, gemini_batch_items.output_ref),
				    input_tokens = COALESCE(excluded.input_tokens, gemini_batch_items.input_tokens),
				    output_tokens = COALESCE(excluded.output_tokens, gemini_batch_items.output_tokens),
				    total_tokens = COALESCE(excluded.total_tokens, gemini_batch_items.total_tokens),
				    estimated_cost_usd = COALESCE(excluded.estimated_cost_usd, gemini_batch_items.estimated_cost_usd),
				    attempt_count = COALESCE(excluded.attempt_count, gemini_batch_items.attempt_count),
				    error_code = COALESCE(excluded.error_code, gemini_batch_items.error_code),
				    error_message = COALESCE(excluded.error_message, gemini_batch_items.error_message),
				    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`
			)
			.bind(
				batchJobId,
				itemPurpose,
				itemType,
				itemId,
				geminiInfo.item.gemini_custom_id,
				geminiInfo.item.item_status ?? jobStatus,
				geminiInfo.item.parse_ok ?? 0,
				geminiInfo.item.validation_ok ?? 0,
				geminiInfo.item.failure_stage,
				geminiInfo.item.result_json,
				geminiInfo.item.input_ref,
				geminiInfo.item.output_ref,
				geminiInfo.item.input_tokens,
				geminiInfo.item.output_tokens,
				geminiInfo.item.total_tokens,
				geminiInfo.item.estimated_cost_usd,
				geminiInfo.item.attempt_count ?? 0,
				geminiInfo.item.error_code,
				geminiInfo.item.error_message
			)
			.run();

		const batchItemRow = await db
			.prepare("SELECT id FROM gemini_batch_items WHERE batch_job_id = ? AND item_type = ? AND item_id = ? LIMIT 1")
			.bind(batchJobId, itemType, itemId)
			.first<{ id: number }>();
		if (!batchItemRow?.id) {
			return { ok: false, status: 500, message: "failed to resolve gemini batch item after upsert", postId };
		}
		batchItemId = batchItemRow.id;
	} else {
		batchJobId = geminiInfo.job.batch_job_id;
		if (!batchJobId && geminiInfo.job.gemini_batch_id) {
			const foundByGeminiBatchId = await db
				.prepare("SELECT id, gemini_batch_id FROM gemini_batch_jobs WHERE gemini_batch_id = ? LIMIT 1")
				.bind(geminiInfo.job.gemini_batch_id)
				.first<{ id: number; gemini_batch_id: string }>();
			batchJobId = foundByGeminiBatchId?.id ?? null;
			geminiBatchId = foundByGeminiBatchId?.gemini_batch_id ?? geminiBatchId;
		}
		if (!batchJobId) {
			const latestItemForPost = await db
				.prepare(
					`SELECT i.batch_job_id, j.gemini_batch_id
					   FROM gemini_batch_items i
					   LEFT JOIN gemini_batch_jobs j ON j.id = i.batch_job_id
					  WHERE i.item_type = ?
					    AND i.item_purpose = ?
					    AND i.item_id = ?
					  ORDER BY i.updated_at DESC, i.id DESC
					  LIMIT 1`
				)
				.bind(itemType, itemPurpose, itemId)
				.first<{ batch_job_id: number; gemini_batch_id: string | null }>();
			batchJobId = latestItemForPost?.batch_job_id ?? null;
			geminiBatchId = latestItemForPost?.gemini_batch_id ?? geminiBatchId;
		}
		if (!batchJobId) {
			return { ok: false, status: 404, message: "no related gemini batch job found for post", postId };
		}

		await db
			.prepare(
				`UPDATE gemini_batch_jobs
				    SET status = COALESCE(?, status),
				        item_purpose = COALESCE(?, item_purpose),
				        submitted_by_admin_id = COALESCE(?, submitted_by_admin_id),
				        model_name = COALESCE(?, model_name),
				        prompt_version = COALESCE(?, prompt_version),
				        prepare_mode = COALESCE(?, prepare_mode),
				        request_payload_ref = COALESCE(?, request_payload_ref),
				        response_payload_ref = COALESCE(?, response_payload_ref),
				        queued_at = COALESCE(?, queued_at),
				        started_at = COALESCE(?, started_at),
				        completed_at = COALESCE(?, completed_at),
				        duration_ms = COALESCE(?, duration_ms),
				        input_tokens = COALESCE(?, input_tokens),
				        output_tokens = COALESCE(?, output_tokens),
				        total_tokens = COALESCE(?, total_tokens),
				        estimated_cost_usd = COALESCE(?, estimated_cost_usd),
				        attempt_count = COALESCE(?, attempt_count),
				        last_error_code = COALESCE(?, last_error_code),
				        last_error_message = COALESCE(?, last_error_message),
				        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
				  WHERE id = ?`
			)
			.bind(
				geminiInfo.job.status ?? "completed",
				jobPurpose,
				geminiInfo.job.submitted_by_admin_id,
				geminiInfo.job.model_name,
				geminiInfo.job.prompt_version,
				geminiInfo.job.prepare_mode,
				geminiInfo.job.request_payload_ref,
				geminiInfo.job.response_payload_ref,
				geminiInfo.job.queued_at,
				geminiInfo.job.started_at,
				geminiInfo.job.completed_at,
				geminiInfo.job.duration_ms,
				geminiInfo.job.input_tokens,
				geminiInfo.job.output_tokens,
				geminiInfo.job.total_tokens,
				geminiInfo.job.estimated_cost_usd,
				geminiInfo.job.attempt_count,
				geminiInfo.job.last_error_code,
				geminiInfo.job.last_error_message,
				batchJobId
			)
			.run();

		const existingItem = await db
			.prepare("SELECT id, gemini_custom_id FROM gemini_batch_items WHERE batch_job_id = ? AND item_type = ? AND item_id = ? LIMIT 1")
			.bind(batchJobId, itemType, itemId)
			.first<{ id: number; gemini_custom_id: string | null }>();
		const geminiCustomId = geminiInfo.item.gemini_custom_id ?? existingItem?.gemini_custom_id ?? null;
		if (!geminiCustomId) {
			return {
				ok: false,
				status: 400,
				message: "gemini_info.item.gemini_custom_id is required when no matching gemini_batch_items row exists",
				postId,
			};
		}

		if (existingItem?.id) {
			await db
				.prepare(
					`UPDATE gemini_batch_items
					    SET item_purpose = COALESCE(?, item_purpose),
					        gemini_custom_id = COALESCE(?, gemini_custom_id),
					        item_status = COALESCE(?, item_status),
					        parse_ok = COALESCE(?, parse_ok),
					        validation_ok = COALESCE(?, validation_ok),
					        failure_stage = COALESCE(?, failure_stage),
					        result_json = COALESCE(?, result_json),
					        input_ref = COALESCE(?, input_ref),
					        output_ref = COALESCE(?, output_ref),
					        input_tokens = COALESCE(?, input_tokens),
					        output_tokens = COALESCE(?, output_tokens),
					        total_tokens = COALESCE(?, total_tokens),
					        estimated_cost_usd = COALESCE(?, estimated_cost_usd),
					        attempt_count = COALESCE(?, attempt_count),
					        error_code = COALESCE(?, error_code),
					        error_message = COALESCE(?, error_message),
					        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
					  WHERE id = ?`
				)
				.bind(
					itemPurpose,
					geminiCustomId,
					geminiInfo.item.item_status ?? "done",
					geminiInfo.item.parse_ok,
					geminiInfo.item.validation_ok,
					geminiInfo.item.failure_stage,
					geminiInfo.item.result_json,
					geminiInfo.item.input_ref,
					geminiInfo.item.output_ref,
					geminiInfo.item.input_tokens,
					geminiInfo.item.output_tokens,
					geminiInfo.item.total_tokens,
					geminiInfo.item.estimated_cost_usd,
					geminiInfo.item.attempt_count,
					geminiInfo.item.error_code,
					geminiInfo.item.error_message,
					existingItem.id
				)
				.run();
			batchItemId = existingItem.id;
		} else {
			const insertItemResult = await db
				.prepare(
					`INSERT INTO gemini_batch_items (
					    batch_job_id,
					    item_purpose,
					    item_type,
					    item_id,
					    gemini_custom_id,
					    item_status,
					    parse_ok,
					    validation_ok,
					    failure_stage,
					    result_json,
					    input_ref,
					    output_ref,
					    input_tokens,
					    output_tokens,
					    total_tokens,
					    estimated_cost_usd,
					    attempt_count,
					    error_code,
					    error_message,
					    updated_at
					)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))`
				)
				.bind(
					batchJobId,
					itemPurpose,
					itemType,
					itemId,
					geminiCustomId,
					geminiInfo.item.item_status ?? "done",
					geminiInfo.item.parse_ok ?? 0,
					geminiInfo.item.validation_ok ?? 0,
					geminiInfo.item.failure_stage,
					geminiInfo.item.result_json,
					geminiInfo.item.input_ref,
					geminiInfo.item.output_ref,
					geminiInfo.item.input_tokens,
					geminiInfo.item.output_tokens,
					geminiInfo.item.total_tokens,
					geminiInfo.item.estimated_cost_usd,
					geminiInfo.item.attempt_count ?? 0,
					geminiInfo.item.error_code,
					geminiInfo.item.error_message
				)
				.run();
			const insertedItemId = Number(insertItemResult.meta?.last_row_id ?? 0);
			batchItemId = Number.isInteger(insertedItemId) && insertedItemId > 0 ? insertedItemId : null;
		}

		if (!geminiBatchId) {
			const resolvedJob = await db
				.prepare("SELECT gemini_batch_id FROM gemini_batch_jobs WHERE id = ? LIMIT 1")
				.bind(batchJobId)
				.first<{ gemini_batch_id: string | null }>();
			geminiBatchId = resolvedJob?.gemini_batch_id ?? null;
		}
	}

	if (!batchJobId || !batchItemId) {
		return { ok: false, status: 500, message: "failed to resolve gemini batch update identifiers", postId };
	}

	const postBatchId = payloadBatchId ?? geminiBatchId;

	if (hasPrepareData && prepareStatus === GEMINI_BATCH_PREPARE_STATUS_FETCH_URL_DONE) {
		const prepareSrc = normalizeJsonText(payload.prepare_data);
		const updatePostResult = await db
			.prepare(
				`UPDATE posts
				    SET prepare_status = ?,
				        batch_id = COALESCE(?, batch_id),
				        prepare_src = ?,
				        updated_at = datetime('now')
				  WHERE post_id = ?`
			)
			.bind(prepareStatus, postBatchId, prepareSrc, postId)
			.run();
		if ((updatePostResult.meta?.changes ?? 0) < 1) {
			return { ok: false, status: 409, message: "failed to update post prepare status", postId };
		}
		} else if (hasPrepareData && prepareStatus === GEMINI_BATCH_PREPARE_STATUS_PREPARE_CONTENT_DONE) {
			const prepareContent = normalizeJsonText(payload.prepare_data);
			const updatePostResult = await db
				.prepare(
					`UPDATE posts
					    SET prepare_status = ?,
					        batch_id = COALESCE(?, batch_id),
					        prepare_content = ?,
					        generate_hashtags_locale = ?,
					        updated_at = datetime('now')
					  WHERE post_id = ?`
				)
				.bind(prepareStatus, postBatchId, prepareContent, GENERATE_HASHTAGS_LOCALE_STATUS_REQUESTED, postId)
				.run();
			if ((updatePostResult.meta?.changes ?? 0) < 1) {
				return { ok: false, status: 409, message: "failed to update post prepare status", postId };
			}
	} else {
		const updatePostResult = await db
			.prepare(
				`UPDATE posts
				    SET prepare_status = ?,
				        batch_id = COALESCE(?, batch_id),
				        updated_at = datetime('now')
				  WHERE post_id = ?`
			)
			.bind(prepareStatus, postBatchId, postId)
			.run();
		if ((updatePostResult.meta?.changes ?? 0) < 1) {
			return { ok: false, status: 409, message: "failed to update post prepare status", postId };
		}
	}

	return {
		ok: true,
		postId,
		prepareStatus,
		batchJobId,
		batchItemId,
		batchId: postBatchId,
		geminiBatchId,
	};
}

async function savePostFromPayload(db: D1Database, payload: SavePostPayload): Promise<SavePostResult> {
	const prepareMode = asTrimmedOrNull(payload.prepare_mode);
	const requestedPostIdRaw = parsePostId(payload.post_pk ?? payload.post_id);
	const forceCreateFromPreparePlanMode = prepareMode === "prepare_plan";
	const requestedPostId = forceCreateFromPreparePlanMode ? null : requestedPostIdRaw;
	const preparePostId = parsePostId(payload.prepare_post_id);

	debugPosts("save post payload started", {
		has_post_id: Boolean(requestedPostIdRaw),
		prepare_post_id: preparePostId,
		prepare_mode: prepareMode,
		force_create: forceCreateFromPreparePlanMode,
		pages_input_type: describeValueType(payload.pages),
		visibility: asTrimmedOrNull(payload.visibility),
	});
	if (forceCreateFromPreparePlanMode && requestedPostIdRaw) {
		debugPosts("ignoring post_id in prepare_plan mode", { post_id: requestedPostIdRaw });
	}

	const userPk = parsePostId(payload.user_pk);
	if (!userPk) {
		debugPosts("save post payload rejected", { reason: "invalid user_pk", user_pk_type: describeValueType(payload.user_pk) });
		return { ok: false, status: 400, message: "`user_pk` must be a positive integer." };
	}

	const parsedPages = parseSavePages(payload.pages);
	if (parsedPages.error) {
		debugPosts("save post payload rejected", { reason: parsedPages.error });
		return { ok: false, status: 400, message: parsedPages.error };
	}

	const visibilityInput = asTrimmedOrNull(payload.visibility);
	if (visibilityInput && !isVisibility(visibilityInput)) {
		debugPosts("save post payload rejected", { reason: "invalid visibility", visibility: visibilityInput });
		return { ok: false, status: 400, message: "`visibility` must be public, followers, private, draft, prepare, or published." };
	}
	const visibility = normalizeVisibilityForStorage((visibilityInput as Visibility | null) ?? null);

	const locale = asTrimmedOrNull(payload.locale);
	const caption = asTrimmedOrNull(payload.caption);
	const customContent = asTrimmedOrNull(payload.custom_content);
	const hasPrepareContent = Object.prototype.hasOwnProperty.call(payload, "prepare_content");
	const prepareContent = hasPrepareContent ? normalizeJsonText(payload.prepare_content) : null;
	const title = asTrimmedOrNull(payload.title);
	const templateId = asTrimmedOrNull(payload.template_id);
	const showPageContent = payload.show_page_content === 0 || payload.show_page_content === false ? 0 : 1;

	let postId: number | null = null;
	let postSlug: string | null = null;
	let created = false;

	if (requestedPostId) {
		debugPosts("updating existing post", { post_id: requestedPostId, pages_count: parsedPages.pages.length });
		const existingPost = await db
			.prepare("SELECT post_id, post_slug FROM posts WHERE post_id = ? LIMIT 1")
			.bind(requestedPostId)
			.first<{ post_id: number; post_slug: string | null }>();
		if (!existingPost?.post_id) {
			debugPosts("save post payload rejected", { reason: "post not found", post_id: requestedPostId });
			return { ok: false, status: 404, message: "post not found" };
		}

		await db
			.prepare(
				`UPDATE posts
					SET user_pk = ?,
				        locale = ?,
				        caption = ?,
				        show_page_content = ?,
				        custom_content = ?,
				        prepare_content = CASE WHEN ? = 1 THEN ? ELSE prepare_content END,
				        title = ?,
				        template_id = ?,
				        cover_page = 1,
				        visibility = ?,
				        updated_at = datetime('now')
				  WHERE post_id = ?`
			)
				.bind(
					userPk,
					locale,
					caption,
					showPageContent,
					customContent,
					hasPrepareContent ? 1 : 0,
					prepareContent,
					title,
					templateId,
					visibility,
					existingPost.post_id
				)
				.run();

		postId = existingPost.post_id;
		postSlug = existingPost.post_slug;
	} else {
		debugPosts("creating new post", { pages_count: parsedPages.pages.length });
		for (let attempt = 0; attempt < POST_SLUG_INSERT_ATTEMPTS; attempt += 1) {
			const candidateSlug = generatePostSlug(POST_SLUG_LENGTH);
			try {
				const insertResult = await db
					.prepare(
						`INSERT INTO posts (
							user_pk,
							post_slug,
							locale,
							caption,
							show_page_content,
							custom_content,
							prepare_content,
							sell,
							title,
							template_id,
							prepare_post_id,
							cover_page,
							visibility
						)
						VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1, ?)`
					)
					.bind(
						userPk,
						candidateSlug,
						locale,
						caption,
						showPageContent,
						customContent,
						prepareContent,
						title,
						templateId,
						preparePostId,
						visibility
					)
					.run();

				const insertedPostId = Number(insertResult.meta.last_row_id);
				if (!Number.isInteger(insertedPostId) || insertedPostId < 1) {
					return { ok: false, status: 500, message: "Could not resolve inserted post ID." };
				}

				postId = insertedPostId;
				postSlug = candidateSlug;
				created = true;
				debugPosts("new post created", {
					post_id: postId,
					post_slug: postSlug,
					attempt: attempt + 1,
					prepare_post_id: preparePostId,
				});
				break;
			} catch (error) {
				if (isPostSlugUniqueConstraintError(error) && attempt < POST_SLUG_INSERT_ATTEMPTS - 1) {
					debugPosts("post slug collision", { attempt: attempt + 1, post_slug: candidateSlug });
					continue;
				}
				throw error;
			}
		}
		if (!postId) {
			return { ok: false, status: 500, message: "Failed to generate a unique post slug." };
		}
	}

	const pageStatements = [
		db.prepare("DELETE FROM post_pages WHERE post_id = ?").bind(postId),
		...parsedPages.pages.map((page) =>
			db
				.prepare(
					`INSERT INTO post_pages (
						post_id,
						page_num,
						media_url,
						media_type,
						width,
						height,
						media_crop_top_left_x,
						media_crop_top_left_y,
						media_crop_bottom_right_x,
						media_crop_bottom_right_y,
						alt_text,
						title,
						h1,
						h2,
						h3,
						h4,
						caption,
						layout_json,
						raw_media_url,
						bg_media_url
					)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					postId,
					page.page_num,
					page.media_url,
					page.media_type,
					page.width,
					page.height,
					page.media_crop_top_left_x,
					page.media_crop_top_left_y,
					page.media_crop_bottom_right_x,
					page.media_crop_bottom_right_y,
					page.alt_text,
					page.title,
					page.h1,
					page.h2,
					page.h3,
					page.h4,
					page.caption,
					page.layout_json,
					page.raw_media_url,
					page.bg_media_url
				)
			),
	];
	debugPosts("post pages insert started", {
		post_id: postId,
		pages_count: parsedPages.pages.length,
		statement_count: pageStatements.length,
	});
	const pageBatchResults = await db.batch(pageStatements);
	debugPosts("post pages insert completed", {
		post_id: postId,
		pages_count: parsedPages.pages.length,
		statement_count: pageBatchResults.length,
		total_changes: sumBatchChanges(pageBatchResults),
	});

	const hashtagSourceParts: string[] = [];
	if (caption) hashtagSourceParts.push(caption);
	if (title) hashtagSourceParts.push(title);
	for (const page of parsedPages.pages) {
		if (page.h1) hashtagSourceParts.push(page.h1);
		if (page.h2) hashtagSourceParts.push(page.h2);
		if (page.h3) hashtagSourceParts.push(page.h3);
		if (page.h4) hashtagSourceParts.push(page.h4);
		if (page.caption) hashtagSourceParts.push(page.caption);
	}
	const tags = extractHashtagsFromContent(hashtagSourceParts.join("\n"));
	const hashtagStatements = [
		db.prepare("DELETE FROM post_hashtags WHERE post_id = ?").bind(postId),
		...tags.map((tag) => db.prepare("INSERT OR IGNORE INTO post_hashtags (post_id, tag) VALUES (?, ?)").bind(postId, tag)),
	];
	await db.batch(hashtagStatements);
	debugPosts("hashtags updated", { post_id: postId, hashtag_count: tags.length });

	return {
		ok: true,
		postId,
		postSlug,
		pagesSaved: parsedPages.pages.length,
		created,
	};
}

async function applyPreparePostUpdate(db: D1Database, payload: PreparePostUpdatePayload) {
	const postId = parsePostId(payload.post_id);
	if (!postId) return { ok: false as const, status: 400, message: "invalid post_id" };

	const title = asTrimmedOrNull(payload.title);
	const content = asTrimmedOrNull(payload.content);
	const prepareMode = asTrimmedOrNull(payload.prepare_mode);
	const images = normalizeImageUrls(payload.images);
	const prepareSrcJson = JSON.stringify(payload);

	if (!title || !content) {
		return { ok: false as const, status: 400, message: "title and content are required", postId };
	}
	if (!images.length) {
		return { ok: false as const, status: 400, message: "images must be a non-empty string array", postId };
	}

	const update = await db
		.prepare(
			`UPDATE posts
			    SET caption = ?,
			        title = ?,
			        prepare_src = ?,
			        cover_page = 1,
			        prepare_mode = COALESCE(?, prepare_mode)
			  WHERE post_id = ?
					    AND prepare_status = 'fetch_url'
					    AND visibility = 'prepare'`
		)
		.bind(content, title, prepareSrcJson, prepareMode, postId)
		.run();

	if ((update.meta?.changes ?? 0) < 1) {
		return {
			ok: false as const,
			status: 409,
			message: "post is not in prepare visibility with fetch_url status",
			postId,
		};
	}

	const pageStatements = [
		db.prepare("DELETE FROM post_pages WHERE post_id = ?").bind(postId),
		...images.map((imageUrl, index) =>
			db.prepare(
				`INSERT INTO post_pages (post_id, page_num, media_url, raw_media_url, media_type, width, height, alt_text, caption, title)
           VALUES (?, ?, ?, ?, 'image', NULL, NULL, NULL, NULL, NULL)`
			)
				.bind(postId, index + 1, imageUrl, imageUrl)
			),
	];
	debugPosts("prepare pages insert started", { post_id: postId, pages_count: images.length, statement_count: pageStatements.length });
	const pageBatchResults = await db.batch(pageStatements);
	debugPosts("prepare pages insert completed", {
		post_id: postId,
		pages_count: images.length,
		statement_count: pageBatchResults.length,
		total_changes: sumBatchChanges(pageBatchResults),
	});
	await db
		.prepare("UPDATE posts SET prepare_status = 'fetch_url_done', updated_at = datetime('now') WHERE post_id = ?")
		.bind(postId)
		.run();

	return {
		ok: true as const,
		postId,
		pagesInserted: images.length,
	};
}

async function applyPreparePlanUpdate(db: D1Database, payload: PreparePlanUpdatePayload) {
	const postId = parsePostId(payload.post_id);
	if (!postId) return { ok: false as const, status: 400, message: "invalid post_id" };

	const preparePlan = normalizePreparePlan(payload.prepare_plan);
	const prepareMode = asTrimmedOrNull(payload.prepare_mode);
	if (!preparePlan) {
		return { ok: false as const, status: 400, message: "prepare_plan is required", postId };
	}

	const update = await db
		.prepare(
			`UPDATE posts
			    SET prepare_plan = ?,
			        prepare_status = 'fetch_plan_done',
			        prepare_mode = COALESCE(?, prepare_mode),
			        updated_at = datetime('now')
			  WHERE post_id = ?
			    AND prepare_status = 'fetch_url_done'
			    AND visibility = 'prepare'`
		)
		.bind(preparePlan, prepareMode, postId)
		.run();

	if ((update.meta?.changes ?? 0) < 1) {
		return {
			ok: false as const,
			status: 409,
			message: "post is not in prepare visibility with fetch_url_done status",
			postId,
		};
	}

	return {
		ok: true as const,
		postId,
	};
}

async function markPreparePlanDoneForPostId(db: D1Database, payload: PreparePlanUpdatePayload) {
	const postId = parsePostId(payload.post_id);
	if (!postId) return { ok: false as const, status: 400, message: "invalid post_id", postId: null };

	const existing = await db
		.prepare("SELECT post_id FROM posts WHERE post_id = ? LIMIT 1")
		.bind(postId)
		.first<{ post_id: number }>();
	if (!existing?.post_id) {
		return { ok: false as const, status: 404, message: "post not found", postId };
	}

	const preparePlan = normalizePreparePlan(payload.prepare_plan);
	const prepareMode = asTrimmedOrNull(payload.prepare_mode);
	const update = await db
		.prepare(
			`UPDATE posts
			    SET prepare_plan = COALESCE(?, prepare_plan),
			        prepare_status = 'fetch_plan_done',
			        prepare_mode = COALESCE(?, prepare_mode),
			        updated_at = datetime('now')
			  WHERE post_id = ?`
		)
		.bind(preparePlan, prepareMode, postId)
		.run();

	if ((update.meta?.changes ?? 0) < 1) {
		return {
			ok: false as const,
			status: 409,
			message: "failed to update prepare_status to fetch_plan_done",
			postId,
		};
	}

	return { ok: true as const, postId };
}

export async function GET(request: Request) {
	const { env } = await getCloudflareContext({ async: true });
	const db = (env as CloudflareEnv & { DB?: D1Database }).DB;
	if (!db) return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });

	try {
		const requestUrl = new URL(request.url);
		const fetchUrlBatchPendingRaw = (requestUrl.searchParams.get("fetch_url_batch_pending") || "").trim().toLowerCase();
		if (fetchUrlBatchPendingRaw === "1" || fetchUrlBatchPendingRaw === "true" || fetchUrlBatchPendingRaw === "yes") {
			const pendingRows = await loadPendingFetchUrlBatch(db);
			const postMetaMap = await loadPostMetaMap(db, pendingRows.map((row) => row.post_id));
			const pending = pendingRows.map((row) => ({
				...row,
				cat_code: postMetaMap.get(row.post_id)?.cat_code ?? null,
				sub_cat_code: postMetaMap.get(row.post_id)?.sub_cat_code ?? null,
				site: postMetaMap.get(row.post_id)?.site ?? null,
			}));
			return NextResponse.json({
				ok: true,
				count: pending.length,
				pending,
				gemini_batch_update_action: GEMINI_BATCH_ACTION,
				gemini_info_spec: GEMINI_BATCH_UPDATE_GEMINI_INFO_SPEC,
			});
		}
		const prepareContentBatchPendingRaw = (requestUrl.searchParams.get("prepare_content_batch_pending") || "")
			.trim()
			.toLowerCase();
		if (
			prepareContentBatchPendingRaw === "1" ||
			prepareContentBatchPendingRaw === "true" ||
			prepareContentBatchPendingRaw === "yes"
		) {
			const pendingRows = await loadPendingPrepareContentBatch(db);
			const postMetaMap = await loadPostMetaMap(db, pendingRows.map((row) => row.post_id));
			const pending = pendingRows.map((row) => ({
				...row,
				cat_code: postMetaMap.get(row.post_id)?.cat_code ?? null,
				sub_cat_code: postMetaMap.get(row.post_id)?.sub_cat_code ?? null,
				site: postMetaMap.get(row.post_id)?.site ?? null,
			}));
			return NextResponse.json({
				ok: true,
				count: pending.length,
				pending,
				gemini_batch_update_action: GEMINI_BATCH_ACTION,
				gemini_info_spec: GEMINI_BATCH_UPDATE_GEMINI_INFO_SPEC,
			});
		}
		const fetchUrlBatchDoneReadyRaw = (requestUrl.searchParams.get("fetch_url_batch_done_ready") || "").trim().toLowerCase();
		if (fetchUrlBatchDoneReadyRaw === "1" || fetchUrlBatchDoneReadyRaw === "true" || fetchUrlBatchDoneReadyRaw === "yes") {
			const readyPosts = await loadFetchUrlBatchDoneReadyPosts(db);
			const postMetaMap = await loadPostMetaMap(db, readyPosts.map((row) => row.post_id));
			const posts = readyPosts.map((row) => ({
				...row,
				cat_code: postMetaMap.get(row.post_id)?.cat_code ?? null,
				sub_cat_code: postMetaMap.get(row.post_id)?.sub_cat_code ?? null,
				site: postMetaMap.get(row.post_id)?.site ?? null,
			}));
			return NextResponse.json({
				ok: true,
				count: posts.length,
				posts,
			});
		}
		const generateHashtagsLocaleReadyRaw = (requestUrl.searchParams.get("generate_hashtags_locale_ready") || "")
			.trim()
			.toLowerCase();
		if (
			generateHashtagsLocaleReadyRaw === "1" ||
			generateHashtagsLocaleReadyRaw === "true" ||
			generateHashtagsLocaleReadyRaw === "yes"
		) {
			const posts = await loadGenerateHashtagsLocaleReadyPosts(db);
			return NextResponse.json({
				ok: true,
				count: posts.length,
				posts,
			});
		}
		const generateHashtagsLocalePendingRaw = (requestUrl.searchParams.get("generate_hashtags_locale_pending") || "")
			.trim()
			.toLowerCase();
		if (
			generateHashtagsLocalePendingRaw === "1" ||
			generateHashtagsLocalePendingRaw === "true" ||
			generateHashtagsLocalePendingRaw === "yes"
		) {
			const pending = await loadPendingGenerateHashtagsLocalePosts(db);
			return NextResponse.json({
				ok: true,
				count: pending.length,
				pending,
			});
		}

		const requestedPrepareStatus = asTrimmedOrNull(
			requestUrl.searchParams.get("prepare_status") ?? requestUrl.searchParams.get("prepareStatus")
		);
		const requestedPostId = parsePostId(requestUrl.searchParams.get("post_id") ?? requestUrl.searchParams.get("postId"));
		if (requestedPostId) {
			const loaded = await loadPostForEdit(db, requestedPostId);
			if (!loaded) {
				return NextResponse.json({ ok: false, message: "post not found" }, { status: 404 });
			}
			const postMetaMap = await loadPostMetaMap(db, [loaded.post.post_id]);

			return NextResponse.json({
				ok: true,
				post: {
					...loaded.post,
					cat_code: postMetaMap.get(loaded.post.post_id)?.cat_code ?? null,
					sub_cat_code: postMetaMap.get(loaded.post.post_id)?.sub_cat_code ?? null,
					site: postMetaMap.get(loaded.post.post_id)?.site ?? null,
				},
				pages: loaded.pages,
			});
		}

		const preparePosts = await loadPreparePosts(db, requestedPrepareStatus);
		if (!preparePosts.length) return NextResponse.json({ ok: true, count: 0, posts: [], pages: [] });
		const postMetaMap = await loadPostMetaMap(db, preparePosts.map((row) => row.post_id));
		const posts = preparePosts.map((row) => ({
			...row,
			cat_code: postMetaMap.get(row.post_id)?.cat_code ?? null,
			sub_cat_code: postMetaMap.get(row.post_id)?.sub_cat_code ?? null,
			site: postMetaMap.get(row.post_id)?.site ?? null,
		}));

		const pages = await loadPreparePostPages(db, requestedPrepareStatus);

		return NextResponse.json({
			ok: true,
			count: posts.length,
			posts,
			pages,
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: "failed to load posts", detail: `${error}` },
			{ status: 500 }
		);
	}
}

export async function POST(request: Request) {
	const contentType = request.headers.get("content-type") || "";
	if (!contentType.toLowerCase().includes("application/json")) {
		debugPosts("request rejected", { reason: "invalid content-type", content_type: contentType });
		return NextResponse.json({ ok: false, message: "Content-Type must be application/json" }, { status: 415 });
	}

	const body = (await request.json().catch((error) => {
		debugPosts("request.json parsing failed", { error: `${error}` });
		return null;
	})) as unknown;
	const bodyRecord = asRecord(body);
	if (!bodyRecord) {
		debugPosts("request rejected", { reason: "invalid json body", body_type: describeValueType(body) });
		return NextResponse.json({ ok: false, message: "invalid json body" }, { status: 400 });
	}
	debugPosts("request json parsed", { keys: Object.keys(bodyRecord) });

	const { env } = await getCloudflareContext({ async: true });
	const db = (env as CloudflareEnv & { DB?: D1Database }).DB;
	if (!db) return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });

	try {
		if (isGeminiBatchUpdateRequest(bodyRecord)) {
			debugPosts("gemini batch update branch selected", {
				prepare_status: asTrimmedOrNull(bodyRecord.prepare_status),
			});
			const hasPrepareData = Object.prototype.hasOwnProperty.call(bodyRecord, "prepare_data");
			const result = await applyGeminiBatchUpdate(db, bodyRecord as GeminiBatchUpdatePayload, hasPrepareData);
			if (!result.ok) {
				debugPosts("gemini batch update failed", {
					status: result.status,
					message: result.message,
					post_id: result.postId,
				});
				return NextResponse.json(
					{
						ok: false,
						message: result.message,
						post_id: result.postId,
						gemini_batch_update_action: GEMINI_BATCH_ACTION,
						gemini_info_spec: GEMINI_BATCH_UPDATE_GEMINI_INFO_SPEC,
					},
					{ status: result.status }
				);
			}
			debugPosts("gemini batch update completed", {
				post_id: result.postId,
				prepare_status: result.prepareStatus,
				batch_id: result.batchId,
				batch_job_id: result.batchJobId,
				batch_item_id: result.batchItemId,
				gemini_batch_id: result.geminiBatchId,
			});
			return NextResponse.json({
				ok: true,
				post_id: result.postId,
				prepare_status: result.prepareStatus,
				batch_id: result.batchId,
				batch_job_id: result.batchJobId,
				batch_item_id: result.batchItemId,
				gemini_batch_id: result.geminiBatchId,
			});
		}

		if (isGenerateHashtagsLocaleUpdateRequest(bodyRecord)) {
			debugPosts("generate hashtags locale branch selected", {
				post_id: parsePostId(bodyRecord.post_id),
				generate_hashtags_locale: toOptionalInteger(bodyRecord.generate_hashtags_locale),
			});
			const result = await applyGenerateHashtagsLocaleUpdate(db, bodyRecord as GenerateHashtagsLocaleUpdatePayload);
			if (!result.ok) {
				debugPosts("generate hashtags locale update failed", {
					status: result.status,
					message: result.message,
					post_id: result.postId,
				});
				return NextResponse.json(
					{ ok: false, message: result.message, post_id: result.postId },
					{ status: result.status }
				);
			}
			debugPosts("generate hashtags locale update completed", {
				post_id: result.postId,
				generate_hashtags_locale: result.generateHashtagsLocale,
				batch_id: result.batchId,
			});
			return NextResponse.json({
				ok: true,
				post_id: result.postId,
				generate_hashtags_locale: result.generateHashtagsLocale,
				batch_id: result.batchId,
				prepare_content_refined: result.prepareContentRefined,
			});
		}

		if ("prepare_plan" in bodyRecord) {
			debugPosts("prepare plan branch selected");

			const preparePlanPayload = bodyRecord as PreparePlanUpdatePayload;
			const nestedSavePayload = extractSavePayloadFromPreparePlan(preparePlanPayload.prepare_plan);
			if (nestedSavePayload) {
				debugPosts("prepare plan save-payload detected", {
					nested_keys: Object.keys(asRecord(parsePossiblyEscapedJson(preparePlanPayload.prepare_plan, 4)) ?? {}),
				});
				const preparePlanPostId = parsePostId(preparePlanPayload.post_id);
				if (!preparePlanPostId) {
					debugPosts("prepare plan save-payload rejected", { reason: "invalid post_id for prepare status update" });
					return NextResponse.json({ ok: false, message: "invalid post_id" }, { status: 400 });
				}
				const sourcePost = await loadPreparePlanSourcePost(db, preparePlanPostId);
				if (!sourcePost) {
					debugPosts("prepare plan save-payload rejected", { reason: "source post not found", post_id: preparePlanPostId });
					return NextResponse.json({ ok: false, message: "post not found" }, { status: 404 });
				}

				const payloadFromPreparePlan: SavePostPayload = {
					...nestedSavePayload,
					post_id: null,
					post_pk: null,
					prepare_post_id: preparePlanPostId,
					prepare_mode: "prepare_plan",
					title: sourcePost.title,
					caption: sourcePost.caption,
					custom_content: sourcePost.caption,
				};
				const result = await savePostFromPayload(db, payloadFromPreparePlan);
				if (!result.ok) {
					debugPosts("prepare plan save-payload failed", { status: result.status, message: result.message });
					return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
				}
				debugPosts("prepare plan save-payload completed", {
					post_id: result.postId,
					pages_saved: result.pagesSaved,
					created: result.created,
				});

				const statusUpdateResult = await markPreparePlanDoneForPostId(db, preparePlanPayload);
				if (!statusUpdateResult.ok) {
					debugPosts("prepare plan status update failed", {
						status: statusUpdateResult.status,
						message: statusUpdateResult.message,
						post_id: statusUpdateResult.postId ?? null,
					});
					return NextResponse.json(
						{ ok: false, message: statusUpdateResult.message, post_id: statusUpdateResult.postId ?? null },
						{ status: statusUpdateResult.status }
					);
				}
				debugPosts("prepare plan status update completed", { post_id: statusUpdateResult.postId });

				return NextResponse.json({
					ok: true,
					post_id: result.postId,
					post_slug: result.postSlug,
					pages_saved: result.pagesSaved,
					created: result.created,
					prepare_source_post_id: statusUpdateResult.postId,
					prepare_status: "fetch_plan_done",
					source: "prepare_plan",
				});
			}

			const result = await applyPreparePlanUpdate(db, bodyRecord as PreparePlanUpdatePayload);
			if (!result.ok) {
				debugPosts("prepare plan update failed", { status: result.status, message: result.message, post_id: result.postId ?? null });
				return NextResponse.json(
					{ ok: false, message: result.message, post_id: result.postId ?? null },
					{ status: result.status }
				);
			}
			debugPosts("prepare plan update completed", { post_id: result.postId });
			return NextResponse.json({
				ok: true,
				post_id: result.postId,
				prepare_status: "fetch_plan_done",
			});
		}

		// Create/update post payload branch: accepts pages + post content fields.
		if ("pages" in bodyRecord) {
			debugPosts("save payload branch selected", { pages_input_type: describeValueType((bodyRecord as SavePostPayload).pages) });
			const result = await savePostFromPayload(db, bodyRecord as SavePostPayload);
			if (!result.ok) {
				debugPosts("save payload failed", { status: result.status, message: result.message });
				return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
			}
			debugPosts("save payload completed", { post_id: result.postId, pages_saved: result.pagesSaved, created: result.created });
			return NextResponse.json({
				ok: true,
				post_id: result.postId,
				post_slug: result.postSlug,
				pages_saved: result.pagesSaved,
				created: result.created,
			});
		}

		debugPosts("prepare post branch selected");
		const result = await applyPreparePostUpdate(db, bodyRecord as PreparePostUpdatePayload);
		if (!result.ok) {
			debugPosts("prepare post update failed", { status: result.status, message: result.message, post_id: result.postId ?? null });
			return NextResponse.json(
				{ ok: false, message: result.message, post_id: result.postId ?? null },
				{ status: result.status }
			);
		}
		debugPosts("prepare post update completed", { post_id: result.postId, pages_inserted: result.pagesInserted });
		return NextResponse.json({
			ok: true,
			post_id: result.postId,
			pages_inserted: result.pagesInserted,
		});
	} catch (error) {
		debugPosts("request failed with exception", { error: `${error}` });
		return NextResponse.json(
			{ ok: false, message: "failed to update post", detail: `${error}` },
			{ status: 500 }
		);
	}
}
