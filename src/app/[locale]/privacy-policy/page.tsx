import type { Metadata } from "next";
import Link from "next/link";

type Section = {
	title: string;
	intro?: string;
	items?: string[];
	subSections?: Array<{ heading: string; items: string[] }>;
	note?: string;
};

const contactEmail = "privacy@paragify.com";
const lastUpdated = "2026-01-12";

const sectionsZh: Section[] = [
	{
		title: "1) 我們是誰（資料使用者 / 控制者）",
		items: ["資料使用者： paragify.com", "私隱聯絡電郵： privacy@paragify.com"],
	},
	{
		title: "2) 我們收集的資料類型",
		intro: "我們按「所需即收集」原則，可能收集以下資料（視乎你使用的功能而定）：",
		subSections: [
			{
				heading: "(A) 帳戶及聯絡資料（登入/帳戶管理）",
				items: [
					"電郵、電話（如你提供）、顯示名稱/暱稱",
					"第三方登入識別資訊（Apple / Google 的帳戶識別碼；我們不會取得你的第三方帳戶密碼）",
					"帳戶狀態、偏好設定、語言/地區設定",
				],
			},
			{
				heading: "(B) 內容與互動資料（刊登/站內訊息/使用行為）",
				items: [
					"刊登內容：車輛資料、描述、相片/影片（如有）、聯絡方式（如你選擇公開/提供）",
					"站內訊息/即時通訊內容（包括你與其他用戶/商戶的訊息、附件，如你上載）",
					"互動數據：搜尋字詞、篩選條件、收藏、點擊、瀏覽紀錄（用於改善排序、推薦及產品體驗）",
				],
			},
			{
				heading: "(C) 裝置與技術資料（網站與 App）",
				items: ["IP 位址、裝置型號、作業系統、瀏覽器類型、App 版本、語言設定", "事件日誌、錯誤/崩潰資料（用於穩定性與除錯）", "Cookie / 本機儲存 / 類似技術（詳見第 6 節）"],
			},
			{
				heading: "(D) AI 相關資料（AI 搜尋 / AI 相片識別）",
				items: [
					"你輸入到 AI 功能的文字（例如預算、年份、品牌/車型偏好、用途）",
					"你用於 AI 相片識別的相片（或相片的必要技術特徵），以及識別結果",
					"我們建議你避免在 AI 輸入或上載相片中加入不必要的敏感個人資料。",
				],
			},
			{
				heading: "(E) 付款與交易資料（如你購買付費功能/訂閱）",
				items: [
					"由平台或支付處理商回傳的交易資訊（例如交易識別碼、購買時間、訂閱狀態、到期/取消狀態）",
					"我們一般不會直接收集或保存你的完整信用卡號碼；付款由 App Store / Google Play（及/或你在網站使用的第三方支付處理商，如適用）處理",
				],
			},
			{
				heading: "(F) 客服、合規與安全資料",
				items: ["你與我們的客服往來內容、投訴/舉報資料", "防欺詐與安全用途的紀錄（例如可疑登入、濫用行為、垃圾內容、違規刊登）"],
			},
		],
	},
	{
		title: "3) 我們如何收集資料",
		items: [
			"你直接提供：註冊、登入、刊登、上載相片/內容、站內訊息、客服查詢",
			"自動收集：裝置/瀏覽資料、日誌、互動與使用數據、Cookie",
			"第三方提供：第三方登入供應商提供的識別資訊；支付平台回傳的交易狀態；分析/崩潰工具回傳的事件與診斷資料",
		],
	},
	{
		title: "4) 我們使用資料的目的",
		items: [
			"提供及營運服務：建立帳戶、登入驗證、刊登管理、站內訊息、搜尋與收藏功能",
			"改善產品與體驗：分析使用行為、優化排序/推薦、提升速度與穩定性",
			"AI 功能支援：處理 AI 搜尋與 AI 相片識別請求、產出結果、改善相關功能表現",
			"安全、風險控制與防濫用：偵測可疑行為、阻止垃圾內容/欺詐、保護用戶與平台",
			"客服與溝通：回覆查詢、處理投訴、發送服務必要通知（例如安全提示、重要更新）",
			"行銷（在你允許或法律允許下）：向你發送產品更新、功能測試邀請、推廣訊息；你可隨時退訂",
			"法律與合規：遵守適用法律要求、處理爭議、執行條款與政策",
		],
	},
	{
		title: "5) 我們會向誰披露/分享資料",
		intro: "我們只會在合理需要下分享資料，典型情況如下：",
		subSections: [
			{
				heading: "(A) 服務供應商（受合約約束）",
				items: [
					"為了提供服務，我們可能使用第三方供應商處理以下工作：雲端託管、內容傳送（CDN）、資料分析、崩潰回報、身份驗證、推送通知、客服工具與安全監測。供應商只能按我們指示及為提供服務而處理資料。",
				],
			},
			{ heading: "(B) 登入供應商", items: ["如你使用 Apple / Google 登入，你的登入會由相關供應商處理並回傳必要識別資訊。"] },
			{
				heading: "(C) 分析與穩定性工具",
				items: [
					"我們會使用一項或多項分析/崩潰工具（例如 Google Analytics、Firebase、PostHog、Cloudflare Web Analytics 或同類服務）以了解使用情況與改善穩定性。你可按第 6 節管理 Cookie/追蹤設定（網站）或在 App 內設定（如我們提供）。",
				],
			},
			{
				heading: "(D) 推送通知供應商",
				items: ["如你開啟通知，我們會使用 APNs / FCM 等推送服務傳送通知。推送通常需要裝置識別碼/推送憑證以便投遞。"],
			},
			{
				heading: "(E) 付款與訂閱平台/處理商",
				items: ["App 內購買由 App Store / Google Play（及/或網站第三方支付處理商，如適用）處理並回傳交易狀態。我們不會要求你提供完整信用卡資料作平台自存。"],
			},
			{
				heading: "(F) 法律要求與業務變更",
				items: ["如法律、法院命令或政府/執法機關要求；或在合併、收購、重組等業務變更下，按法律允許及以合理保障措施處理。"],
			},
		],
		note: "我們不會把你的個人資料出售予第三方作其獨立行銷用途。",
	},
	{
		title: "6) Cookie、追蹤技術與選項（網站為主）",
		items: ["我們在網站可能使用 Cookie、本機儲存或同類技術，用於：", "必要功能：登入狀態、偏好設定、安全性", "分析與效能：了解使用情況、量度成效、改善穩定性與體驗", "你可透過瀏覽器設定管理或刪除 Cookie；但若停用必要 Cookie，部分功能可能無法正常運作。"],
		note: "如你有 Cookie Banner/Consent Mode，可在此提示「你可在設定/偏好中心變更同意選項」。",
	},
	{
		title: "7) 資料保存期限",
		intro: "我們只在達成目的所需或法律要求的期間保存資料，期滿後刪除或匿名化處理。一般做法包括：",
		items: [
			"帳戶資料：帳戶存在期間；關閉帳戶後在合理期限內刪除/匿名化（除法律或爭議處理需要）",
			"刊登與訊息資料：為提供服務、處理爭議、防濫用及合規所需的合理期間",
			"安全/審計日誌：通常保存一段有限期限以偵測濫用與排錯（可依內部標準，例如 90–180 天）",
		],
	},
	{ title: "8) 資料安全", items: ["我們採取合理的技術及組織措施保護資料（例如加密傳輸、存取控制、最小權限、監測與備援）。"] },
	{
		title: "9) 跨境傳輸",
		items: ["由於我們可能使用位於香港以外的雲端或供應商，你的資料可能在香港以外地區被處理或儲存。我們會採取合約與技術措施，要求接收方提供合理的保護水平。"],
	},
	{
		title: "10) 你的權利與如何提出要求",
		intro: `你可透過 ${contactEmail} 聯絡我們行使或查詢以下事項（我們會在合理時間內回覆，並可能要求核實身份）：`,
		items: ["查閱及更正你的個人資料", "刪除或關閉帳戶（在法律允許及不影響合規前提下）", "撤回同意或退訂行銷訊息（如適用）"],
	},
	{ title: "11) 未成年人", items: ["服務主要面向成年人。未滿 18 歲人士應在監護人同意及指導下使用，並避免提供不必要的個人資料。"] },
	{ title: "12) 第三方連結與第三方內容", items: ["服務可能包含第三方網站連結或第三方提供的車輛資訊/相片/描述。第三方如何處理資料不受我們控制；請你查閱其私隱政策。"] },
	{
		title: "13) 政策更新",
		items: ["我們可能因法律、技術或服務變更而更新本政策。重大變更會以站內公告、App 通知或電郵（如適用）提示。更新版本自公告日起生效；你繼續使用服務即表示接受更新後的政策。"],
	},
	{ title: "14) 聯絡我們", intro: "如你對本政策或資料處理有任何疑問，請聯絡我們。" },
];

const sectionsEn: Section[] = [
	{
		title: "1) Who we are (data user/controller)",
		items: ["Data controller: paragify.com", "Privacy contact email: privacy@paragify.com"],
	},
	{
		title: "2) Types of data we collect",
		intro: "We collect data on a “need-to-use” basis depending on the features you use:",
		subSections: [
			{
				heading: "(A) Account and contact data (sign-in/account management)",
				items: ["Email, phone (if you provide it), display name/nickname", "Third-party sign-in identifiers (Apple / Google account IDs; we do not obtain your third-party passwords)", "Account status, preferences, language/region settings"],
			},
			{
				heading: "(B) Content and interaction data (listings/messages/usage)",
				items: [
					"Listing content: vehicle details, descriptions, photos/videos (if any), contact methods (if you choose to share)",
					"In-app/site messages (including messages and attachments you exchange with other users/merchants)",
					"Interaction data: search terms, filters, saves, clicks, view history (used to improve ranking, recommendations, and product experience)",
				],
			},
			{
				heading: "(C) Device and technical data (web and App)",
				items: ["IP address, device model, operating system, browser type, App version, language settings", "Event logs, error/crash data (for stability and debugging)", "Cookies / local storage / similar technologies (see Section 6)"],
			},
			{
				heading: "(D) AI-related data (AI Search / AI photo recognition)",
				items: [
					"Text you enter into AI features (for example budget, year, brand/model preferences, use case)",
					"Photos you submit for AI recognition (or necessary technical features of the photo) and the recognition output",
					"We recommend avoiding unnecessary sensitive personal data in AI prompts or uploaded photos.",
				],
			},
			{
				heading: "(E) Payment and transaction data (if you purchase paid features/subscriptions)",
				items: [
					"Transaction info returned by platforms or payment processors (for example transaction ID, purchase time, subscription status, expiry/cancel status)",
					"We generally do not collect or store your full card number; payments are processed by the App Store / Google Play (and/or third-party processors on the website, if applicable).",
				],
			},
			{
				heading: "(F) Support, compliance, and security data",
				items: ["Customer support exchanges, complaints/reports", "Records for anti-fraud and security (for example suspicious logins, abuse, spam content, prohibited listings)"],
			},
		],
	},
	{
		title: "3) How we collect data",
		items: [
			"You provide it directly: registration, login, listing, uploading photos/content, in-app/site messages, support requests",
			"Automatically: device/browser data, logs, interaction and usage data, cookies",
			"From third parties: sign-in providers (identifiers), payment platforms (transaction status), analytics/crash tools (events and diagnostics)",
		],
	},
	{
		title: "4) How we use data",
		items: [
			"Provide and operate the services: create accounts, login verification, listing management, messaging, search, saves",
			"Improve product and experience: analyze usage, optimize ranking/recommendations, improve speed and stability",
			"Support AI features: process AI Search and AI photo recognition requests, return results, improve these features",
			"Security, risk control, and abuse prevention: detect suspicious behavior, stop spam/fraud, protect users and the platform",
			"Support and communications: respond to inquiries, handle complaints, send necessary service notices (for example security alerts, important updates)",
			"Marketing (where allowed): send product updates, feature tests, promotions; you can opt out at any time",
			"Legal and compliance: follow applicable laws, handle disputes, enforce terms and policies",
		],
	},
	{
		title: "5) Who we share data with",
		intro: "We only share data when reasonably needed, typically in these cases:",
		subSections: [
			{
				heading: "(A) Service providers (contract-bound)",
				items: [
					"To operate the service we may use third-party providers for cloud hosting, CDN, analytics, crash reporting, authentication, push notifications, support tooling, and security monitoring. Providers may process data only under our instructions and to deliver the service.",
				],
			},
			{ heading: "(B) Sign-in providers", items: ["If you sign in with Apple / Google, your sign-in is handled by the provider and necessary identifiers are returned."] },
			{
				heading: "(C) Analytics and stability tools",
				items: [
					"We may use one or more analytics/crash tools (for example Google Analytics, Firebase, PostHog, Cloudflare Web Analytics or similar) to understand usage and improve stability. You can manage cookies/consent per Section 6 or in-app settings where offered.",
				],
			},
			{ heading: "(D) Push notification providers", items: ["If you enable notifications, we use APNs and/or FCM to deliver them, which need device IDs/push tokens."] },
			{
				heading: "(E) Payment and subscription platforms/processors",
				items: ["In-app purchases are handled by App Store / Google Play (and/or third-party processors on web if applicable); we do not ask you to store full card numbers."],
			},
			{ heading: "(F) Legal requirements and business changes", items: ["When required by law, court order, or authorities; or during mergers, acquisitions, or reorganizations with appropriate safeguards."] },
		],
		note: "We do not sell your personal data to third parties for their independent marketing purposes.",
	},
	{
		title: "6) Cookies, tracking technologies, and choices (web)",
		items: ["We may use cookies/local storage/similar technologies for:", "Essential functions: login state, preferences, security", "Analytics and performance: usage insights, measurement, stability and experience improvements", "You can manage/delete cookies in your browser; disabling essentials may break some functions."],
		note: "If you have a consent banner/preferences center, mention that users can change consent there.",
	},
	{
		title: "7) Data retention",
		intro: "We keep data only as long as necessary for the purposes or to meet legal requirements, then delete or anonymize. Typical practices:",
		items: [
			"Account data: while the account exists; deleted/anonymized within a reasonable time after closure (unless needed for legal/dispute handling)",
			"Listing and message data: retained as reasonably needed to provide the service, handle disputes, prevent abuse, and comply",
			"Security/audit logs: retained for a limited period to detect abuse and troubleshoot (for example 90–180 days internally)",
		],
	},
	{ title: "8) Data security", items: ["We use reasonable technical/organizational measures (for example encrypted transit, access controls, least privilege, monitoring, redundancy)."] },
	{
		title: "9) Cross-border transfers",
		items: [
			"Because we may use cloud/services outside Hong Kong, your data may be processed or stored outside Hong Kong. We apply contractual/technical safeguards to require reasonable protection.",
		],
	},
	{
		title: "10) Your rights and how to exercise them",
		intro: `Contact us at ${contactEmail} to exercise or inquire about:`,
		items: ["Access and correction", "Delete/close account (where legally allowed and without affecting compliance)", "Withdraw consent or opt out of marketing (if applicable)"],
	},
	{ title: "11) Minors", items: ["The services are mainly for adults. Under-18 users should have guardian consent/supervision and avoid unnecessary personal data."] },
	{ title: "12) Third-party links and content", items: ["Services may contain third-party links or vehicle info/photos/descriptions from third parties. Their handling is outside our control; please review their privacy policies."] },
	{
		title: "13) Policy updates",
		items: ["We may update this policy for legal, technical, or service changes. Material changes will be notified via site/app/ email (where applicable). Updates take effect when announced; continued use means acceptance."],
	},
	{ title: "14) Contact us", intro: "If you have questions about this policy or data handling, please contact us." },
];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	const { locale } = await params;
	const isEn = locale.toLowerCase() === "en";
	const url = isEn ? "https://paragify.com/en/privacy-policy" : "https://paragify.com/zh/privacy-policy";
	const title = isEn ? "Privacy Policy | Paragify Hong Kong" : "隱私權政策 | Paragify 香港";
	const description = isEn
		? "Paragify Privacy Policy for paragify.com and the Paragify App. Learn how we collect, use, share, and protect your data, plus how to exercise your rights."
		: "Paragify 私隱政策（適用於 paragify.com 及 Paragify App），涵蓋資料收集、使用、分享與權利行使。";
	return {
		title,
		description,
		alternates: { canonical: url },
		openGraph: { url, title, description },
		twitter: { card: "summary", title, description },
	};
}

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const isEn = locale.toLowerCase() === "en";
	const sections = isEn ? sectionsEn : sectionsZh;
	const pathPrefix = isEn ? "/en" : "/zh";

	return (
		<main className="relative min-h-screen text-[color:var(--txt-1)]">
			<div className="pointer-events-none fixed inset-0 -z-10" style={{ backgroundColor: "var(--bg-1)", backgroundImage: "var(--page-bg-gradient)" }} />

			<div className="mx-auto max-w-4xl px-6 py-10 sm:px-10 lg:px-16">
				<div className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-8 shadow-sm sm:p-10">
					<div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color:var(--txt-3)]">{isEn ? "Privacy Policy" : "Privacy Policy"}</div>
					<h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--txt-1)] sm:text-4xl">
						{isEn ? "Paragify Privacy Policy (for paragify.com and Paragify App)" : "Paragify 私隱政策（適用於 paragify.com 及 Paragify App）"}
					</h1>
					<p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--txt-2)] sm:text-base">
						{isEn
							? "This policy explains how paragify.com (“we”) collects, uses, discloses, stores, and protects personal data when you use paragify.com and the Paragify App (the “Services”), and how you can exercise your rights."
							: "本私隱政策（「本政策」）說明 paragify.com（「我們」）在你使用 paragify.com 及 Paragify App（統稱「服務」）時，如何收集、使用、披露、保存及保護個人資料，以及你可如何行使相關權利。"}
					</p>
					<p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--txt-2)] sm:text-base">
						{isEn ? "If you do not agree with any part of this policy, please stop using the Services." : "如你不同意本政策的任何部分，請停止使用服務。"}
					</p>
					<div className="mt-4 text-xs text-[color:var(--txt-3)]">
						{isEn ? "Last updated: " : "最後更新日期： "}
						{lastUpdated}
					</div>
				</div>

				<div className="mt-8 space-y-5">
					{sections.map((section) => (
						<section key={section.title} className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-6 shadow-sm">
							<h2 className="text-xl font-semibold tracking-tight text-[color:var(--txt-1)]">{section.title}</h2>
							{section.intro ? <p className="mt-3 text-sm leading-relaxed text-[color:var(--txt-2)] sm:text-base">{section.intro}</p> : null}
							{section.items ? (
								<ul className="mt-3 space-y-2 text-sm leading-relaxed text-[color:var(--txt-2)] sm:text-base">
									{section.items.map((item) => (
										<li key={item} className="flex gap-3">
											<span className="mt-[6px] inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--accent-1)]" aria-hidden />
											<span className="flex-1">{item}</span>
										</li>
									))}
								</ul>
							) : null}
							{section.subSections
								? section.subSections.map((sub) => (
										<div key={sub.heading} className="mt-4 space-y-2">
											<div className="text-sm font-semibold text-[color:var(--txt-1)] sm:text-base">{sub.heading}</div>
											<ul className="space-y-2 text-sm leading-relaxed text-[color:var(--txt-2)] sm:text-base">
												{sub.items.map((item) => (
													<li key={item} className="flex gap-3">
														<span className="mt-[6px] inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--accent-1)]" aria-hidden />
														<span className="flex-1">{item}</span>
													</li>
												))}
											</ul>
										</div>
									))
								: null}
							{section.note ? <p className="mt-3 text-xs leading-relaxed text-[color:var(--txt-3)] sm:text-sm">{section.note}</p> : null}
							{section.title.startsWith("14)") ? (
								<p className="mt-3 text-sm leading-relaxed text-[color:var(--txt-2)] sm:text-base">
									{isEn ? "If you have questions about this policy or data handling, please contact " : "如你對本政策或資料處理有任何疑問，請聯絡 "}
									<a href={`mailto:${contactEmail}`} className="font-semibold text-[color:var(--accent-1)] underline decoration-[color:var(--accent-1)]/60 decoration-2 underline-offset-4 hover:text-[color:var(--accent-2)]">
										{contactEmail}
									</a>
									。
								</p>
							) : null}
						</section>
					))}
				</div>

				<div className="mt-10 text-sm text-[color:var(--txt-3)]">
					<Link href={pathPrefix === "/en" ? "/zh/privacy-policy" : "/en/privacy-policy"} className="underline decoration-[color:var(--accent-1)]/60 decoration-2 underline-offset-4 hover:text-[color:var(--accent-1)]">
						{isEn ? "View Traditional Chinese version" : "View English version"}
					</Link>
				</div>
			</div>
		</main>
	);
}
