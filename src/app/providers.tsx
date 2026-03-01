"use client";

import { NextIntlClientProvider } from "next-intl";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import enMessages from "@/messages/en.json";
import zhMessages from "@/messages/zh.json";

type AppProvidersProps = {
	children: ReactNode;
};

function resolveLocaleFromPath(pathname: string | null): "en" | "zh" {
	if (!pathname) {
		return "en";
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

	// Keep existing auth pages defaulting to Chinese when no locale segment is provided.
	if (pathname === "/auth" || pathname.startsWith("/auth/")) {
		return "zh";
	}

	return "en";
}

export function AppProviders({ children }: AppProvidersProps) {
	const pathname = usePathname();
	const locale = resolveLocaleFromPath(pathname);
	const messages = locale === "zh" ? zhMessages : enMessages;

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
