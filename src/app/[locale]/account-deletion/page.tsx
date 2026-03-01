import type { Metadata } from "next";

type PageProps = { params: Promise<{ locale: string }> };
type Section = { title: string; body?: string; items?: string[] };

const contactEmail = "admin@paragify.com";
const lastUpdated = "2026-02-26";

const copy = {
	zh: {
		metaTitle: "帳戶刪除與資料處理 | Paragify",
		metaDesc: "如何要求刪除 Paragify 帳戶、會刪除或保留哪些資料，以及處理時限。",
		pill: "Account Deletion",
		title: "帳戶刪除與資料處理",
		intro:
			"本頁適用於 Paragify。下列步驟說明如何提出帳戶刪除要求，以及我們對資料的刪除與保留做法。",
		sections: [
			{
				title: "如何提出刪除要求",
				items: [
					"在 Paragify App：前往「帳戶 / Profile」→「設定 / Settings」→「刪除帳戶 / Delete account」，按提示確認。",
					`若你在 App 未找到刪除按鈕，請用註冊電郵發信至 ${contactEmail}（主旨：\"Delete my Paragify account\"），並提供：1) 你的顯示名稱；2) 登入方式（Apple / Google / Email）；3) 確認要刪除帳戶。`,
					"我們通常在 7 天內核實身份並回覆處理；如需額外資料，會以同一電郵聯絡。",
				],
			},
			{
				title: "刪除時會移除的資料（一般於 30 天內完成）",
				items: [
					"帳戶識別與登入資料：電郵、顯示名稱/暱稱、登入憑證、推播裝置權杖（APNS/FCM）",
					"偏好與使用資料：收藏/讚好、搜尋與篩選偏好、互動紀錄",
					"草稿或未發佈內容：未送出的貼文、暫存內容與附件",
				],
			},
			{
				title: "可能保留的資料及保留期",
				items: [
					"安全與防濫用記錄（登入 IP、裝置指標、異常行為標記）：最多保留 180 天，用於防欺詐與合規後刪除或匿名化。",
					"爭議/合規所需資料：如涉及投訴、欺詐調查或法律要求，會保留至個案結束後最多 180 天再刪除或匿名化。",
					"交易與會計資料（如你曾付款/訂閱）：按法定會計或稅務要求保留最多 7 年。",
					"備份：循環備份可能短暫保留你的資料快照，通常不超過 30 天並自動覆寫。",
				],
			},
			{
				title: "刪除後的影響",
				items: [
					"帳戶將無法登入或復原；已移除資料不可恢復。",
					"你的部分公開互動內容可能被刪除、去識別化或以系統標記保留，以維持平台完整性與合規。",
				],
			},
			{
				title: "聯絡",
				items: [`如有疑問，請電郵 ${contactEmail}。`],
			},
		] as Section[],
	},
	en: {
		metaTitle: "Account Deletion & Data Handling | Paragify",
		metaDesc:
			"How to request deletion of your Paragify account, what data we delete or retain, and the expected timeline.",
		pill: "Account Deletion",
		title: "Account Deletion & Data Handling",
		intro:
			"This page explains how to request account deletion for Paragify and how your data is deleted or retained.",
		sections: [
			{
				title: "How to request deletion",
				items: [
					"In the Paragify App: go to Profile → Settings → Delete account and follow the prompts.",
					`If the button is not available, email ${contactEmail} from your sign-in email with subject \"Delete my Paragify account\" and include: (1) your display name, (2) sign-in method (Apple / Google / Email), (3) a clear confirmation to delete the account.`,
					"We usually verify and respond within 7 days; if we need more details, we'll reply to the same email.",
				],
			},
			{
				title: "Data that will be deleted (typically within 30 days)",
				items: [
					"Account identifiers and sign-in data: email, display name/nickname, credentials, push device tokens (APNS/FCM).",
					"Preferences and usage data: saves/likes, search and filter preferences, interaction history.",
					"Draft or unpublished content: unsent posts, temporary content, and attachments.",
				],
			},
			{
				title: "Data that may be retained and retention periods",
				items: [
					"Security and anti-abuse logs (login IP, device signals, abuse flags): retained up to 180 days, then deleted or anonymized.",
					"Data required for disputes/compliance: if needed for fraud reviews, complaints, or legal obligations, retained until case closure, then up to 180 days before deletion or anonymization.",
					"Billing/accounting records (if you purchased features/subscriptions): retained up to 7 years to meet legal and tax obligations.",
					"Backups: rolling backups may retain snapshots for up to 30 days before overwrite.",
				],
			},
			{
				title: "What happens after deletion",
				items: [
					"The deleted account cannot be restored and removed data cannot be recovered.",
					"Some public interaction records may be deleted, anonymized, or retained with system markers to preserve platform integrity and compliance.",
				],
			},
			{
				title: "Contact",
				items: [`For questions, contact ${contactEmail}.`],
			},
		] as Section[],
	},
} as const;

function mapLocale(locale: string) {
	const isEn = locale.toLowerCase() === "en";
	return { lang: isEn ? ("en" as const) : ("zh" as const), pathPrefix: isEn ? "/en" : "/zh" };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { locale } = await params;
	const { lang, pathPrefix } = mapLocale(locale);
	const t = copy[lang];
	const url = `https://paragify.com${pathPrefix}/account-deletion`;
	return {
		title: t.metaTitle,
		description: t.metaDesc,
		alternates: {
			canonical: url,
			languages: {
				"zh-HK": "https://paragify.com/zh/account-deletion",
				en: "https://paragify.com/en/account-deletion",
			},
		},
		openGraph: { url, title: t.metaTitle, description: t.metaDesc },
		twitter: { card: "summary", title: t.metaTitle, description: t.metaDesc },
	};
}

export default async function AccountDeletionPage({ params }: PageProps) {
	const { locale } = await params;
	const { lang } = mapLocale(locale);
	const t = copy[lang];

	return (
		<main className="relative min-h-screen text-[color:var(--txt-1)]">
			<div
				className="pointer-events-none fixed inset-0 -z-10"
				style={{ backgroundColor: "var(--bg-1)", backgroundImage: "var(--page-bg-gradient)" }}
			/>

			<div className="mx-auto max-w-4xl px-6 py-10 sm:px-10 lg:px-16">
				<div className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-8 shadow-sm sm:p-10">
					<div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color:var(--txt-3)]">
						{t.pill}
					</div>
					<h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--txt-1)] sm:text-4xl">
						{t.title}
					</h1>
					<p className="mt-3 max-w-3xl text-sm leading-relaxed text-[color:var(--txt-2)] sm:text-base">
						{t.intro}
					</p>
					<div className="mt-4 text-xs text-[color:var(--txt-3)]">{lastUpdated}</div>
				</div>

				<div className="mt-8 space-y-5">
					{t.sections.map((section) => (
						<section
							key={section.title}
							className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-6 shadow-sm"
						>
							<h2 className="text-xl font-semibold tracking-tight text-[color:var(--txt-1)]">
								{section.title}
							</h2>
							{section.body ? (
								<p className="mt-3 text-sm leading-relaxed text-[color:var(--txt-2)] sm:text-base">
									{section.body}
								</p>
							) : null}
							{Array.isArray(section.items) ? (
								<ul className="mt-3 space-y-2 text-sm leading-relaxed text-[color:var(--txt-2)] sm:text-base">
									{section.items.map((item) => (
										<li key={item} className="flex gap-3">
											<span
												className="mt-[6px] inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--accent-1)]"
												aria-hidden
											/>
											<span className="flex-1">{item}</span>
										</li>
									))}
								</ul>
							) : null}
						</section>
					))}
				</div>
			</div>
		</main>
	);
}
