import { Resend } from "resend";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type DbBindings = CloudflareEnv & { DB?: D1Database };

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.RESEND_FROM_EMAIL || "admin@paragify.com";

const resend = apiKey ? new Resend(apiKey) : null;

export async function sendTransactionalEmail(params: {
	to: string | string[];
	subject: string;
	html: string;
	purpose?: string;
	locale?: string;
}) {
	if (!resend) {
		console.warn("Resend API key missing; email not sent");
		return;
	}

	const to = Array.isArray(params.to) ? params.to : [params.to];
	const html = buildEmailTemplate(params.html, params.locale);

	try {
		await resend.emails.send({
			from: fromAddress,
			to,
			subject: params.subject,
			html,
		});
	} catch (err) {
		console.error("Resend send failed:", err);
		throw err;
	}

	await logEmailSend(to.join(","), params.purpose ?? params.subject);
}

export async function sendWelcomeEmail(to: string, locale: string = "zh") {
	const isEn = locale.toLowerCase() === "en";
	const subject = isEn ? "Welcome to Paragify" : "歡迎加入 Paragify";
	const bodyHtml = isEn ? `<p>Welcome! Your account has been created.</p>` : `<p>歡迎！你的帳戶已建立。</p>`;
	return sendTransactionalEmail({
		to,
		subject,
		html: bodyHtml,
		purpose: "welcome",
		locale,
	});
}

export async function sendActivationEmail(params: { to: string; token: string; locale?: string }) {
	const baseUrl = process.env.NEXTAUTH_URL || "https://paragify.com";
	const locale = params.locale?.toLowerCase() === "en" ? "en" : "zh";
	const url = `${baseUrl}/auth/${locale}/activate?token=${encodeURIComponent(params.token)}&email=${encodeURIComponent(params.to)}&locale=${locale}`;
	const subject = locale === "en" ? "Activate your Paragify account" : "啟用你的 Paragify 帳戶";
	const intro = locale === "en" ? "Please confirm your email to activate your account." : "請確認你的電郵以啟用帳戶。";
	const cta = locale === "en" ? "Activate account" : "啟用帳戶";
	const ignore = locale === "en" ? "If you did not request this, you can ignore this email." : "若非你本人操作，可忽略此電郵。";
	const bodyHtml = [
		`<p>${intro}</p>`,
		`<p><a href="${url}" target="_blank" rel="noopener noreferrer">${cta}</a></p>`,
		`<p>${ignore}</p>`,
	].join("");

	return sendTransactionalEmail({
		to: params.to,
		subject,
		purpose: "activation",
		html: bodyHtml,
		locale,
	});
}

export async function sendPasswordResetEmail(params: { to: string; token: string; locale?: string }) {
	const baseUrl = process.env.NEXTAUTH_URL || "https://paragify.com";
	const locale = params.locale?.toLowerCase() === "en" ? "en" : "zh";
	const url = `${baseUrl}/auth/${locale}/reset?token=${encodeURIComponent(params.token)}&email=${encodeURIComponent(params.to)}&locale=${locale}`;
	const subject = locale === "en" ? "Reset your Paragify password" : "重設你的 Paragify 密碼";
	const linkLabel = locale === "en" ? "Set a new password" : "設定新密碼";
	const intro = locale === "en" ? "You requested a password reset." : "你剛剛提出重設密碼。";
	const ignore = locale === "en" ? "If you did not request this, you can ignore this email." : "若非你本人操作，可忽略此電郵。";
	const bodyHtml = [
		`<p>${intro}</p>`,
		`<p><a href="${url}" target="_blank" rel="noopener noreferrer">${linkLabel}</a></p>`,
		`<p>${ignore}</p>`,
	].join("");

	return sendTransactionalEmail({
		to: params.to,
		subject,
		purpose: "password-reset",
		html: bodyHtml,
		locale,
	});
}

async function logEmailSend(toEmail: string, purpose: string) {
	const { env } = await getCloudflareContext({ async: true });
	const db = (env as DbBindings).DB;
	if (!db) {
		console.warn("DB unavailable; email log skipped");
		return;
	}

	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS email_logs (
        email_log_pk INTEGER PRIMARY KEY AUTOINCREMENT,
        to_email TEXT NOT NULL,
        purpose TEXT NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
		)
		.run();

	await db
		.prepare("INSERT INTO email_logs (to_email, purpose, sent_at) VALUES (?, ?, datetime('now'))")
		.bind(toEmail, purpose)
		.run();
}

function buildEmailTemplate(body: string, locale?: string): string {
	const baseUrl = process.env.NEXTAUTH_URL || "https://paragify.com";
	const logoUrl = `${baseUrl.replace(/\/$/, "")}/email-logo.png`;
	const isEn = (locale || "zh").toLowerCase() === "en";
	const footerLine1 = isEn ? "This message was sent by Paragify." : "此訊息由 Paragify 發送。";
	const footerLine2 = isEn ? "Please ignore if you did not request it." : "若非你本人操作，可忽略此電郵。";
	return [
		'<!doctype html>',
		'<html lang="en">',
		"<head>",
		`<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />`,
		`<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
		"</head>",
		`<body style="margin:0;padding:0;background:#f6f7fb;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a;">`,
		`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb;padding:24px 0;">`,
		`  <tr>`,
		`    <td align="center">`,
		`      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px -16px rgba(0,0,0,0.2);">`,
		`        <tr>`,
		`          <td style="padding:20px 20px 12px 20px;border-bottom:1px solid #e5e7eb;">`,
		`            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">`,
		`              <tr>`,
		`                <td style="width:40px;">`,
		`                  <a href="${baseUrl}" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:#111827;">`,
		`                    <img src="${logoUrl}" width="28" height="28" alt="Paragify" style="display:block;border:0;" />`,
		`                  </a>`,
		`                </td>`,
		`                <td style="text-align:right;font-size:12px;color:#6b7280;">Paragify</td>`,
		`              </tr>`,
		`            </table>`,
		`          </td>`,
		`        </tr>`,
		`        <tr>`,
		`          <td style="padding:24px 20px;font-size:14px;line-height:1.6;color:#0f172a;">${body}</td>`,
		`        </tr>`,
		`        <tr>`,
		`          <td style="padding:16px 20px;font-size:12px;line-height:1.5;color:#6b7280;border-top:1px solid #e5e7eb;">`,
		`            <div style="color:#6b7280;">${footerLine1}</div>`,
		`            <div style="margin-top:4px;">${footerLine2}</div>`,
		`          </td>`,
		`        </tr>`,
		`      </table>`,
		`    </td>`,
		`  </tr>`,
		`</table>`,
		"</body>",
		"</html>",
	].join("");
}
