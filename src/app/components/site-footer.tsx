import Link from "next/link";

type Locale = "en" | "zh";

const SITE_NAME = "Paragify";

export function SiteFooter({ locale = "en" }: { locale?: Locale }) {
	const year = new Date().getFullYear();
	const isEn = locale === "en";
	const localePrefix = `/${locale}`;
	const t = isEn
		? {
				home: "Home",
				feed: "Feed",
				create: "Create",
				tools: "Tools",
				privacy: "Privacy Policy",
				terms: "Terms",
				accountDeletion: "Account Deletion",
				rights: "All rights reserved.",
		  }
		: {
				home: "首頁",
				feed: "Feed",
				create: "發佈",
				tools: "工具",
				privacy: "私隱政策",
				terms: "使用條款",
				accountDeletion: "刪除帳戶",
				rights: "保留所有權利。",
		  };

	return (
		<footer className="mt-12">
			<div className="border-t border-[color:var(--surface-border)] bg-[color:var(--bg-1)]/60">
				<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
					<div className="flex flex-wrap items-center justify-between gap-6">
						<div className="text-xs uppercase tracking-[0.22em] text-[color:var(--txt-3)]">{SITE_NAME}</div>

						<nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
							<Link href="/" className="text-[color:var(--txt-2)] transition hover:text-[color:var(--txt-1)]">
								{t.home}
							</Link>
							<Link href="/feed" className="text-[color:var(--txt-2)] transition hover:text-[color:var(--txt-1)]">
								{t.feed}
							</Link>
							<Link href="/add-post" className="text-[color:var(--txt-2)] transition hover:text-[color:var(--txt-1)]">
								{t.create}
							</Link>
							<Link href="/turnstitle-form" className="text-[color:var(--txt-2)] transition hover:text-[color:var(--txt-1)]">
								{t.tools}
							</Link>
						</nav>
					</div>

					<div className="mt-8 border-t border-[color:var(--surface-border)] pt-6">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="text-xs text-[color:var(--txt-3)]">
								© {year} {SITE_NAME}. {t.rights}
							</div>

							<nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
								<Link
									href={`${localePrefix}/privacy-policy`}
									className="text-[color:var(--txt-2)] transition hover:text-[color:var(--txt-1)]"
								>
									{t.privacy}
								</Link>
								<Link
									href={`${localePrefix}/terms`}
									className="text-[color:var(--txt-2)] transition hover:text-[color:var(--txt-1)]"
								>
									{t.terms}
								</Link>
								<Link
									href={`${localePrefix}/account-deletion`}
									className="text-[color:var(--txt-2)] transition hover:text-[color:var(--txt-1)]"
								>
									{t.accountDeletion}
								</Link>
							</nav>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
