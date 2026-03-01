import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type Visibility = "public" | "followers" | "private";

type PostPageInput = {
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

function toOptionalInteger(value: unknown): number | null {
	if (value === null || value === undefined || value === "") {
		return null;
	}

	const numericValue = typeof value === "number" ? value : Number(value);
	if (!Number.isInteger(numericValue)) {
		return null;
	}

	return numericValue;
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

function normalizeLayoutJson(value: unknown): string | null {
	if (value === null || value === undefined) {
		return null;
	}

	const normalized = parsePossiblyEscapedJson(value, 4);
	if (!normalized) {
		return null;
	}
	if (typeof normalized === "object") {
		return JSON.stringify(normalized);
	}
	if (typeof normalized === "string") {
		const trimmed = normalized.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	return null;
}

function normalizeJsonText(value: unknown): string | null {
	if (value === null || value === undefined) {
		return null;
	}

	const normalized = parsePossiblyEscapedJson(value, 4);
	if (normalized === null || normalized === undefined) {
		return null;
	}
	if (typeof normalized === "string") {
		const trimmed = normalized.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	return JSON.stringify(normalized);
}

function isVisibility(value: string): value is Visibility {
	return value === "public" || value === "followers" || value === "private";
}

const POST_SLUG_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const POST_SLUG_LENGTH = 10;
const POST_SLUG_INSERT_ATTEMPTS = 8;

function generatePostSlug(length: number): string {
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	let output = "";

	for (const byte of bytes) {
		output += POST_SLUG_ALPHABET[byte % POST_SLUG_ALPHABET.length];
	}

	return output;
}

function isPostSlugUniqueConstraintError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}

	const message = error.message.toLowerCase();
	return message.includes("unique constraint failed") && message.includes("posts.post_slug");
}

function isNoSuchColumnError(error: unknown): boolean {
	return `${error}`.toLowerCase().includes("no such column");
}

function parseLocaleFromAcceptLanguage(headerValue: string | null): string | null {
	if (!headerValue) {
		return null;
	}

	const firstItem = headerValue.split(",")[0]?.split(";")[0]?.trim();
	return firstItem && firstItem.length > 0 ? firstItem : null;
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

function collectPrepareContentHashtagSources(value: unknown, depth = 0): string[] {
	if (depth > 5) {
		return [];
	}

	const parsed = parsePossiblyEscapedJson(value, 4);
	const record = asRecord(parsed);
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

	const headingImageKeys = ["heading_image_1", "heading_image_2"] as const;
	for (const key of headingImageKeys) {
		const imageRecord = asRecord(parsePossiblyEscapedJson(record[key], 3));
		if (!imageRecord) continue;
		pushText(imageRecord.heading);
		pushText(imageRecord.desc);
		pushText(imageRecord.description);
		pushText(imageRecord.content);
	}

	const paragraphs = parsePossiblyEscapedJson(record.paragraphs, 3);
	if (Array.isArray(paragraphs)) {
		for (const paragraph of paragraphs) {
			const paragraphRecord = asRecord(parsePossiblyEscapedJson(paragraph, 3));
			if (!paragraphRecord) continue;
			pushText(paragraphRecord.heading);
			pushText(paragraphRecord.content);
			pushText(paragraphRecord.desc);
			pushText(paragraphRecord.description);
		}
	}

	// Some payloads embed a full JSON copy in top-level `content`.
	const nestedContentSources = collectPrepareContentHashtagSources(record.content, depth + 1);
	if (nestedContentSources.length > 0) {
		sources.push(...nestedContentSources);
	} else {
		pushText(record.content);
	}

	return sources;
}

function getPrepareContentRecord(value: unknown): Record<string, unknown> | null {
	const parsed = parsePossiblyEscapedJson(value, 4);
	return asRecord(parsed);
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
		const paragraphRecord = asRecord(parsePossiblyEscapedJson(paragraph, 3));
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

function parsePages(value: unknown): { pages: PostPageInput[]; error: string | null } {
	if (!Array.isArray(value) || value.length === 0) {
		return { pages: [], error: "At least one post page is required." };
	}

	const pages: PostPageInput[] = [];

	for (let index = 0; index < value.length; index += 1) {
		const row = asRecord(value[index]);
		if (!row) {
			return { pages: [], error: `post_pages[${index}] must be an object.` };
		}

		const mediaUrl = toOptionalString(row.media_url);
		if (!mediaUrl) {
			return { pages: [], error: `post_pages[${index}].media_url is required.` };
		}

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

		pages.push({
			media_url: mediaUrl,
			media_type: toOptionalString(row.media_type) ?? "image",
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
			raw_media_url: toOptionalString(row.raw_media_url),
			bg_media_url: toOptionalString(row.bg_media_url),
		});
	}

	return { pages, error: null };
}

export async function POST(request: Request) {
	let payload: unknown;

	try {
		payload = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
	}

	const body = asRecord(payload);
	if (!body) {
		return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
	}

	const userPk = toOptionalInteger(body.user_pk);
	if (userPk === null || userPk < 1) {
		return NextResponse.json({ error: "`user_pk` must be a positive integer." }, { status: 400 });
	}
	const hasPreparePostId = Object.prototype.hasOwnProperty.call(body, "prepare_post_id");
	const preparePostId = toOptionalInteger(body.prepare_post_id);
	if (hasPreparePostId && (preparePostId === null || preparePostId < 1)) {
		return NextResponse.json({ error: "`prepare_post_id` must be a positive integer when provided." }, { status: 400 });
	}

	const parsedPages = parsePages(body.pages);
	if (parsedPages.error) {
		return NextResponse.json({ error: parsedPages.error }, { status: 400 });
	}

	const visibilityInput = toOptionalString(body.visibility);
	if (visibilityInput && !isVisibility(visibilityInput)) {
		return NextResponse.json(
			{ error: "`visibility` must be `public`, `followers`, or `private`." },
			{ status: 400 },
		);
	}

	try {
		const { env } = await getCloudflareContext({ async: true });
		const db = (env as CloudflareEnv & { DB?: D1Database }).DB;

		if (!db) {
			return NextResponse.json({ error: "D1 binding `DB` is not configured." }, { status: 500 });
		}

		const locale = toOptionalString(body.locale) ?? parseLocaleFromAcceptLanguage(request.headers.get("accept-language"));
		const fallbackCaption = toOptionalString(body.caption);
		const showPageContentInput = toOptionalInteger(body.show_page_content);
		const showPageContent = showPageContentInput === 0 ? 0 : 1;
		const customContent = toOptionalString(body.custom_content);
		const prepareContent = normalizeJsonText(body.prepare_content);
		const captionFromPrepareContent = buildIgStyleCaptionFromPrepareContent(body.prepare_content);
		const caption = captionFromPrepareContent.caption ?? fallbackCaption;
		const title = toOptionalString(body.title);
		const templateId = toOptionalString(body.template_id);
		const prepareContentHashtagSources =
			captionFromPrepareContent.hashtagSources.length > 0
				? captionFromPrepareContent.hashtagSources
				: collectPrepareContentHashtagSources(body.prepare_content);
		const postHashtags = Array.from(
			new Set(
				[...extractHashtagsFromContent(caption), ...extractHashtagsFromContent(prepareContentHashtagSources.join("\n"))],
			),
		);

		let postId: number | null = null;
		let postSlug: string | null = null;

		for (let attempt = 0; attempt < POST_SLUG_INSERT_ATTEMPTS; attempt += 1) {
			const candidateSlug = generatePostSlug(POST_SLUG_LENGTH);

			try {
				let insertPostResult: D1Result<Record<string, unknown>>;
				try {
					if (hasPreparePostId) {
						insertPostResult = await db
							.prepare(
								`
								INSERT INTO posts (
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
								VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1, ?)
								`,
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
								visibilityInput ?? "public",
							)
							.run();
					} else {
						insertPostResult = await db
							.prepare(
								`
								INSERT INTO posts (
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
									cover_page,
									visibility
								)
								VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1, ?)
								`,
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
								visibilityInput ?? "public",
							)
							.run();
					}
				} catch (insertError) {
					// Backward compatibility for DBs without prepare_post_id column.
					if (!hasPreparePostId || !isNoSuchColumnError(insertError)) {
						throw insertError;
					}
					insertPostResult = await db
						.prepare(
							`
							INSERT INTO posts (
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
								cover_page,
								visibility
							)
							VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1, ?)
							`,
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
							visibilityInput ?? "public",
						)
						.run();
				}

				const insertedPostId = Number(insertPostResult.meta.last_row_id);
				if (!Number.isInteger(insertedPostId) || insertedPostId < 1) {
					return NextResponse.json({ error: "Could not resolve inserted post ID." }, { status: 500 });
				}

				postId = insertedPostId;
				postSlug = candidateSlug;
				break;
			} catch (error) {
				if (isPostSlugUniqueConstraintError(error) && attempt < POST_SLUG_INSERT_ATTEMPTS - 1) {
					continue;
				}

				throw error;
			}
		}

		if (postId === null || postSlug === null) {
			return NextResponse.json({ error: "Failed to generate a unique post_slug." }, { status: 500 });
		}

		try {
			const pageStatements = parsedPages.pages.map((page, index) =>
				db
					.prepare(
						`
						INSERT INTO post_pages (
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
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
						`,
					)
					.bind(
						postId,
						index + 1,
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
						page.bg_media_url,
					),
			);

			await db.batch(pageStatements);

			if (postHashtags.length > 0) {
				const hashtagStatements = postHashtags.map((tag) =>
					db
						.prepare(
							`
							INSERT OR IGNORE INTO post_hashtags (post_id, tag)
							VALUES (?, ?)
							`,
						)
						.bind(postId, tag),
				);

				await db.batch(hashtagStatements);
			}
		} catch (insertPostRelatedDataError) {
			await db.batch([
				db.prepare("DELETE FROM post_pages WHERE post_id = ?").bind(postId as number),
				db.prepare("DELETE FROM post_hashtags WHERE post_id = ?").bind(postId as number),
				db.prepare("DELETE FROM posts WHERE post_id = ?").bind(postId as number),
			]);

			throw insertPostRelatedDataError;
		}

		return NextResponse.json({
			ok: true,
			post_id: postId,
			post_slug: postSlug,
			prepare_post_id: hasPreparePostId ? preparePostId : null,
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Failed to create post.",
			},
			{ status: 500 },
		);
	}
}
