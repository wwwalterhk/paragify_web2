import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { MobileAuthBindings } from "@/lib/mobile-auth";
import {
	issueMobileTokens,
	normalizeMobileClientOs,
	readString,
	resolveJwtSecret,
	uniqueNonEmptyStrings,
	upsertMobileOauthUser,
} from "@/lib/mobile-auth";

const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

type AppleMobileRequest = {
	idToken?: unknown;
	id_token?: unknown;
	name?: unknown;
	os?: unknown;
	device_id?: unknown;
	deviceId?: unknown;
};

function isVerifiedAppleEmail(payload: Record<string, unknown>): boolean {
	return (
		payload.email_verified === true ||
		payload.email_verified === "true" ||
		payload.is_private_email === true ||
		payload.is_private_email === "true"
	);
}

export async function POST(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as MobileAuthBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const body = (await request.json().catch(() => null)) as AppleMobileRequest | null;
		const idToken = readString(body?.idToken) ?? readString(body?.id_token);
		const deviceId = readString(body?.device_id) ?? readString(body?.deviceId);
		const clientOs = normalizeMobileClientOs(body?.os);
		if (!idToken) {
			return NextResponse.json({ ok: false, message: "Missing idToken" }, { status: 400 });
		}

		const defaultAudience = readString(process.env.APPLE_CLIENT_ID);
		const iosAudience = readString(process.env.APPLE_CLIENT_ID_IOS);
		const androidAudience = readString(process.env.APPLE_CLIENT_ID_ANDROID);
		const audiences = uniqueNonEmptyStrings([defaultAudience, iosAudience, androidAudience]);
		if (audiences.length === 0) {
			return NextResponse.json(
				{ ok: false, message: "Server missing Apple audience configuration" },
				{ status: 500 },
			);
		}

		let payload: Record<string, unknown>;
		try {
			const verified = await jwtVerify(idToken, APPLE_JWKS, {
				audience: audiences,
				issuer: "https://appleid.apple.com",
			});
			payload = verified.payload as Record<string, unknown>;
		} catch {
			return NextResponse.json({ ok: false, message: "Invalid token" }, { status: 401 });
		}

		const subject = readString(payload.sub);
		const email = readString(payload.email);
		const name = readString(payload.name) ?? readString(body?.name);
		const locale = readString(payload.locale);
		if (!subject || !email) {
			return NextResponse.json(
				{ ok: false, message: "Token missing required claims" },
				{ status: 400 },
			);
		}

		const lastLoginFrom =
			clientOs === "android" ? "android-apple" : clientOs === "ios" ? "ios-apple" : "apple";

		const user = await upsertMobileOauthUser({
			db,
			email,
			provider: "apple",
			providerUserId: subject,
			name,
			avatarUrl: null,
			locale,
			status: isVerifiedAppleEmail(payload) ? "active" : "pending",
			lastLoginFrom,
		});

		const jwtSecret = resolveJwtSecret(bindings);
		if (!jwtSecret) {
			return NextResponse.json({ ok: false, message: "Server missing JWT_SECRET" }, { status: 500 });
		}

		const tokenSet = await issueMobileTokens({
			db,
			jwtSecret,
			userPk: user.userPk,
			email: user.email,
			deviceId,
		});

		return NextResponse.json({
			ok: true,
			email: user.email,
			user_pk: user.userPk,
			...tokenSet,
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "Failed to sign in with Apple" },
			{ status: 500 },
		);
	}
}
