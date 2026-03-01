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

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

type GoogleMobileRequest = {
	idToken?: unknown;
	id_token?: unknown;
	os?: unknown;
	device_id?: unknown;
	deviceId?: unknown;
};

function isVerifiedGoogleEmail(value: unknown): boolean {
	return value === true || value === "true";
}

export async function POST(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as MobileAuthBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const body = (await request.json().catch(() => null)) as GoogleMobileRequest | null;
		const idToken = readString(body?.idToken) ?? readString(body?.id_token);
		const clientOs = normalizeMobileClientOs(body?.os);
		const deviceId = readString(body?.device_id) ?? readString(body?.deviceId);
		if (!idToken) {
			return NextResponse.json({ ok: false, message: "Missing idToken" }, { status: 400 });
		}

		const defaultAudience = readString(process.env.GOOGLE_CLIENT_ID);
		const iosAudience = readString(process.env.GOOGLE_CLIENT_ID_IOS);
		const androidAudience = readString(process.env.GOOGLE_CLIENT_ID_ANDROID);
		const preferredAudience =
			clientOs === "android" ? androidAudience : clientOs === "ios" ? iosAudience : defaultAudience;
		const audiences = uniqueNonEmptyStrings([
			preferredAudience,
			defaultAudience,
			iosAudience,
			androidAudience,
		]);
		if (audiences.length === 0) {
			return NextResponse.json(
				{ ok: false, message: "Server missing Google audience configuration" },
				{ status: 500 },
			);
		}

		let payload: Record<string, unknown>;
		try {
			const verified = await jwtVerify(idToken, GOOGLE_JWKS, {
				audience: audiences,
				issuer: ["https://accounts.google.com", "accounts.google.com"],
			});
			payload = verified.payload as Record<string, unknown>;
		} catch {
			return NextResponse.json({ ok: false, message: "Invalid token" }, { status: 401 });
		}

		const subject = readString(payload.sub);
		const email = readString(payload.email);
		const name = readString(payload.name);
		const picture = readString(payload.picture);
		const locale = readString(payload.locale);
		if (!subject || !email) {
			return NextResponse.json(
				{ ok: false, message: "Token missing required claims" },
				{ status: 400 },
			);
		}

		const user = await upsertMobileOauthUser({
			db,
			email,
			provider: "google",
			providerUserId: subject,
			name,
			avatarUrl: picture,
			locale,
			status: isVerifiedGoogleEmail(payload.email_verified) ? "active" : "pending",
			lastLoginFrom: clientOs === "unknown" ? "google" : clientOs,
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
			{ ok: false, message: error instanceof Error ? error.message : "Failed to sign in with Google" },
			{ status: 500 },
		);
	}
}
