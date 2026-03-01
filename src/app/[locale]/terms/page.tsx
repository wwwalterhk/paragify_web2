import type { Metadata } from "next";

type Section = { title: string; items: string[] };

const contactEmail = "support@paragify.com";
const updatedDate = "2026-01-12";

const copy = {
	zh: {
		metaTitle: "使用條款 | Paragify 香港",
		metaDesc: "paragify.com 及 Paragify App 的使用條款，涵蓋帳戶、內容、免責、責任限制、使用規範與終止等條款。",
		pill: "Terms",
		heading: "Paragify 使用條款",
		intro: "本條款規範你使用 paragify.com 及 Paragify App（「服務」）。使用服務即表示同意本條款；如不同意，請停止使用。",
		updatedLabel: "最後更新日期",
		sections: [
			{
				title: "1) 適用範圍",
				items: [
					"本條款適用於你使用 paragify.com 及 Paragify App（以下統稱「服務」）。",
					"使用服務即表示你同意本條款及日後更新版本；不同意者請停止使用。",
				],
			},
			{
				title: "2) 帳戶與安全",
				items: [
					"你須確保註冊資料真實、完整並保持更新，並為帳戶行為負責。",
					"妥善保管登入憑證；如發現未經授權使用，請立即通知我們。",
				],
			},
			{
				title: "3) 內容與授權",
				items: [
					"你提交的刊登、相片、描述等內容須擁有合法授權，且不得侵犯第三方權利。",
					"你授予我們在提供和推廣服務時非獨家的全球可使用權（僅限於展示、儲存、轉碼及必要的技術處理）。",
					"我們可按政策移除違規或不當內容。",
				],
			},
			{
				title: "4) 禁止行為",
				items: [
					"不得上載或傳送非法、詐騙、誤導、侵權、色情或暴力內容。",
					"不得濫用服務進行垃圾訊息、抓取、逆向工程、干擾系統或未經授權的自動化存取。",
					"不得冒充他人或偽造身份、來源或憑證。",
				],
			},
			{
				title: "5) 交易與第三方",
				items: [
					"車輛資訊可能來自第三方，僅供參考；實際交易細節請與賣家直接確認。",
					"我們不參與或保證買賣雙方的交易結果，亦不對第三方網站內容負責。",
				],
			},
			{
				title: "6) 資料與私隱",
				items: ["個人資料的收集與使用受《隱私權政策》約束；請同時參閱該政策。"],
			},
			{
				title: "7) 服務變更與中止",
				items: [
					"我們可因營運、技術或安全原因變更、暫停或終止全部或部分服務。",
					"如你違反條款或有濫用風險，我們可限制或終止你的帳戶。",
				],
			},
			{
				title: "8) 免責與責任限制",
				items: [
					"服務按「現狀」提供，不保證不中斷、無錯誤或符合特定目的。",
					"在法律允許範圍內，我們對於使用服務所致的間接、附帶或衍生損失不承擔責任。",
				],
			},
			{
				title: "9) 適用法律與爭議解決",
				items: ["本條款受香港法律管轄。", "如有爭議，雙方應先友好協商；未果時提交香港法院解決。"],
			},
			{
				title: "10) 聯絡我們",
				items: [`如有查詢，請聯絡 ${contactEmail}。`],
			},
		] as Section[],
	},
	en: {
		metaTitle: "Terms of Use | Paragify Hong Kong",
		metaDesc: "Terms of use for paragify.com and the Paragify App, covering accounts, content, disclaimers, liability limits, acceptable use, and termination.",
		pill: "Terms",
		heading: "Paragify Terms of Use",
		intro: "These terms govern your use of paragify.com and the Paragify App (the “Service”). By using the Service, you agree to these terms; if you disagree, please stop using it.",
		updatedLabel: "Last updated",
		sections: [
			{
				title: "1) Scope",
				items: [
					"These terms apply to your use of paragify.com and the Paragify App (the “Service”).",
					"Using the Service means you accept these terms and future updates; if not, stop using it.",
				],
			},
			{
				title: "2) Account & security",
				items: [
					"Provide accurate, up-to-date registration info and take responsibility for activity under your account.",
					"Keep credentials secure; notify us immediately if you suspect unauthorized use.",
				],
			},
			{
				title: "3) Content & license",
				items: [
					"Content you submit (listings, photos, descriptions) must be properly authorized and not infringe others’ rights.",
					"You grant us a non-exclusive, worldwide license to display, store, transcode, and technically process such content to operate and promote the Service.",
					"We may remove content that violates policies or is inappropriate.",
				],
			},
			{
				title: "4) Prohibited conduct",
				items: [
					"Do not upload or transmit illegal, fraudulent, misleading, infringing, pornographic, or violent content.",
					"Do not abuse the Service with spam, scraping, reverse engineering, system interference, or unauthorized automated access.",
					"Do not impersonate others or falsify identity, origin, or credentials.",
				],
			},
			{
				title: "5) Transactions & third parties",
				items: [
					"Vehicle data may come from third parties and is for reference only; confirm transaction details directly with sellers.",
					"We do not participate in or guarantee transaction outcomes between buyers and sellers and are not responsible for third-party content.",
				],
			},
			{
				title: "6) Data & privacy",
				items: ["Personal data collection/use is governed by our Privacy Policy; please review it too."],
			},
			{
				title: "7) Changes & suspension",
				items: [
					"We may change, suspend, or end all or part of the Service for operational, technical, or security reasons.",
					"We may restrict or terminate your account if you violate these terms or pose an abuse risk.",
				],
			},
			{
				title: "8) Disclaimers & liability limits",
				items: [
					"The Service is provided “as is” without warranties of uninterrupted or error-free operation or fitness for a particular purpose.",
					"To the extent allowed by law, we are not liable for indirect, incidental, or consequential losses arising from use of the Service.",
				],
			},
			{
				title: "9) Governing law & disputes",
				items: [
					"These terms are governed by Hong Kong law.",
					"Disputes should first be amicably resolved; failing that, submit to Hong Kong courts.",
				],
			},
			{
				title: "10) Contact us",
				items: [`For queries, contact ${contactEmail}.`],
			},
		] as Section[],
	},
};

function mapLocale(locale: string) {
	const isEn = locale.toLowerCase() === "en";
	return { lang: isEn ? ("en" as const) : ("zh" as const), pathPrefix: isEn ? "/en" : "/zh" };
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { locale } = await params;
	const { lang, pathPrefix } = mapLocale(locale);
	const t = copy[lang];
	const url = `https://paragify.com${pathPrefix}/terms`;
	return {
		title: t.metaTitle,
		description: t.metaDesc,
		alternates: { canonical: url },
		openGraph: { url, title: t.metaTitle, description: t.metaDesc },
		twitter: { card: "summary", title: t.metaTitle, description: t.metaDesc },
	};
}

export default async function TermsPage({ params }: PageProps) {
	const { locale } = await params;
	const { lang } = mapLocale(locale);
	const t = copy[lang];

	return (
		<main className="relative min-h-screen text-[color:var(--txt-1)]">
			<div
				className="pointer-events-none fixed inset-0 -z-10"
				style={{
					backgroundColor: "var(--bg-1)",
					backgroundImage: "var(--page-bg-gradient)",
				}}
			/>

			<div className="mx-auto max-w-4xl px-6 py-10 sm:px-10 lg:px-16">
				<div className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-8 shadow-sm sm:p-10">
					<div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color:var(--txt-3)]">{t.pill}</div>
					<h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--txt-1)] sm:text-4xl">{t.heading}</h1>
					<p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--txt-2)] sm:text-base">{t.intro}</p>
					<div className="mt-4 text-xs text-[color:var(--txt-3)]">
						{t.updatedLabel}： {updatedDate}
					</div>
				</div>

				<div className="mt-8 space-y-5">
					{t.sections.map((section) => (
						<section
							key={section.title}
							className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-6 shadow-sm"
						>
							<h2 className="text-xl font-semibold tracking-tight text-[color:var(--txt-1)]">{section.title}</h2>
							<ul className="mt-3 space-y-2 text-sm leading-relaxed text-[color:var(--txt-2)] sm:text-base">
								{section.items.map((item) => (
									<li key={item} className="flex gap-3">
										<span className="mt-[6px] inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--accent-1)]" aria-hidden />
										<span className="flex-1">{item}</span>
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			</div>
		</main>
	);
}
