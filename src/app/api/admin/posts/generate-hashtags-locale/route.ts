import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";

const STATUS_REQUESTED = 1;
const STATUS_DONE = 2;
const STATUS_FAILED = 3;
const STATUS_WAITING = 4;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const READY_MODE = "ready";
const WAITING_MODE = "waiting";

type Mode = typeof READY_MODE | typeof WAITING_MODE;

type PostRow = {
	post_id: number;
	post_slug: string | null;
	locale: string | null;
	prepare_content: string | null;
	batch_id: string | null;
	generate_hashtags_locale: number;
	created_at: string | null;
	updated_at: string | null;
};

type TaxonomyRow = {
	category_code: string;
	subcat_code: string | null;
};

type TaxonomyLookupRow = {
	posts_category_id: number;
	posts_subcategory_id: number;
	category_code: string;
	subcat_code: string;
};

type PostUpdateRow = {
	post_id: number;
	caption: string | null;
	prepare_content: string | null;
	batch_id: string | null;
	visibility: string | null;
	site: string | null;
};

type SrcOrgPayload = {
	celebrity: string;
	celebrity_locale: string;
	category: string;
	category_locale: string;
	subcategory: string;
	subcategory_locale: string;
	subcat_code: string;
	brand: string;
	brand_locale: string;
	model: string;
	model_locale: string;
	hashtags: string[];
	hashtags_locale: string[];
	key_lines: string[];
};

type LegacyBody = {
	post_id?: unknown;
	generate_hashtags_locale?: unknown;
	batch_id?: unknown;
};

type ApplyResultBody = {
	action: "apply_result";
	post_id?: unknown;
	batch_id?: unknown;
	src_org?: unknown;
};

type WaitingBody = {
	action: "mark_waiting";
	post_id?: unknown;
	batch_id?: unknown;
};

type FailedBody = {
	action: "mark_failed";
	post_id?: unknown;
	batch_id?: unknown;
};

type DoneBody = {
	action: "mark_done";
	post_id?: unknown;
	batch_id?: unknown;
};

type UpdateBody = LegacyBody | ApplyResultBody | WaitingBody | FailedBody | DoneBody;

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}

	return value as Record<string, unknown>;
}

function toOptionalString(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function parseBodyPostId(value: unknown): number | null {
	const raw = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
	if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw <= 0) return null;
	return raw;
}

function parseBodyInteger(value: unknown): number | null {
	const raw = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
	if (!Number.isFinite(raw) || !Number.isInteger(raw)) return null;
	return raw;
}

function parsePositiveInt(value: string | null, fallback: number): number {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return fallback;
	return Math.max(1, Math.floor(numeric));
}

function parsePage(value: string | null): number {
	return parsePositiveInt(value, DEFAULT_PAGE);
}

function parsePageSize(value: string | null): number {
	return Math.min(parsePositiveInt(value, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
}

function parseMode(value: string | null): Mode {
	return value?.trim().toLowerCase() === WAITING_MODE ? WAITING_MODE : READY_MODE;
}

function parsePossiblyEscapedJson(value: unknown, maxDepth = 3): unknown {
	let current: unknown = value;

	for (let depth = 0; depth < maxDepth; depth += 1) {
		if (typeof current !== "string") {
			return current;
		}

		const trimmed = current.trim();
		if (!trimmed) {
			return trimmed;
		}

		try {
			const parsed = JSON.parse(trimmed) as unknown;
			if (parsed === current) {
				return parsed;
			}
			current = parsed;
		} catch {
			return trimmed;
		}
	}

	return current;
}

function normalizeCode(value: unknown): string {
	return (toOptionalString(value) ?? "").toLowerCase();
}

function normalizeHashtagToken(value: string): string {
	return value
		.normalize("NFKC")
		.replace(/^[^A-Za-z0-9\u00C0-\uFFFF_-]+/, "")
		.replace(/[^A-Za-z0-9\u00C0-\uFFFF_-]+$/, "")
		.toLowerCase();
}

function isHexColorLikeHashtag(tag: string): boolean {
	return /^(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(tag);
}

function uniqueStrings(values: string[]): string[] {
	const seen = new Set<string>();
	const output: string[] = [];
	for (const value of values) {
		if (!value || seen.has(value)) continue;
		seen.add(value);
		output.push(value);
	}
	return output;
}

function extractHashtagsFromContent(content: string | null): string[] {
	if (!content) {
		return [];
	}

	const matches = content.match(/#([^\s#]+)/gu) ?? [];
	return Array.from(
		new Set(
			matches
				.map((match) => match.slice(1))
				.map((match) => normalizeHashtagToken(match))
				.filter((tag) => tag.length > 0 && !isHexColorLikeHashtag(tag)),
		),
	);
}

function extractHashtagsFromList(value: unknown): string[] {
	if (Array.isArray(value)) {
		return Array.from(
			new Set(
				value
					.map((item) => (typeof item === "string" ? normalizeHashtagToken(item) : ""))
					.filter((tag) => tag.length > 0),
			),
		);
	}

	const singleValue = toOptionalString(value);
	if (!singleValue) {
		return [];
	}

	const normalized = normalizeHashtagToken(singleValue);
	return normalized.length > 0 ? [normalized] : [];
}

function normalizeEnglishHashtag(value: unknown): string {
	const text = toOptionalString(value)?.replace(/^#+/, "").replace(/\s+/g, "") ?? "";
	return text ? text.replace(/[^A-Za-z0-9_-]+/g, "").toLowerCase() : "";
}

function normalizeLocaleHashtag(value: unknown): string {
	const text = toOptionalString(value)?.replace(/^#+/, "") ?? "";
	return text.replace(/\s+/g, " ").trim();
}

function normalizeKeyLine(value: unknown): string {
	return (toOptionalString(value) ?? "").replace(/\s+/g, " ");
}

function normalizeStringList(
	value: unknown,
	normalizer: (item: unknown) => string,
	maxItems: number,
): string[] {
	if (!Array.isArray(value)) return [];
	return uniqueStrings(value.map((item) => normalizer(item)).filter(Boolean)).slice(0, maxItems);
}

function getPrepareContentRecord(value: unknown): Record<string, unknown> | null {
	return asRecord(parsePossiblyEscapedJson(value, 4));
}

function collectPrepareContentHashtagSources(value: unknown, depth = 0): string[] {
	if (depth > 5) {
		return [];
	}

	const record = getPrepareContentRecord(value);
	if (!record) {
		return [];
	}

	const sources: string[] = [];
	const pushText = (input: unknown) => {
		const text = toOptionalString(input);
		if (text) sources.push(text);
	};

	pushText(record.title);
	pushText(record.eyeblow);
	pushText(record.eyebrow);
	pushText(record.subtitle);
	pushText(record.footer_line);
	pushText(record.heading_hashtags);
	pushText(record.heading);
	pushText(record.desc);
	pushText(record.description);

	for (const key of ["heading_image_1", "heading_image_2"] as const) {
		const imageRecord = getPrepareContentRecord(record[key]);
		if (!imageRecord) continue;
		pushText(imageRecord.heading);
		pushText(imageRecord.desc);
		pushText(imageRecord.description);
		pushText(imageRecord.content);
	}

	const paragraphs = parsePossiblyEscapedJson(record.paragraphs, 3);
	if (Array.isArray(paragraphs)) {
		for (const paragraph of paragraphs) {
			const paragraphRecord = getPrepareContentRecord(paragraph);
			if (!paragraphRecord) continue;
			pushText(paragraphRecord.heading);
			pushText(paragraphRecord.content);
			pushText(paragraphRecord.desc);
			pushText(paragraphRecord.description);
		}
	}

	const nestedContentSources = collectPrepareContentHashtagSources(record.content, depth + 1);
	if (nestedContentSources.length > 0) {
		sources.push(...nestedContentSources);
	} else {
		pushText(record.content);
	}

	return sources;
}

function buildIgStyleCaptionFromPrepareContent(value: unknown): { caption: string | null; hashtagSources: string[] } {
	const root = getPrepareContentRecord(value);
	if (!root) {
		return { caption: null, hashtagSources: [] };
	}

	const nestedContent = getPrepareContentRecord(root.content);
	const pickText = (key: string): string | null => toOptionalString(root[key]) ?? toOptionalString(nestedContent?.[key]);

	const title = pickText("title");
	const subtitle = pickText("subtitle");
	const eyeblow = pickText("eyeblow") ?? pickText("eyebrow");
	const footerLine = pickText("footer_line");
	const headingHashtags = pickText("heading_hashtags");
	const headerLine = [title, subtitle, eyeblow, footerLine, headingHashtags].filter((part): part is string => Boolean(part)).join(" · ");

	const rawParagraphsPrimary = parsePossiblyEscapedJson(root.paragraphs, 3);
	const rawParagraphsNested = parsePossiblyEscapedJson(nestedContent?.paragraphs, 3);
	const rawParagraphs =
		Array.isArray(rawParagraphsPrimary) && rawParagraphsPrimary.length > 0
			? rawParagraphsPrimary
			: Array.isArray(rawParagraphsNested)
				? rawParagraphsNested
				: [];

	const paragraphBlocks: string[] = [];
	for (const paragraph of rawParagraphs) {
		const paragraphRecord = getPrepareContentRecord(paragraph);
		if (!paragraphRecord) continue;

		const paragraphType = (toOptionalString(paragraphRecord.type) ?? "").toLowerCase();
		if (paragraphType === "hashtags") {
			continue;
		}

		const paragraphHeading = toOptionalString(paragraphRecord.heading);
		const paragraphContent =
			toOptionalString(paragraphRecord.content) ??
			toOptionalString(paragraphRecord.desc) ??
			toOptionalString(paragraphRecord.description);

		if (paragraphHeading && paragraphContent) {
			paragraphBlocks.push(paragraphHeading === paragraphContent ? paragraphHeading : `${paragraphHeading}\n${paragraphContent}`);
			continue;
		}
		if (paragraphHeading) {
			paragraphBlocks.push(paragraphHeading);
			continue;
		}
		if (paragraphContent) {
			paragraphBlocks.push(paragraphContent);
		}
	}

	const hashtagSources = collectPrepareContentHashtagSources(root);
	const allHashtags = extractHashtagsFromContent(hashtagSources.join("\n"));
	const hashtagsLine = allHashtags.length > 0 ? allHashtags.map((tag) => `#${tag}`).join(" ") : null;

	const sections: string[] = [];
	if (headerLine) sections.push(headerLine);
	if (paragraphBlocks.length > 0) sections.push(paragraphBlocks.join("\n\n"));
	if (hashtagsLine) sections.push(hashtagsLine);

	const caption = sections.join("\n\n").trim();
	return {
		caption: caption.length > 0 ? caption : null,
		hashtagSources,
	};
}

function sanitizePrepareContent(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => sanitizePrepareContent(item));
	}

	if (value && typeof value === "object" && !Array.isArray(value)) {
		const output: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value)) {
			const normalizedKey = key.trim().toLowerCase();
			if (normalizedKey === "cover_editor_state") continue;
			if (normalizedKey.includes("color")) continue;
			if (normalizedKey.includes("url")) continue;
			output[key] = sanitizePrepareContent(child);
		}
		return output;
	}

	return value;
}

function hasSrcOrg(value: Record<string, unknown> | null): boolean {
	if (!value) return false;
	const srcOrg = getPrepareContentRecord(value.src_org);
	return Boolean(srcOrg && Object.keys(srcOrg).length > 0);
}

function normalizeSrcOrg(value: unknown): { srcOrg: SrcOrgPayload | null; message: string | null } {
	const record = asRecord(value);
	if (!record) {
		return { srcOrg: null, message: "src_org must be an object" };
	}

	const hashtags = normalizeStringList(record.hashtags, normalizeEnglishHashtag, 12);
	const hashtagsLocale = normalizeStringList(record.hashtags_locale, normalizeLocaleHashtag, 12);
	const keyLines = normalizeStringList(record.key_lines, normalizeKeyLine, 8);

	if (hashtags.length < 8 || hashtags.length > 12) {
		return { srcOrg: null, message: "src_org.hashtags must contain 8-12 items" };
	}
	if (hashtagsLocale.length < 8 || hashtagsLocale.length > 12) {
		return { srcOrg: null, message: "src_org.hashtags_locale must contain 8-12 items" };
	}
	if (!keyLines.length) {
		return { srcOrg: null, message: "src_org.key_lines must contain at least 1 item" };
	}

	const srcOrg: SrcOrgPayload = {
		celebrity: toOptionalString(record.celebrity) ?? "",
		celebrity_locale: toOptionalString(record.celebrity_locale) ?? "",
		category: normalizeCode(record.category),
		category_locale: toOptionalString(record.category_locale) ?? "",
		subcategory: toOptionalString(record.subcategory) ?? "",
		subcategory_locale: toOptionalString(record.subcategory_locale) ?? "",
		subcat_code: normalizeCode(record.subcat_code),
		brand: toOptionalString(record.brand) ?? "",
		brand_locale: toOptionalString(record.brand_locale) ?? "",
		model: toOptionalString(record.model) ?? "",
		model_locale: toOptionalString(record.model_locale) ?? "",
		hashtags,
		hashtags_locale: hashtagsLocale,
		key_lines: keyLines,
	};

	if (!srcOrg.category) {
		return { srcOrg: null, message: "src_org.category is required" };
	}
	if (!srcOrg.subcat_code) {
		return { srcOrg: null, message: "src_org.subcat_code is required" };
	}

	return { srcOrg, message: null };
}

async function insertPostHashtag(db: D1Database, postId: number, tag: string, kind: 0 | 1): Promise<void> {
	try {
		await db.prepare("INSERT OR IGNORE INTO post_hashtags (post_id, tag, kind) VALUES (?, ?, ?)").bind(postId, tag, kind).run();
		return;
	} catch (error) {
		const message = `${error}`.toLowerCase();
		if (!message.includes("no such column") && !message.includes("no column named")) {
			throw error;
		}
	}

	await db.prepare("INSERT OR IGNORE INTO post_hashtags (post_id, tag) VALUES (?, ?)").bind(postId, tag).run();
}

async function buildTaxonomyDictionary(db: D1Database) {
	const rows = await db
		.prepare(
			`SELECT
          c.code AS category_code,
          s.code AS subcat_code
       FROM posts_categories c
       LEFT JOIN posts_subcategories s
         ON s.posts_category_id = c.posts_category_id
        AND s.is_active = 1
      WHERE c.is_active = 1
      ORDER BY c.sort_order ASC, c.posts_category_id ASC, s.sort_order ASC, s.posts_subcategory_id ASC`,
		)
		.all<TaxonomyRow>();

	const byCategory: Record<string, string[]> = {};
	for (const row of rows.results ?? []) {
		const categoryCode = normalizeCode(row.category_code);
		if (!categoryCode) continue;
		if (!Array.isArray(byCategory[categoryCode])) {
			byCategory[categoryCode] = [];
		}
		const subcatCode = normalizeCode(row.subcat_code);
		if (subcatCode && !byCategory[categoryCode].includes(subcatCode)) {
			byCategory[categoryCode].push(subcatCode);
		}
	}

	const categories = Object.entries(byCategory).map(([code, subcategories]) => ({
		code,
		subcategories,
	}));

	return { categories, by_category: byCategory };
}

async function loadTaxonomyLookup(
	db: D1Database,
	categoryCode: string,
	subcatCode: string,
): Promise<TaxonomyLookupRow | null> {
	return await db
		.prepare(
			`SELECT
          c.posts_category_id,
          s.posts_subcategory_id,
          c.code AS category_code,
          s.code AS subcat_code
       FROM posts_categories c
       JOIN posts_subcategories s
         ON s.posts_category_id = c.posts_category_id
      WHERE c.is_active = 1
        AND s.is_active = 1
        AND lower(c.code) = ?
        AND lower(s.code) = ?
      LIMIT 1`,
		)
		.bind(categoryCode, subcatCode)
		.first<TaxonomyLookupRow>();
}

async function loadPostForUpdate(db: D1Database, postId: number): Promise<PostUpdateRow | null> {
	return await db
		.prepare(
			`SELECT post_id, caption, prepare_content, batch_id, visibility, site
       FROM posts
      WHERE post_id = ?
      LIMIT 1`,
		)
		.bind(postId)
		.first<PostUpdateRow>();
}

function ensureParagifyPublicPost(post: PostUpdateRow | null): string | null {
	if (!post?.post_id) return "post not found";
	if ((post.visibility ?? "") !== "public") return "post is not public";
	if ((post.site ?? "").trim()) return "post is not a paragify.com post";
	return null;
}

async function handleLegacyStatusUpdate(db: D1Database, body: LegacyBody) {
	const postId = parseBodyPostId(body.post_id);
	const generateHashtagsLocale = parseBodyInteger(body.generate_hashtags_locale);
	const batchId = toOptionalString(body.batch_id);

	if (!postId) {
		return NextResponse.json({ ok: false, message: "post_id is required" }, { status: 400 });
	}
	if (generateHashtagsLocale === null || generateHashtagsLocale < 0 || generateHashtagsLocale > 4) {
		return NextResponse.json({ ok: false, message: "generate_hashtags_locale is required and must be an integer between 0 and 4" }, { status: 400 });
	}

	const post = await loadPostForUpdate(db, postId);
	const publicPostError = ensureParagifyPublicPost(post);
	if (publicPostError) {
		return NextResponse.json({ ok: false, message: publicPostError, post_id: postId }, { status: publicPostError === "post not found" ? 404 : 409 });
	}

	const updateResult = await db
		.prepare(
			`UPDATE posts
          SET generate_hashtags_locale = ?,
              batch_id = COALESCE(?, batch_id),
              updated_at = datetime('now')
        WHERE post_id = ?`,
		)
		.bind(generateHashtagsLocale, batchId, postId)
		.run();

	if ((updateResult.meta?.changes ?? 0) < 1) {
		return NextResponse.json({ ok: false, message: "failed to update post", post_id: postId }, { status: 409 });
	}

	return NextResponse.json({
		ok: true,
		post_id: postId,
		generate_hashtags_locale: generateHashtagsLocale,
		batch_id: batchId ?? post?.batch_id ?? null,
	});
}

async function handleMarkWaiting(db: D1Database, body: WaitingBody) {
	const postId = parseBodyPostId(body.post_id);
	const batchId = toOptionalString(body.batch_id);
	if (!postId) {
		return NextResponse.json({ ok: false, message: "invalid post_id" }, { status: 400 });
	}
	if (!batchId) {
		return NextResponse.json({ ok: false, message: "batch_id is required" }, { status: 400 });
	}

	const post = await loadPostForUpdate(db, postId);
	const publicPostError = ensureParagifyPublicPost(post);
	if (publicPostError) {
		return NextResponse.json({ ok: false, message: publicPostError, post_id: postId }, { status: publicPostError === "post not found" ? 404 : 409 });
	}

	await db
		.prepare(
			`UPDATE posts
          SET generate_hashtags_locale = ?,
              batch_id = ?,
              updated_at = datetime('now')
        WHERE post_id = ?`,
		)
		.bind(STATUS_WAITING, batchId, postId)
		.run();

	return NextResponse.json({
		ok: true,
		post_id: postId,
		generate_hashtags_locale: STATUS_WAITING,
		batch_id: batchId,
	});
}

async function handleMarkDone(db: D1Database, body: DoneBody) {
	const postId = parseBodyPostId(body.post_id);
	const batchId = toOptionalString(body.batch_id);
	if (!postId) {
		return NextResponse.json({ ok: false, message: "invalid post_id" }, { status: 400 });
	}

	const post = await loadPostForUpdate(db, postId);
	const publicPostError = ensureParagifyPublicPost(post);
	if (publicPostError) {
		return NextResponse.json({ ok: false, message: publicPostError, post_id: postId }, { status: publicPostError === "post not found" ? 404 : 409 });
	}

	await db
		.prepare(
			`UPDATE posts
          SET generate_hashtags_locale = ?,
              batch_id = COALESCE(?, batch_id),
              updated_at = datetime('now')
        WHERE post_id = ?`,
		)
		.bind(STATUS_DONE, batchId, postId)
		.run();

	return NextResponse.json({
		ok: true,
		post_id: postId,
		generate_hashtags_locale: STATUS_DONE,
		batch_id: batchId ?? post?.batch_id ?? null,
	});
}

async function handleMarkFailed(db: D1Database, body: FailedBody) {
	const postId = parseBodyPostId(body.post_id);
	const batchId = toOptionalString(body.batch_id);
	if (!postId) {
		return NextResponse.json({ ok: false, message: "invalid post_id" }, { status: 400 });
	}

	const post = await loadPostForUpdate(db, postId);
	const publicPostError = ensureParagifyPublicPost(post);
	if (publicPostError) {
		return NextResponse.json({ ok: false, message: publicPostError, post_id: postId }, { status: publicPostError === "post not found" ? 404 : 409 });
	}

	await db
		.prepare(
			`UPDATE posts
          SET generate_hashtags_locale = ?,
              batch_id = COALESCE(?, batch_id),
              updated_at = datetime('now')
        WHERE post_id = ?`,
		)
		.bind(STATUS_FAILED, batchId, postId)
		.run();

	return NextResponse.json({
		ok: true,
		post_id: postId,
		generate_hashtags_locale: STATUS_FAILED,
		batch_id: batchId ?? post?.batch_id ?? null,
	});
}

async function handleApplyResult(db: D1Database, body: ApplyResultBody) {
	const postId = parseBodyPostId(body.post_id);
	if (!postId) {
		return NextResponse.json({ ok: false, message: "invalid post_id" }, { status: 400 });
	}

	const { srcOrg, message } = normalizeSrcOrg(body.src_org);
	if (!srcOrg) {
		return NextResponse.json({ ok: false, message: message ?? "invalid src_org" }, { status: 400 });
	}

	const post = await loadPostForUpdate(db, postId);
	const publicPostError = ensureParagifyPublicPost(post);
	if (publicPostError) {
		return NextResponse.json({ ok: false, message: publicPostError, post_id: postId }, { status: publicPostError === "post not found" ? 404 : 409 });
	}
	const currentPost = post as PostUpdateRow;

	const prepareContentRecord = getPrepareContentRecord(currentPost.prepare_content);
	if (!prepareContentRecord) {
		return NextResponse.json({ ok: false, message: "prepare_content is empty or invalid", post_id: postId }, { status: 409 });
	}

	const taxonomy = await loadTaxonomyLookup(db, srcOrg.category, srcOrg.subcat_code);
	if (!taxonomy?.posts_subcategory_id) {
		return NextResponse.json(
			{
				ok: false,
				message: "category/subcat_code combination not found",
				post_id: postId,
				category: srcOrg.category,
				subcat_code: srcOrg.subcat_code,
			},
			{ status: 400 },
		);
	}

	const nextPrepareContent: Record<string, unknown> = {
		...prepareContentRecord,
		src_org: {
			celebrity: srcOrg.celebrity,
			category: srcOrg.category,
			model_locale: srcOrg.model_locale,
			subcategory_locale: srcOrg.subcategory_locale,
			subcat_code: srcOrg.subcat_code,
			brand: srcOrg.brand,
			hashtags_locale: srcOrg.hashtags_locale,
			brand_locale: srcOrg.brand_locale,
			subcategory: srcOrg.subcategory,
			hashtags: srcOrg.hashtags,
			category_locale: srcOrg.category_locale,
			model: srcOrg.model,
			celebrity_locale: srcOrg.celebrity_locale,
		},
		key_lines: srcOrg.key_lines,
	};
	delete nextPrepareContent.cover_editor_state;

	const captionFromPrepareContent = buildIgStyleCaptionFromPrepareContent(nextPrepareContent);
	const caption = captionFromPrepareContent.caption ?? currentPost.caption;
	const prepareContentLocaleHashtags = extractHashtagsFromList(nextPrepareContent.hashtags_locale);
	const srcOrgRecord = getPrepareContentRecord(nextPrepareContent.src_org);
	const srcOrgLocaleHashtags = extractHashtagsFromList(srcOrgRecord?.hashtags_locale);
	const postKeywords = extractHashtagsFromList(srcOrgRecord?.hashtags);
	const prepareContentHashtagSources =
		captionFromPrepareContent.hashtagSources.length > 0
			? captionFromPrepareContent.hashtagSources
			: collectPrepareContentHashtagSources(nextPrepareContent);
	const postHashtags = Array.from(
		new Set(
			[...extractHashtagsFromContent(caption), ...extractHashtagsFromContent(prepareContentHashtagSources.join("\n"))],
		),
	);
	const basicHashtags = Array.from(new Set([...prepareContentLocaleHashtags, ...srcOrgLocaleHashtags]));
	const batchId = toOptionalString(body.batch_id) ?? currentPost.batch_id;

	await db.batch([
		db
			.prepare(
				`UPDATE posts
            SET prepare_content = ?,
                generate_hashtags_locale = ?,
                batch_id = COALESCE(?, batch_id),
                cat_code = ?,
                sub_cat_code = ?,
                updated_at = datetime('now')
          WHERE post_id = ?`,
			)
			.bind(
				JSON.stringify(nextPrepareContent),
				STATUS_DONE,
				batchId,
				taxonomy.category_code,
				taxonomy.subcat_code,
				postId,
			),
		db.prepare("DELETE FROM post_hashtags WHERE post_id = ?").bind(postId),
		db.prepare("DELETE FROM post_keywords WHERE post_id = ?").bind(postId),
		db.prepare("DELETE FROM posts_subcategory_assignments WHERE post_id = ?").bind(postId),
	]);

	for (const tag of postHashtags) {
		await insertPostHashtag(db, postId, tag, 1);
	}

	for (const tag of basicHashtags) {
		await insertPostHashtag(db, postId, tag, 0);
	}

	if (postKeywords.length > 0) {
		const keywordStatements = postKeywords.map((tag) =>
			db.prepare("INSERT OR IGNORE INTO post_keywords (post_id, tag) VALUES (?, ?)").bind(postId, tag),
		);
		await db.batch(keywordStatements);
	}

	await db
		.prepare(
			`INSERT OR IGNORE INTO posts_subcategory_assignments (
          post_id,
          posts_subcategory_id,
          is_primary,
          sort_order
        )
        VALUES (?, ?, 1, 0)`,
		)
		.bind(postId, taxonomy.posts_subcategory_id)
		.run()
		.catch(() => {});

	return NextResponse.json({
		ok: true,
		post_id: postId,
		generate_hashtags_locale: STATUS_DONE,
		batch_id: batchId ?? null,
		cat_code: taxonomy.category_code,
		sub_cat_code: taxonomy.subcat_code,
		tags: postHashtags,
		locale_tags: basicHashtags,
		keywords: postKeywords,
		posts_subcategory_id: taxonomy.posts_subcategory_id,
	});
}

export async function GET(request: NextRequest) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const db = (env as CloudflareEnv & { DB?: D1Database }).DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const requestUrl = new URL(request.url);
		const mode = parseMode(requestUrl.searchParams.get("status") ?? requestUrl.searchParams.get("mode"));
		const page = parsePage(requestUrl.searchParams.get("page"));
		const pageSize = parsePageSize(requestUrl.searchParams.get("page_size") ?? requestUrl.searchParams.get("pageSize"));
		const offset = (page - 1) * pageSize;

		const statusValue = mode === WAITING_MODE ? STATUS_WAITING : STATUS_REQUESTED;
		const whereClause =
			mode === WAITING_MODE
				? `visibility = 'public'
           AND COALESCE(trim(site), '') = ''
           AND generate_hashtags_locale = ?
           AND batch_id IS NOT NULL
           AND trim(batch_id) <> ''`
				: `visibility = 'public'
           AND COALESCE(trim(site), '') = ''
           AND generate_hashtags_locale = ?
           AND prepare_content IS NOT NULL
           AND trim(prepare_content) <> ''`;

		const [countResult, rowsResult] = await Promise.all([
			db.prepare(`SELECT COUNT(*) AS total FROM posts WHERE ${whereClause}`).bind(statusValue).first<{ total: number }>(),
			db
				.prepare(
					`SELECT
              post_id,
              post_slug,
              locale,
              prepare_content,
              batch_id,
              generate_hashtags_locale,
              created_at,
              updated_at
           FROM posts
          WHERE ${whereClause}
          ORDER BY COALESCE(updated_at, created_at) ASC, post_id ASC
          LIMIT ? OFFSET ?`,
				)
				.bind(statusValue, pageSize, offset)
				.all<PostRow>(),
		]);

		const rows = rowsResult.results ?? [];
		const total = Number(countResult?.total ?? 0);
		const hasMore = offset + rows.length < total;

		if (mode === WAITING_MODE) {
			return NextResponse.json({
				ok: true,
				status: mode,
				page,
				page_size: pageSize,
				total,
				count: rows.length,
				has_more: hasMore,
				posts: rows.map((row) => ({
					post_id: row.post_id,
					post_slug: row.post_slug,
					locale: row.locale ?? "en",
					batch_id: row.batch_id,
					generate_hashtags_locale: row.generate_hashtags_locale,
				})),
			});
		}

		const taxonomy = await buildTaxonomyDictionary(db);
		const posts = rows.map((row) => {
			const parsedPrepare = getPrepareContentRecord(row.prepare_content);
			const srcOrgExists = hasSrcOrg(parsedPrepare);
			return {
				post_id: row.post_id,
				post_slug: row.post_slug,
				locale: row.locale ?? "en",
				batch_id: row.batch_id,
				generate_hashtags_locale: row.generate_hashtags_locale,
				parse_ok: Boolean(parsedPrepare),
				parse_error: parsedPrepare ? null : "prepare_content must be a JSON object",
				has_src_org: srcOrgExists,
				processable: Boolean(parsedPrepare) && !srcOrgExists,
				sanitized_prepare_content: parsedPrepare ? sanitizePrepareContent(parsedPrepare) : null,
			};
		});

		return NextResponse.json({
			ok: true,
			status: mode,
			page,
			page_size: pageSize,
			total,
			count: posts.length,
			has_more: hasMore,
			taxonomy,
			posts,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to load posts",
			},
			{ status: 500 },
		);
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const db = (env as CloudflareEnv & { DB?: D1Database }).DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const body = (await request.json().catch(() => null)) as UpdateBody | null;
		const bodyRecord = asRecord(body);
		if (!bodyRecord) {
			return NextResponse.json({ ok: false, message: "invalid json body" }, { status: 400 });
		}

		const action = toOptionalString(bodyRecord.action);
		if (!action) {
			return await handleLegacyStatusUpdate(db, bodyRecord);
		}

		if (action === "mark_waiting") {
			return await handleMarkWaiting(db, bodyRecord as WaitingBody);
		}
		if (action === "mark_done") {
			return await handleMarkDone(db, bodyRecord as DoneBody);
		}
		if (action === "mark_failed") {
			return await handleMarkFailed(db, bodyRecord as FailedBody);
		}
		if (action === "apply_result") {
			return await handleApplyResult(db, bodyRecord as ApplyResultBody);
		}

		return NextResponse.json({ ok: false, message: "unsupported action" }, { status: 400 });
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to update generate_hashtags_locale",
			},
			{ status: 500 },
		);
	}
}

export function POST() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
