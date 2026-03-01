import { SignJWT, importPKCS8 } from "jose";
import { NextResponse } from "next/server";
import { readString } from "@/lib/mobile-auth";

const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";

type AppleCodeExchangeRequest = {
	code?: unknown;
	redirect_uri?: unknown;
	client?: unknown;
	client_id?: unknown;
};

function pickAppleClientId(body: AppleCodeExchangeRequest): string | null {
	const directClientId = readString(body.client_id);
	if (directClientId) {
		return directClientId;
	}

	const client = readString(body.client)?.toLowerCase();
	if (client === "android") {
		return (
			readString(process.env.APPLE_CLIENT_ID_ANDROID) ??
			readString(process.env.APPLE_CLIENT_ID) ??
			readString(process.env.APPLE_CLIENT_ID_IOS)
		);
	}
	if (client === "ios") {
		return readString(process.env.APPLE_CLIENT_ID_IOS) ?? readString(process.env.APPLE_CLIENT_ID);
	}

	return (
		readString(process.env.APPLE_CLIENT_ID) ??
		readString(process.env.APPLE_CLIENT_ID_IOS) ??
		readString(process.env.APPLE_CLIENT_ID_ANDROID)
	);
}

async function buildAppleClientSecret(clientId: string): Promise<string> {
	const teamId = readString(process.env.APPLE_TEAM_ID);
	const keyId = readString(process.env.APPLE_KEY_ID);
	const privateKeyRaw = readString(process.env.APPLE_PRIVATE_KEY);
	if (!teamId || !keyId || !privateKeyRaw) {
		throw new Error("Missing Apple credentials");
	}

	const privateKey = privateKeyRaw.includes("\\n")
		? privateKeyRaw.replace(/\\n/g, "\n")
		: privateKeyRaw;
	const now = Math.floor(Date.now() / 1000);
	const expiresAt = now + 5 * 60;
	const signingKey = await importPKCS8(privateKey, "ES256");

	return new SignJWT({})
		.setProtectedHeader({ alg: "ES256", kid: keyId })
		.setIssuer(teamId)
		.setAudience("https://appleid.apple.com")
		.setSubject(clientId)
		.setIssuedAt(now)
		.setExpirationTime(expiresAt)
		.sign(signingKey);
}

export async function POST(request: Request) {
	try {
		const body = (await request.json().catch(() => null)) as AppleCodeExchangeRequest | null;
		const code = readString(body?.code);
		const redirectUri = readString(body?.redirect_uri);
		const clientId = pickAppleClientId(body ?? {});
		if (!code) {
			return NextResponse.json({ ok: false, message: "Missing code" }, { status: 400 });
		}
		if (!clientId) {
			return NextResponse.json({ ok: false, message: "Missing Apple client_id" }, { status: 500 });
		}

		let clientSecret: string;
		try {
			clientSecret = await buildAppleClientSecret(clientId);
		} catch {
			return NextResponse.json({ ok: false, message: "Apple credentials unavailable" }, { status: 500 });
		}

		const params = new URLSearchParams({
			grant_type: "authorization_code",
			code,
			client_id: clientId,
			client_secret: clientSecret,
		});
		if (redirectUri) {
			params.set("redirect_uri", redirectUri);
		}

		let exchangeResponse: Response;
		try {
			exchangeResponse = await fetch(APPLE_TOKEN_URL, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: params,
			});
		} catch {
			return NextResponse.json(
				{ ok: false, message: "Apple token endpoint unreachable" },
				{ status: 502 },
			);
		}

		const result = (await exchangeResponse.json().catch(() => null)) as Record<string, unknown> | null;
		if (!exchangeResponse.ok || !result || typeof result.id_token !== "string") {
			const message = readString(result?.error) ?? "Token exchange failed";
			return NextResponse.json({ ok: false, message }, { status: 400 });
		}

		return NextResponse.json({
			ok: true,
			id_token: result.id_token,
			access_token: readString(result.access_token) ?? undefined,
			refresh_token: readString(result.refresh_token) ?? undefined,
			expires_in: typeof result.expires_in === "number" ? result.expires_in : undefined,
			token_type: readString(result.token_type) ?? undefined,
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "Token exchange failed" },
			{ status: 500 },
		);
	}
}
