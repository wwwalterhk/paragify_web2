import { getCloudflareContext } from "@opennextjs/cloudflare";
import { randomBytes, scryptSync } from "crypto";
import { NextResponse } from "next/server";
import { sendActivationEmail } from "@/lib/email";
import type { MobileAuthBindings } from "@/lib/mobile-auth";
import { readString } from "@/lib/mobile-auth";

type RegisterBindings = MobileAuthBindings & {
	TURNSTILE_SECRET_KEY?: string;
};

type CredentialsRegisterRequest = {
	email?: unknown;
	password?: unknown;
	captcha?: unknown;
	turnstile_token?: unknown;
	locale?: unknown;
};

type ExistingUserRow = {
	user_pk: number;
	status: string | null;
};

function normalizeHost(rawHost: string): string {
	const firstHost = rawHost.split(",")[0]?.trim().toLowerCase() || "";
	if (!firstHost) {
		return "";
	}
	if (firstHost === "::1") {
		return firstHost;
	}
	if (firstHost.startsWith("[")) {
		const end = firstHost.indexOf("]");
		if (end > 1) {
			return firstHost.slice(1, end);
		}
	}
	const colonCount = (firstHost.match(/:/g) || []).length;
	if (colonCount === 1) {
		return firstHost.split(":")[0] || "";
	}
	return firstHost;
}

function shouldBypassTurnstileForRequest(request: Request): boolean {
	const host = normalizeHost(
		request.headers.get("x-forwarded-host") || request.headers.get("host") || "",
	);
	const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
	if (!isLocalHost) {
		return false;
	}

	const bypassFlag = process.env.NEXT_PUBLIC_BYPASS_TURNSTILE;
	if (bypassFlag === "1") {
		return true;
	}
	if (bypassFlag === "0") {
		return false;
	}

	if (process.env.NODE_ENV !== "production") {
		return true;
	}

	return false;
}

function resolveTurnstileSecret(bindings: RegisterBindings): string | null {
	return readString(bindings.TURNSTILE_SECRET_KEY) ?? readString(process.env.TURNSTILE_SECRET_KEY);
}

export async function POST(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const bindings = env as RegisterBindings;
		const db = bindings.DB;
		if (!db) {
			return NextResponse.json({ ok: false, message: "DB unavailable" }, { status: 500 });
		}

		const body = (await request.json().catch(() => null)) as CredentialsRegisterRequest | null;
		const email = readString(body?.email)?.toLowerCase() ?? "";
		const password = typeof body?.password === "string" ? body.password : "";
		const locale = readString(body?.locale) ?? "zh";
		const turnstileToken = readString(body?.turnstile_token) ?? readString(body?.captcha);

		if (!email || !password) {
			return NextResponse.json({ ok: false, message: "Missing email or password" }, { status: 400 });
		}

		const bypassTurnstile = shouldBypassTurnstileForRequest(request);
		const turnstileSecret = resolveTurnstileSecret(bindings);

		if (!bypassTurnstile) {
			if (!turnstileSecret) {
				return NextResponse.json(
					{ ok: false, message: "Captcha unavailable", message_code: "captcha_unavailable" },
					{ status: 500 },
				);
			}
			if (!turnstileToken) {
				return NextResponse.json(
					{ ok: false, message: "Captcha failed", message_code: "captcha_failed" },
					{ status: 400 },
				);
			}
			const turnstileOk = await verifyTurnstile(turnstileSecret, turnstileToken);
			if (!turnstileOk) {
				return NextResponse.json(
					{ ok: false, message: "Captcha failed", message_code: "captcha_failed" },
					{ status: 400 },
				);
			}
		}

		await ensurePasswordTable(db);
		await ensureVerificationTable(db);

		const existing = await db
			.prepare("SELECT user_pk, status FROM users WHERE lower(email) = ? LIMIT 1")
			.bind(email)
			.first<ExistingUserRow>();

		if (existing?.user_pk) {
			if (existing.status === "active") {
				return NextResponse.json(
					{
						ok: false,
						message: "Already registered. Please sign in.",
						message_code: "already_registered",
					},
					{ status: 400 },
				);
			}

			const tokenResult = await getOrCreateVerificationToken(db, existing.user_pk);
			if (tokenResult.token) {
				try {
					await sendActivationEmail({ to: email, token: tokenResult.token, locale });
				} catch (error) {
					console.error("Mobile credentials register resend activation failed:", error);
				}
			}

			return NextResponse.json({
				ok: true,
				message: "Activation required. Check your email for the activation link.",
				message_code: "activation_required",
				created: false,
			});
		}

		const userId = await generateUserId(db, email);
		const { hash, salt } = hashPassword(password);

		const insertResult = await db
			.prepare(
				"INSERT INTO users (email, user_id, name, avatar_url, status, last_login_from) VALUES (?, ?, ?, ?, ?, ?)",
			)
			.bind(email, userId, userId, null, "pending", "mobile-credentials")
			.run();

		const userPk = Number(insertResult.meta?.last_row_id ?? 0);
		if (!userPk) {
			return NextResponse.json(
				{ ok: false, message: "Registration failed", message_code: "registration_failed" },
				{ status: 500 },
			);
		}

		await db
			.prepare(
				`INSERT INTO user_passwords (user_pk, password_hash, salt, created_at, updated_at)
         VALUES (?, ?, ?, datetime('now'), datetime('now'))
         ON CONFLICT(user_pk) DO UPDATE SET
           password_hash = excluded.password_hash,
           salt = excluded.salt,
           updated_at = excluded.updated_at`,
			)
			.bind(userPk, hash, salt)
			.run();

		const tokenResult = await getOrCreateVerificationToken(db, userPk);
		if (tokenResult.token) {
			try {
				await sendActivationEmail({ to: email, token: tokenResult.token, locale });
			} catch (error) {
				console.error("Mobile credentials register activation send failed:", error);
			}
		}

		return NextResponse.json({
			ok: true,
			message: "Activation required. Check your email for the activation link.",
			message_code: "activation_required",
			created: true,
		});
	} catch (error) {
		console.error("Mobile credentials register failed:", error);
		return NextResponse.json(
			{ ok: false, message: "Registration failed", message_code: "registration_failed" },
			{ status: 500 },
		);
	}
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
	const usedSalt = salt || randomBytes(16).toString("hex");
	const hash = scryptSync(password, usedSalt, 64).toString("hex");
	return { hash, salt: usedSalt };
}

async function verifyTurnstile(secret: string, token: string): Promise<boolean> {
	try {
		const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				secret,
				response: token,
			}),
		});
		const result = (await response.json().catch(() => null)) as { success?: boolean } | null;
		return result?.success === true;
	} catch {
		return false;
	}
}

async function generateUserId(db: D1Database, email: string): Promise<string> {
	const localPart = (email.split("@")[0] || "user").toLowerCase();
	const base = localPart.replace(/[^a-z0-9_-]/g, "") || "user";
	let candidate = base;
	let suffix = 0;

	for (let index = 0; index < 500; index += 1) {
		const existsInUsers = await db
			.prepare("SELECT 1 FROM users WHERE lower(user_id) = ? LIMIT 1")
			.bind(candidate)
			.first<{ 1: number }>();
		if (existsInUsers) {
			suffix += 1;
			candidate = `${base}${suffix}`;
			continue;
		}

		const existsInHistory = await hasUserIdHistory(db, candidate);
		if (!existsInHistory) {
			return candidate;
		}

		suffix += 1;
		candidate = `${base}${suffix}`;
	}

	throw new Error("Could not generate unique user_id.");
}

async function hasUserIdHistory(db: D1Database, candidate: string): Promise<boolean> {
	try {
		const exists = await db
			.prepare("SELECT 1 FROM user_id_history WHERE lower(old_user_id) = ? OR lower(new_user_id) = ? LIMIT 1")
			.bind(candidate, candidate)
			.first<{ 1: number }>();
		return Boolean(exists);
	} catch {
		return false;
	}
}

async function ensurePasswordTable(db: D1Database) {
	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS user_passwords (
        user_pk INTEGER PRIMARY KEY,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_pk) REFERENCES users(user_pk)
      )`,
		)
		.run();
}

async function ensureVerificationTable(db: D1Database) {
	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS user_verification_tokens (
        token TEXT PRIMARY KEY,
        user_pk INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_pk) REFERENCES users(user_pk)
      )`,
		)
		.run();
}

async function getOrCreateVerificationToken(
	db: D1Database,
	userPk: number,
): Promise<{ token: string; created: boolean }> {
	await ensureVerificationTable(db);

	const existing = await db
		.prepare(
			`SELECT token
       FROM user_verification_tokens
       WHERE user_pk = ?
         AND expires_at > datetime('now')
       ORDER BY created_at DESC
       LIMIT 1`,
		)
		.bind(userPk)
		.first<{ token: string }>();

	if (existing?.token) {
		return { token: existing.token, created: false };
	}

	const token = randomBytes(32).toString("hex");
	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

	await db
		.prepare(
			`INSERT INTO user_verification_tokens (token, user_pk, expires_at, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
		)
		.bind(token, userPk, expiresAt)
		.run();

	return { token, created: true };
}
