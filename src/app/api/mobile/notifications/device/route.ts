import { getCloudflareContext } from "@opennextjs/cloudflare";
import { decodeProtectedHeader, jwtVerify } from "jose";
import { NextResponse } from "next/server";

type DbBindings = CloudflareEnv & { DB?: D1Database; JWT_SECRET?: string };

type DeviceRequestBody = {
	token?: unknown;
	type?: unknown;
};

type AuthUserRow = {
	user_pk: number;
	email: string;
};

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getAlg(token: string): string | null {
	try {
		const { alg } = decodeProtectedHeader(token);
		return typeof alg === "string" ? alg : null;
	} catch {
		return null;
	}
}

async function resolveUserFromHsToken(token: string, db: D1Database, env: DbBindings): Promise<AuthUserRow | null> {
	const alg = getAlg(token);
	if (alg && alg !== "HS256") return null;

	const secret = readString(env.JWT_SECRET) ?? readString(process.env.JWT_SECRET);
	if (!secret) return null;

	try {
		const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
			algorithms: ["HS256"],
			clockTolerance: "120s",
		});
		const email = readString(payload.email)?.toLowerCase();
		const jti = readString(payload.jti);
		if (!email || !jti) return null;

		const user = await db
			.prepare(
				`SELECT us.user_pk, u.email
           FROM user_sessions us
           JOIN users u ON us.user_pk = u.user_pk
          WHERE us.session_token = ?
            AND us.expires_at > datetime('now')
            AND lower(u.email) = ?
          LIMIT 1`,
			)
			.bind(jti, email)
			.first<AuthUserRow>();

		return user ?? null;
	} catch {
		return null;
	}
}

export async function POST(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as DbBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const auth = request.headers.get("authorization") || "";
		if (!auth.toLowerCase().startsWith("bearer ")) {
			return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
		}
		const token = auth.slice(7).trim();
		if (!token) {
			return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
		}

		const body = (await request.json().catch(() => null)) as DeviceRequestBody | null;
		const rawToken = typeof body?.token === "string" ? body.token : null;
		const resetRequested = rawToken !== null && rawToken.trim().length === 0;
		const deviceToken = typeof rawToken === "string" ? rawToken.trim() : "";
		const notificationType = (readString(body?.type) ?? "APNS").toUpperCase();

		if (!resetRequested && (!deviceToken || !notificationType)) {
			return NextResponse.json({ ok: false, message: "Missing token or type" }, { status: 400 });
		}

		const user = await resolveUserFromHsToken(token, db, bindings);
		if (!user) {
			return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
		}

		if (resetRequested) {
			await db
				.prepare(
					"UPDATE users SET noti_type = NULL, noti_device_token = NULL, updated_at = datetime('now') WHERE user_pk = ?",
				)
				.bind(user.user_pk)
				.run();
		} else {
			await db
				.prepare(
					"UPDATE users SET noti_type = ?, noti_device_token = ?, updated_at = datetime('now') WHERE user_pk = ?",
				)
				.bind(notificationType, deviceToken, user.user_pk)
				.run();
		}

		return NextResponse.json({ ok: true });
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Failed to update mobile notification device",
			},
			{ status: 500 },
		);
	}
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
