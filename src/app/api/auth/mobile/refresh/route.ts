import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import type { MobileAuthBindings } from "@/lib/mobile-auth";
import {
	MOBILE_ACCESS_TTL_SECONDS,
	MOBILE_REFRESH_TTL_SECONDS,
	createMobileRefreshToken,
	issueMobileTokens,
	readString,
	resolveJwtSecret,
	signMobileAccessToken,
} from "@/lib/mobile-auth";

type RefreshRequest = {
	refresh_token?: unknown;
	device_id?: unknown;
	deviceId?: unknown;
};

type SessionRow = {
	row_id: number;
	user_pk: number;
	email: string;
	device_id: string | null;
};

export async function POST(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as MobileAuthBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const body = (await request.json().catch(() => null)) as RefreshRequest | null;
		const refreshToken = readString(body?.refresh_token);
		const deviceId = readString(body?.device_id) ?? readString(body?.deviceId);
		if (!refreshToken) {
			return NextResponse.json({ ok: false, message: "Missing refresh_token" }, { status: 400 });
		}

		const jwtSecret = resolveJwtSecret(bindings);
		if (!jwtSecret) {
			return NextResponse.json({ ok: false, message: "Server missing JWT_SECRET" }, { status: 500 });
		}

		let session: SessionRow | null = null;

		if (deviceId) {
			session = await db
				.prepare(
					`SELECT us.rowid AS row_id, us.user_pk, u.email, us.device_id
           FROM user_sessions us
           JOIN users u ON u.user_pk = us.user_pk
           WHERE us.session_token = ?
             AND us.expires_at > datetime('now')
             AND us.device_id = ?
           LIMIT 1`
				)
				.bind(refreshToken, deviceId)
				.first<SessionRow>();

			if (!session) {
				const genericSession = await db
					.prepare(
						`SELECT us.rowid AS row_id, us.user_pk, u.email, us.device_id
             FROM user_sessions us
             JOIN users u ON u.user_pk = us.user_pk
             WHERE us.session_token = ?
               AND us.expires_at > datetime('now')
               AND us.device_id IS NULL
             LIMIT 1`
					)
					.bind(refreshToken)
					.first<SessionRow>();

				if (genericSession) {
					const tokenSet = await issueMobileTokens({
						db,
						jwtSecret,
						userPk: genericSession.user_pk,
						email: genericSession.email.toLowerCase(),
						deviceId,
					});
					return NextResponse.json({
						ok: true,
						...tokenSet,
					});
				}
			}
		}

		if (!session) {
			session = await db
				.prepare(
					`SELECT us.rowid AS row_id, us.user_pk, u.email, us.device_id
           FROM user_sessions us
           JOIN users u ON u.user_pk = us.user_pk
           WHERE us.session_token = ?
             AND us.expires_at > datetime('now')
           LIMIT 1`
				)
				.bind(refreshToken)
				.first<SessionRow>();
		}

		if (!session) {
			return NextResponse.json(
				{ ok: false, message: "Invalid or expired refresh token" },
				{ status: 401 },
			);
		}

		const rotatedRefreshToken = createMobileRefreshToken();
		const updateResult = await db
			.prepare(
				`UPDATE user_sessions
         SET session_token = ?,
             expires_at = datetime('now', '+' || ? || ' seconds'),
             device_id = COALESCE(?, device_id)
         WHERE rowid = ?`
			)
			.bind(
				rotatedRefreshToken,
				MOBILE_REFRESH_TTL_SECONDS,
				deviceId ?? null,
				session.row_id,
			)
			.run();
		if ((updateResult.meta?.changes ?? 0) < 1) {
			return NextResponse.json(
				{ ok: false, message: "Failed to rotate refresh token" },
				{ status: 409 },
			);
		}

		const accessToken = await signMobileAccessToken({
			jwtSecret,
			userPk: session.user_pk,
			email: session.email.toLowerCase(),
			jti: rotatedRefreshToken,
			expiresInSeconds: MOBILE_ACCESS_TTL_SECONDS,
		});

		return NextResponse.json({
			ok: true,
			access_token: accessToken,
			token_type: "Bearer",
			expires_in: MOBILE_ACCESS_TTL_SECONDS,
			refresh_token: rotatedRefreshToken,
			refresh_expires_in: MOBILE_REFRESH_TTL_SECONDS,
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "Refresh failed" },
			{ status: 500 },
		);
	}
}
