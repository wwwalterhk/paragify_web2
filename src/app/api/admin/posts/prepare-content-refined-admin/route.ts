import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

type DbBindings = CloudflareEnv & { DB?: D1Database; JWT_SECRET?: string };

type AdminUserRow = {
	user_pk: number;
	role: string | null;
};

type PostLookupRow = {
	post_id: number;
	prepare_src: string | null;
	prepare_content: string | null;
};

type UpdatePrepareContentRefinedBody = {
	post_id?: unknown;
	prepare_content_refined?: unknown;
	refine_prepare_content?: unknown;
};

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
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

function parseBodyPrepareContentRefined(value: unknown): string | null {
	if (typeof value !== "string") return null;
	return value;
}

function parsePossiblyEscapedJson(value: unknown, maxDepth = 4): unknown {
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

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

function extractPrepareSrcOrg(value: unknown): Record<string, unknown> | null {
	const parsed = parsePossiblyEscapedJson(value, 4);
	const record = asRecord(parsed);
	if (!record) return null;

	const readSourceString = (input: unknown): string | null => {
		if (typeof input !== "string") return null;
		return input.trim();
	};

	const hashtagsValue = parsePossiblyEscapedJson(record.hashtags, 2);
	const hashtags = Array.isArray(hashtagsValue)
		? hashtagsValue
				.filter((item): item is string => typeof item === "string")
				.map((item) => item.trim())
		: null;

	return {
		category: readSourceString(record.category),
		subcategory: readSourceString(record.subcategory),
		subcat_code: readSourceString(record.subcat_code),
		brand: readSourceString(record.brand),
		model: readSourceString(record.model),
		celebrity: readSourceString(record.celebrity),
		hashtags,
	};
}

function extractPrepareContentHashtagsLocale(value: unknown): string[] | null {
	const parsed = parsePossiblyEscapedJson(value, 4);
	const record = asRecord(parsed);
	if (!record) return null;

	const hashtagsLocaleValue = parsePossiblyEscapedJson(record.hashtags_locale, 2);
	if (!Array.isArray(hashtagsLocaleValue)) return null;

	return hashtagsLocaleValue
		.filter((item): item is string => typeof item === "string")
		.map((item) => item.trim());
}

function mergePrepareContentRefinedWithSourceData(
	prepareContentRefined: string,
	prepareSrc: unknown,
	prepareContent: unknown,
): string {
	const parsedPrepareContentRefined = parsePossiblyEscapedJson(prepareContentRefined, 4);
	const prepareContentRefinedRecord = asRecord(parsedPrepareContentRefined);
	const srcOrg = extractPrepareSrcOrg(prepareSrc);
	const hashtagsLocale = extractPrepareContentHashtagsLocale(prepareContent);
	if (!prepareContentRefinedRecord) {
		return prepareContentRefined;
	}

	const existingSrcOrg = asRecord(parsePossiblyEscapedJson(prepareContentRefinedRecord.src_org, 2)) ?? {};
	const nextRecord: Record<string, unknown> = { ...prepareContentRefinedRecord };

	if (srcOrg) {
		nextRecord.src_org = {
			...existingSrcOrg,
			...srcOrg,
		};
	}

	if (hashtagsLocale) {
		nextRecord.hashtags_locale = hashtagsLocale;
	}

	return JSON.stringify(nextRecord);
}

async function resolveEmail(req: Request, env: DbBindings, db: D1Database): Promise<string | null> {
	try {
		const session = await getServerSession(authOptions);
		const email = readString(session?.user?.email);
		if (email) return email.toLowerCase();
	} catch {
		// Ignore and fallback to bearer token verification.
	}

	const authorization = req.headers.get("authorization") || "";
	if (!authorization.toLowerCase().startsWith("bearer ")) {
		return null;
	}

	const token = authorization.slice(7).trim();
	if (!token) return null;

	const jwtSecret = readString(env.JWT_SECRET) ?? readString(process.env.JWT_SECRET);
	if (!jwtSecret) return null;

	try {
		const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret), {
			algorithms: ["HS256"],
			clockTolerance: "120s",
		});
		const email = readString(payload.email)?.toLowerCase();
		const jti = readString(payload.jti);
		if (!email || !jti) return null;

		const sessionRow = await db
			.prepare(
				`SELECT 1
           FROM user_sessions us
           JOIN users u ON us.user_pk = u.user_pk
          WHERE us.session_token = ?
            AND us.expires_at > datetime('now')
            AND lower(u.email) = ?
          LIMIT 1`,
			)
			.bind(jti, email)
			.first<{ 1: number }>();

		return sessionRow ? email : null;
	} catch {
		return null;
	}
}

async function assertAdmin(req: Request, bindings: DbBindings, db: D1Database): Promise<NextResponse | null> {
	const email = await resolveEmail(req, bindings, db);
	if (!email) {
		return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
	}

	const adminUser = await db
		.prepare("SELECT user_pk, role FROM users WHERE lower(email) = ? LIMIT 1")
		.bind(email)
		.first<AdminUserRow>();
	if (!adminUser?.user_pk) {
		return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
	}
	if ((adminUser.role ?? "").toLowerCase() !== "admin") {
		return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
	}
	return null;
}

export async function PATCH(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const authError = await assertAdmin(request, bindings, db);
		if (authError) return authError;

		const body = (await request.json().catch(() => null)) as UpdatePrepareContentRefinedBody | null;
		const postId = parseBodyPostId(body?.post_id);
		const prepareContentRefined = parseBodyPrepareContentRefined(body?.prepare_content_refined);
		const hasRefinePrepareContent = body !== null && typeof body === "object" && Object.prototype.hasOwnProperty.call(body, "refine_prepare_content");
		const refinePrepareContent = hasRefinePrepareContent ? parseBodyInteger(body?.refine_prepare_content) : null;

		if (!postId) {
			return NextResponse.json({ ok: false, message: "post_id is required" }, { status: 400 });
		}
		if (prepareContentRefined === null) {
			return NextResponse.json({ ok: false, message: "prepare_content_refined is required and must be a string" }, { status: 400 });
		}
		if (hasRefinePrepareContent && refinePrepareContent === null) {
			return NextResponse.json({ ok: false, message: "refine_prepare_content must be an integer when provided" }, { status: 400 });
		}

		const post = await db
			.prepare("SELECT post_id, prepare_src, prepare_content FROM posts WHERE post_id = ? LIMIT 1")
			.bind(postId)
			.first<PostLookupRow>();
		if (!post?.post_id) {
			return NextResponse.json({ ok: false, message: "post not found", post_id: postId }, { status: 404 });
		}

		const prepareContentRefinedWithSourceData = mergePrepareContentRefinedWithSourceData(
			prepareContentRefined,
			post.prepare_src,
			post.prepare_content,
		);

		const updateQuery = hasRefinePrepareContent
			? `UPDATE posts
				    SET prepare_content_refined = ?,
				        refine_prepare_content = ?,
				        updated_at = datetime('now')
				  WHERE post_id = ?`
			: `UPDATE posts
				    SET prepare_content_refined = ?,
				        updated_at = datetime('now')
				  WHERE post_id = ?`;
		const updateResult = hasRefinePrepareContent
			? await db.prepare(updateQuery).bind(prepareContentRefinedWithSourceData, refinePrepareContent, postId).run()
			: await db.prepare(updateQuery).bind(prepareContentRefinedWithSourceData, postId).run();

		if ((updateResult.meta?.changes ?? 0) < 1) {
			return NextResponse.json({ ok: false, message: "failed to update post", post_id: postId }, { status: 409 });
		}

		return NextResponse.json({
			ok: true,
			post_id: postId,
			prepare_content_refined: prepareContentRefinedWithSourceData,
			...(hasRefinePrepareContent ? { refine_prepare_content: refinePrepareContent } : {}),
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to update post",
			},
			{ status: 500 },
		);
	}
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
