"use client";

import { NextIntlClientProvider } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import enMessages from "@/messages/en.json";
import jaMessages from "@/messages/ja.json";
import zhMessages from "@/messages/zh.json";

type AppProvidersProps = {
	children: ReactNode;
	initialLocale?: "en" | "zh" | "ja";
};

function resolveLocaleFromPath(
	pathname: string | null,
	searchLocale: string | null,
	initialLocale: "en" | "zh" | "ja",
): "en" | "zh" | "ja" {
	if (!pathname) {
		return searchLocale === "ja" ? "ja" : searchLocale === "zh" ? "zh" : initialLocale;
	}

	if (pathname === "/ja" || pathname.startsWith("/ja/")) {
		return "ja";
	}

	if (pathname === "/en" || pathname.startsWith("/en/")) {
		return "en";
	}

	if (pathname === "/zh" || pathname.startsWith("/zh/")) {
		return "zh";
	}

	if (pathname === "/auth/en" || pathname.startsWith("/auth/en/")) {
		return "en";
	}

	if (pathname === "/auth/zh" || pathname.startsWith("/auth/zh/")) {
		return "zh";
	}

	if (pathname === "/auth/ja" || pathname.startsWith("/auth/ja/")) {
		return "ja";
	}

	// Keep existing auth pages defaulting to Chinese when no locale segment is provided.
	if (pathname === "/auth" || pathname.startsWith("/auth/")) {
		return "zh";
	}

	if (searchLocale === "ja") {
		return "ja";
	}

	if (searchLocale === "zh") {
		return "zh";
	}

	return initialLocale;
}

export function AppProviders({ children, initialLocale = "en" }: AppProvidersProps) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const searchLocale = searchParams.get("locale")?.trim().toLowerCase() ?? null;
	const locale = resolveLocaleFromPath(pathname, searchLocale, initialLocale);
	const messages = locale === "zh" ? zhMessages : locale === "ja" ? jaMessages : enMessages;

	return (
		<NextIntlClientProvider
			locale={locale}
			messages={messages}
			onError={() => {
				// Keep UI usable while incrementally adding translations.
			}}
			getMessageFallback={({ namespace, key }) => `${namespace}.${key}`}
		>
			{children}
		</NextIntlClientProvider>
	);
}
