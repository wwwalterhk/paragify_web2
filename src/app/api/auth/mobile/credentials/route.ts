import { getCloudflareContext } from "@opennextjs/cloudflare";
import { scryptSync, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { MobileAuthBindings } from "@/lib/mobile-auth";
import { issueMobileTokens, readString, resolveJwtSecret } from "@/lib/mobile-auth";

type CredentialsRequest = {
	email?: unknown;
	password?: unknown;
	device_id?: unknown;
	deviceId?: unknown;
};

type UserRow = {
	user_pk: number;
	email: string;
	status: string | null;
};

type PasswordRow = {
	password_hash: string;
	salt: string;
};

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
	try {
		const derived = scryptSync(password, salt, 64);
		const expectedBuf = Buffer.from(expectedHash, "hex");
		if (derived.length !== expectedBuf.length) return false;
		return timingSafeEqual(derived, expectedBuf);
	} catch {
		return false;
	}
}

export async function POST(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as MobileAuthBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const body = (await request.json().catch(() => null)) as CredentialsRequest | null;
		const email = readString(body?.email)?.toLowerCase() ?? "";
		const password = typeof body?.password === "string" ? body.password : "";
		const deviceId = readString(body?.device_id) ?? readString(body?.deviceId);

		if (!email || !password) {
			return NextResponse.json(
				{ ok: false, message: "Missing email or password" },
				{ status: 400 },
			);
		}

		const user = await db
			.prepare("SELECT user_pk, email, status FROM users WHERE lower(email) = ? LIMIT 1")
			.bind(email)
			.first<UserRow>();
		if (!user?.user_pk) {
			return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
		}
		if (user.status !== "active") {
			return NextResponse.json({ ok: false, message: "Activation required" }, { status: 403 });
		}

		const pwdRow = await db
			.prepare("SELECT password_hash, salt FROM user_passwords WHERE user_pk = ? LIMIT 1")
			.bind(user.user_pk)
			.first<PasswordRow>();
		if (!pwdRow || !verifyPassword(password, pwdRow.salt, pwdRow.password_hash)) {
			return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
		}

		const jwtSecret = resolveJwtSecret(bindings);
		if (!jwtSecret) {
			return NextResponse.json({ ok: false, message: "Server missing JWT_SECRET" }, { status: 500 });
		}

		const tokenSet = await issueMobileTokens({
			db,
			jwtSecret,
			userPk: user.user_pk,
			email: user.email.toLowerCase(),
			deviceId,
		});

		await db
			.prepare("UPDATE users SET last_login_from = ?, updated_at = datetime('now') WHERE user_pk = ?")
			.bind("mobile-credentials", user.user_pk)
			.run()
			.catch(() => {
				// non-blocking
			});

		return NextResponse.json({
			ok: true,
			...tokenSet,
		});
	} catch (error) {
		return NextResponse.json(
			{ ok: false, message: error instanceof Error ? error.message : "Credentials sign in failed" },
			{ status: 500 },
		);
	}
}

export function GET() {
	return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405 });
}
