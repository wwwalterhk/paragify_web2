import NextAuth from "next-auth";
import type { NextAuthOptions, Account, Profile, User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { sendActivationEmail } from "./email";

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || "";

type DbBindings = CloudflareEnv & { DB?: D1Database };

async function getDb(): Promise<D1Database | null> {
	const { env } = await getCloudflareContext({ async: true });
	const db = (env as DbBindings).DB;
	return db ?? null;
}

async function persistOauthUser(user: User, account: Account | null, profile?: Profile) {
	if (!account || (account.provider !== "google" && account.provider !== "apple")) return;

	const db = await getDb();
	if (!db) return;

	const email = readString(user.email) ?? readString(profile?.email);
	if (!email) return;

	const name = getProfileName(profile) ?? readString(user.name);
	const avatarUrl = readString(user.image) ?? readString(getProfilePicture(profile));
	const locale = readString(getProfileLocale(profile));

	const userId = await generateUserId(db, email);
	const displayName = name || userId;
	await db
		.prepare(
			`INSERT INTO users (email, user_id, name, avatar_url, locale, last_login_from)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         user_id = COALESCE(users.user_id, excluded.user_id),
         name = COALESCE(users.name, excluded.name),
         avatar_url = COALESCE(users.avatar_url, excluded.avatar_url),
         locale = COALESCE(users.locale, excluded.locale),
         last_login_from = ?,
         updated_at = datetime('now')`
		)
		.bind(email, userId, displayName, avatarUrl, locale, account.provider, account.provider)
		.run();

	const existing = await db
		.prepare("SELECT user_pk FROM users WHERE email = ? LIMIT 1")
		.bind(email)
		.first<{ user_pk: number }>();

	if (!existing?.user_pk) return;

	await db
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
		.bind(
			existing.user_pk,
			account.provider,
			account.providerAccountId,
			readString(account.access_token),
			readString(account.refresh_token),
			typeof account.expires_at === "number" ? account.expires_at : null
		)
		.run();

	await updateLastLogin(db, existing.user_pk, account.provider);
}

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNextAuthErrorMessage(metadata: unknown): string | null {
	if (!metadata) {
		return null;
	}
	if (metadata instanceof Error) {
		return readString(metadata.message);
	}
	if (typeof metadata === "object") {
		const record = metadata as { message?: unknown; error?: unknown };
		const directMessage = readString(record.message);
		if (directMessage) {
			return directMessage;
		}
		if (record.error instanceof Error) {
			return readString(record.error.message);
		}
		if (record.error && typeof record.error === "object") {
			return readString((record.error as { message?: unknown }).message);
		}
	}
	return null;
}

function shouldIgnoreJwtSessionError(code: string, metadata: unknown): boolean {
	if (code !== "JWT_SESSION_ERROR") {
		return false;
	}
	return getNextAuthErrorMessage(metadata) === "decryption operation failed";
}

function normalizeLocale(value?: string | null): "en" | "zh" {
	if (!value) return "zh";
	return value.toLowerCase().startsWith("en") ? "en" : "zh";
}

function readHeaderValue(headers: unknown, key: string): string | null {
	if (!headers || typeof headers !== "object") {
		return null;
	}
	const headerValue = (headers as Record<string, unknown>)[key.toLowerCase()];
	if (typeof headerValue === "string" && headerValue.trim()) {
		return headerValue.trim();
	}
	if (Array.isArray(headerValue)) {
		for (const entry of headerValue) {
			if (typeof entry === "string" && entry.trim()) {
				return entry.trim();
			}
		}
	}
	return null;
}

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

function shouldBypassTurnstile(headers?: unknown): boolean {
	const host = normalizeHost(
		readHeaderValue(headers, "x-forwarded-host") || readHeaderValue(headers, "host") || ""
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

function getProfilePicture(profile?: Profile): string | null {
	if (!profile) return null;
	const record = profile as Record<string, unknown>;
	return readString(record.picture);
}

function getProfileLocale(profile?: Profile): string | null {
	if (!profile) return null;
	const record = profile as Record<string, unknown>;
	return readString(record.locale);
}

function getProfileName(profile?: Profile): string | null {
	if (!profile) return null;
	// Apple may send name as string, or as an object with firstName/lastName or givenName/familyName on first login.
	const record = profile as Record<string, unknown>;
	const direct = readString(record.name);
	if (direct) return direct;
	const first = readString(record.firstName) ?? readString(record.given_name) ?? readString(record.givenName);
	const last = readString(record.lastName) ?? readString(record.family_name) ?? readString(record.familyName);
	const composed = [first, last].filter(Boolean).join(" ").trim();
	return composed || null;
}

export const authOptions: NextAuthOptions = {
	debug: true,
	providers: [
		CredentialsProvider({
			name: "Email & Password",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
				mode: { label: "Mode", type: "text" },
				captcha: { label: "Captcha", type: "text" },
				locale: { label: "Locale", type: "text" },
			},
			async authorize(credentials, req) {
				const db = await getDb();
				if (!db) throw new Error("DB unavailable");
				const email = readString(credentials?.email)?.toLowerCase();
				const password = readString(credentials?.password);
				const intent = readString((credentials as Record<string, unknown> | undefined)?.mode) === "register" ? "register" : "signin";
				const captcha = readString((credentials as Record<string, unknown> | undefined)?.captcha);
				const turnstileToken = readString((credentials as Record<string, unknown> | undefined)?.turnstile_token);
				const localeInput = readString((credentials as Record<string, unknown> | undefined)?.locale);
				let locale = normalizeLocale(localeInput);
				const bypassTurnstile = shouldBypassTurnstile(req?.headers);
				if (!email || !password) return null;

				await ensurePasswordTable(db);
				await ensureVerificationTable(db);

				const userRow = await db
					.prepare("SELECT user_pk, email, name, avatar_url, status, locale FROM users WHERE email = ? LIMIT 1")
					.bind(email)
					.first<{ user_pk: number; email: string; name: string | null; avatar_url: string | null; status: string; locale: string | null }>();
				if (userRow?.locale) {
					locale = normalizeLocale(userRow.locale);
				}

				// Registration path
				if (intent === "register") {
					if (!bypassTurnstile) {
						if (TURNSTILE_SECRET_KEY) {
							const ok = await verifyTurnstile(turnstileToken);
							if (!ok) {
								console.warn("register captcha failed (turnstile)", { email, turnstileToken });
								throw new Error("captcha failed");
							}
						} else {
							const expected = (process.env.REGISTER_CAPTCHA || "328car").toLowerCase();
							const cap = captcha ?? "";
							if (!cap || cap.toLowerCase() !== expected) {
								console.warn("register captcha failed", { email, captcha });
								throw new Error("captcha failed");
							}
						}
					}

					if (userRow?.user_pk) {
							if (userRow.status !== "active") {
								const tokenResult = await getOrCreateVerificationToken(db, userRow.user_pk);
								if (tokenResult.created) {
									try {
										await sendActivationEmail({ to: email || "", token: tokenResult.token, locale });
									} catch (err) {
										console.error("Activation email send failed:", err);
									}
								}
								throw new Error("Activation required. Check your email for the activation link.");
						}
						throw new Error("already registered");
					}

					// create new user
					const { hash, salt } = hashPassword(password);
					const userId = await generateUserId(db, email);
					const insertRes = await db
						.prepare("INSERT INTO users (email, user_id, name, avatar_url, status, locale) VALUES (?, ?, ?, ?, ?, ?)")
						.bind(email, userId, userId, null, "pending", locale)
						.run();
					const newPk = insertRes.meta?.last_row_id ?? null;
					if (!newPk) return null;

					await db
						.prepare(
							`INSERT INTO user_passwords (user_pk, password_hash, salt, created_at, updated_at)
               VALUES (?, ?, ?, datetime('now'), datetime('now'))
               ON CONFLICT(user_pk) DO UPDATE SET password_hash = excluded.password_hash, salt = excluded.salt, updated_at = excluded.updated_at`
						)
						.bind(newPk, hash, salt)
						.run();

					const tokenResult = await getOrCreateVerificationToken(db, newPk);
					if (tokenResult.created) {
						try {
							await sendActivationEmail({ to: email || "", token: tokenResult.token, locale });
						} catch (error) {
							console.error("Activation email send failed:", error);
						}
					}
					console.info("Credentials register success (pending activation)", { email, user_pk: newPk });
					throw new Error("Activation required. Check your email for the activation link.");
				}

				// Sign-in path
				if (!userRow?.user_pk) return null;
				const pwdRow = await db
					.prepare("SELECT password_hash, salt FROM user_passwords WHERE user_pk = ? LIMIT 1")
					.bind(userRow.user_pk)
					.first<{ password_hash: string; salt: string }>();
				if (!pwdRow || !password) return null;
				if (!verifyPassword(password, pwdRow.salt, pwdRow.password_hash)) return null;

				if (userRow.status !== "active") {
					const tokenResult = await getOrCreateVerificationToken(db, userRow.user_pk);
					if (tokenResult.created) {
						try {
							await sendActivationEmail({ to: email || "", token: tokenResult.token, locale });
						} catch (err) {
							console.error("Activation email send failed:", err);
						}
					}
					throw new Error("Activation required. Check your email for the activation link.");
				}

				await updateLastLogin(db, userRow.user_pk, "web");

				return {
					id: String(userRow.user_pk),
					email: userRow.email,
					name: userRow.name ?? undefined,
					image: userRow.avatar_url ?? undefined,
				};
			},
		}),
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID || "",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
			httpOptions: {
				timeout: 15000,
			},
		}),
		AppleProvider({
			clientId: process.env.APPLE_CLIENT_ID || "com.328car.328carhk2",
			clientSecret: process.env.APPLE_CLIENT_SECRET || "",
			authorization: { params: { scope: "name email" } },
			httpOptions: {
				timeout: 15000,
			},
		}),
	],
	cookies: {
		pkceCodeVerifier: {
			name: "next-auth.pkce.code_verifier",
			options: {
				httpOnly: true,
				sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
				path: "/",
				secure: process.env.NODE_ENV === "production",
			},
		},
		csrfToken: {
			name: "next-auth.csrf-token",
			options: {
				httpOnly: false,
				sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
				path: "/",
				secure: process.env.NODE_ENV === "production",
			},
		},
	},
	session: {
		strategy: "jwt",
	},
	callbacks: {
		async signIn({ user, account, profile }) {
			await persistOauthUser(user, account, profile);
			return true;
		},
		async jwt({ token, user, trigger, session }) {
			const tokenWithAvatar = token as typeof token & { avatar_url?: string | null };

			if (user) {
				if (typeof user.name === "string") token.name = user.name;
				if (typeof user.email === "string") token.email = user.email;
				if (typeof user.image === "string") {
					token.picture = user.image;
					tokenWithAvatar.avatar_url = user.image;
				}
			}

			if (trigger === "update") {
				const updatePayload = session as
					| {
							name?: string | null;
							email?: string | null;
							image?: string | null;
							avatar_url?: string | null;
							user?: {
								name?: string | null;
								email?: string | null;
								image?: string | null;
								avatar_url?: string | null;
							};
					  }
					| null;
				const nextName = updatePayload?.name ?? updatePayload?.user?.name;
				const nextEmail = updatePayload?.email ?? updatePayload?.user?.email;
				const nextAvatar = updatePayload?.avatar_url ?? updatePayload?.image ?? updatePayload?.user?.avatar_url ?? updatePayload?.user?.image;
				if (typeof nextName === "string") token.name = nextName;
				if (typeof nextEmail === "string") token.email = nextEmail;
				if (typeof nextAvatar === "string") {
					token.picture = nextAvatar;
					tokenWithAvatar.avatar_url = nextAvatar;
				}
			}

			return token;
		},
		async session({ session, token }) {
			if (!session.user) return session;
			if (typeof token.name === "string") session.user.name = token.name;
			if (typeof token.email === "string") session.user.email = token.email;
			const avatarFromToken = (token as { avatar_url?: unknown }).avatar_url;
			const nextAvatar = typeof avatarFromToken === "string" ? avatarFromToken : typeof token.picture === "string" ? token.picture : null;
			if (nextAvatar) {
				session.user.image = nextAvatar;
				(session.user as { avatar_url?: string | null }).avatar_url = nextAvatar;
			}
			return session;
		},
	},
	pages: {
		signIn: "/auth/zh/signin",
		error: "/auth/error",
	},
	events: {
		async signIn(message) {
			// Temporary: log sign-in events for debugging
			console.log("NextAuth signIn event:", message);
		},
	},
	logger: {
		error(code, metadata) {
			if (shouldIgnoreJwtSessionError(code, metadata)) {
				return;
			}
			console.error(`[next-auth][error][${code}]`, `\nhttps://next-auth.js.org/errors#${code.toLowerCase()}`, getNextAuthErrorMessage(metadata), metadata);
		},
	},
	secret: process.env.NEXTAUTH_SECRET,
};

export const authHandler = NextAuth(authOptions);

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
	const usedSalt = salt || randomBytes(16).toString("hex");
	const hash = scryptSync(password, usedSalt, 64).toString("hex");
	return { hash, salt: usedSalt };
}

async function generateUserId(db: D1Database, email: string): Promise<string> {
	const localPart = (email.split("@")[0] || "user").toLowerCase();
	const base = localPart.replace(/[^a-z0-9_-]/g, "") || "user";
	let candidate = base;
	let suffix = 0;
	// Try base, then base1, base2, ...
	// Limit to reasonable attempts to avoid infinite loops
	for (let i = 0; i < 500; i++) {
		const exists = await db
			.prepare("SELECT 1 FROM users WHERE lower(user_id) = ? LIMIT 1")
			.bind(candidate)
			.first<{ 1: number }>();
		const existsInHistory = await db
			.prepare("SELECT 1 FROM user_id_history WHERE lower(old_user_id) = ? OR lower(new_user_id) = ? LIMIT 1")
			.bind(candidate, candidate)
			.first<{ 1: number }>();
		if (!exists && !existsInHistory) return candidate;
		suffix += 1;
		candidate = `${base}${suffix}`;
	}
	throw new Error("Could not generate unique user_id");
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
	try {
		const hashed = hashPassword(password, salt).hash;
		return timingSafeEqual(Buffer.from(hashed, "hex"), Buffer.from(hash, "hex"));
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
      )`
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
      )`
		)
		.run();
}

async function getOrCreateVerificationToken(
	db: D1Database,
	userPk: number
): Promise<{ token: string; created: boolean }> {
	await ensureVerificationTable(db);
	const existing = await db
		.prepare(
			`SELECT token FROM user_verification_tokens
       WHERE user_pk = ? AND expires_at > datetime('now')
       ORDER BY created_at DESC
       LIMIT 1`
		)
		.bind(userPk)
		.first<{ token: string }>();

	if (existing?.token) {
		return { token: existing.token, created: false };
	}

	const token = randomBytes(32).toString("hex");
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

	await db
		.prepare(
			`INSERT INTO user_verification_tokens (token, user_pk, expires_at, created_at)
       VALUES (?, ?, ?, datetime('now'))`
		)
		.bind(token, userPk, expiresAt.toISOString())
		.run();

	return { token, created: true };
}

async function updateLastLogin(db: D1Database, userPk: number, source: string) {
	await db
		.prepare("UPDATE users SET last_login_from = ?, updated_at = datetime('now') WHERE user_pk = ?")
		.bind(source, userPk)
		.run();
}

async function verifyTurnstile(token: string | null): Promise<boolean> {
	if (!TURNSTILE_SECRET_KEY) return false;
	if (!token) return false;
	try {
		console.info("Turnstile verify start", { hasSecret: !!TURNSTILE_SECRET_KEY });
		const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				secret: TURNSTILE_SECRET_KEY,
				response: token,
			}),
		});
		const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
		console.info("Turnstile verify response", data);
		return !!data?.success;
	} catch (err) {
		console.error("Turnstile verify failed", err);
		return false;
	}
}
