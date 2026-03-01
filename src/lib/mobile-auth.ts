import { randomBytes } from "crypto";
import { SignJWT } from "jose";

export type MobileAuthBindings = CloudflareEnv & {
	DB?: D1Database;
	JWT_SECRET?: string;
};

export type MobileClientOs = "ios" | "android" | "unknown";

export const MOBILE_ACCESS_TTL_SECONDS = 60 * 60; // 1 hour
export const MOBILE_REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type MobileTokenSet = {
	access_token: string;
	token_type: "Bearer";
	expires_in: number;
	refresh_token: string;
	refresh_expires_in: number;
};

export function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeMobileClientOs(value: unknown): MobileClientOs {
	const normalized = readString(value)?.toLowerCase();
	if (normalized === "ios") return "ios";
	if (normalized === "android") return "android";
	return "unknown";
}

export function uniqueNonEmptyStrings(values: Array<string | null | undefined>): string[] {
	const unique = new Set<string>();
	for (const value of values) {
		const normalized = readString(value);
		if (normalized) {
			unique.add(normalized);
		}
	}
	return Array.from(unique);
}

export function resolveJwtSecret(env: { JWT_SECRET?: string }): string | null {
	return readString(env.JWT_SECRET) ?? readString(process.env.JWT_SECRET);
}

export function createMobileRefreshToken(): string {
	return randomBytes(16).toString("hex");
}

export async function signMobileAccessToken(options: {
	jwtSecret: string;
	userPk: number;
	email: string;
	jti: string;
	expiresInSeconds?: number;
}): Promise<string> {
	const expiresInSeconds = options.expiresInSeconds ?? MOBILE_ACCESS_TTL_SECONDS;
	const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
	return new SignJWT({
		sub: String(options.userPk),
		email: options.email.toLowerCase(),
		jti: options.jti,
	})
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime(expiresAt)
		.sign(new TextEncoder().encode(options.jwtSecret));
}

export async function issueMobileTokens(options: {
	db: D1Database;
	jwtSecret: string;
	userPk: number;
	email: string;
	deviceId?: string | null;
}): Promise<MobileTokenSet> {
	const refreshToken = createMobileRefreshToken();
	const deviceId = readString(options.deviceId);

	await options.db
		.prepare(
			`INSERT INTO user_sessions (user_pk, session_token, device_id, expires_at)
       VALUES (?, ?, ?, datetime('now', '+' || ? || ' seconds'))
       ON CONFLICT(session_token) DO UPDATE SET
         device_id = excluded.device_id,
         expires_at = datetime('now', '+' || ? || ' seconds')`
		)
		.bind(
			options.userPk,
			refreshToken,
			deviceId,
			MOBILE_REFRESH_TTL_SECONDS,
			MOBILE_REFRESH_TTL_SECONDS,
		)
		.run();

	const accessToken = await signMobileAccessToken({
		jwtSecret: options.jwtSecret,
		userPk: options.userPk,
		email: options.email,
		jti: refreshToken,
		expiresInSeconds: MOBILE_ACCESS_TTL_SECONDS,
	});

	return {
		access_token: accessToken,
		token_type: "Bearer",
		expires_in: MOBILE_ACCESS_TTL_SECONDS,
		refresh_token: refreshToken,
		refresh_expires_in: MOBILE_REFRESH_TTL_SECONDS,
	};
}

export async function upsertMobileOauthUser(options: {
	db: D1Database;
	email: string;
	provider: "google" | "apple";
	providerUserId: string;
	name?: string | null;
	avatarUrl?: string | null;
	locale?: string | null;
	status?: string | null;
	lastLoginFrom?: string | null;
}): Promise<{ userPk: number; email: string }> {
	const email = options.email.trim().toLowerCase();
	const userId = await generateUserId(options.db, email);
	const displayName = readString(options.name) ?? userId;
	const avatarUrl = readString(options.avatarUrl);
	const locale = readString(options.locale);
	const status = readString(options.status) ?? "active";
	const lastLoginFrom = readString(options.lastLoginFrom) ?? options.provider;

	await options.db
		.prepare(
			`INSERT INTO users (email, user_id, name, avatar_url, locale, last_login_from, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         user_id = COALESCE(users.user_id, excluded.user_id),
         name = COALESCE(users.name, excluded.name),
         avatar_url = COALESCE(users.avatar_url, excluded.avatar_url),
         locale = COALESCE(users.locale, excluded.locale),
         last_login_from = COALESCE(excluded.last_login_from, users.last_login_from),
         status = COALESCE(users.status, excluded.status),
         updated_at = datetime('now')`
		)
		.bind(email, userId, displayName, avatarUrl, locale, lastLoginFrom, status)
		.run();

	const user = await options.db
		.prepare("SELECT user_pk FROM users WHERE lower(email) = ? LIMIT 1")
		.bind(email)
		.first<{ user_pk: number }>();
	if (!user?.user_pk) {
		throw new Error("User not found after upsert.");
	}

	await options.db
		.prepare(
			`INSERT INTO user_accounts (
        user_pk, provider, provider_user_id, access_token, refresh_token, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider, provider_user_id) DO UPDATE SET
        user_pk = excluded.user_pk,
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        expires_at = excluded.expires_at`
		)
		.bind(user.user_pk, options.provider, options.providerUserId, null, null, null)
		.run();

	await options.db
		.prepare("UPDATE users SET last_login_from = ?, updated_at = datetime('now') WHERE user_pk = ?")
		.bind(lastLoginFrom, user.user_pk)
		.run();

	return {
		userPk: user.user_pk,
		email,
	};
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
