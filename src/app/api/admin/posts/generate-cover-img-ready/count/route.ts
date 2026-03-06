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

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toOptionalInteger(value: string | null): number | null {
	if (value === null) return null;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return null;
	return Math.floor(parsed);
}

async function resolveEmail(req: Request, env: DbBindings, db: D1Database): Promise<string | null> {
	// Cookie session
	try {
		const session = await getServerSession(authOptions);
		const email = readString(session?.user?.email);
		if (email) return email.toLowerCase();
	} catch {
		// ignore and fallback to bearer token
	}

	// Bearer token (HS256 credentials token)
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

export async function GET(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const email = await resolveEmail(request, bindings, db);
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

		const requestUrl = new URL(request.url);
		const generateCoverImgRaw = readString(requestUrl.searchParams.get("generate_cover_img"));
		const generateCoverImg = toOptionalInteger(generateCoverImgRaw);
		if (generateCoverImgRaw !== null && generateCoverImg === null) {
			return NextResponse.json({ ok: false, message: "generate_cover_img must be an integer" }, { status: 400 });
		}
		const generateCoverImgFilter = generateCoverImg ?? 1;

		const totalRow = await db
			.prepare(
				`SELECT COUNT(1) AS total
           FROM posts p
          WHERE p.visibility = 'prepare'
            AND p.prepare_content IS NOT NULL
            AND trim(p.prepare_content) <> ''
            AND p.generate_cover_img = ?`,
			)
			.bind(generateCoverImgFilter)
			.first<{ total: number }>();

		return NextResponse.json({
			ok: true,
			count: totalRow?.total ?? 0,
			filters: {
				visibility: "prepare",
				require_prepare_content_non_empty: true,
				generate_cover_img: generateCoverImgFilter,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to load count",
			},
			{ status: 500 },
		);
	}
}
