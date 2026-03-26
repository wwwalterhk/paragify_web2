import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
	getPostCountryPageLocale,
	POST_COUNTRY_COOKIE_KEY,
	resolvePostCountrySelection,
} from "@/lib/post-country-filter";

const APP_LOCALE_HEADER = "x-app-locale";
const APP_CONTEXT_HEADER = "x-app-context";
const REQUEST_PATHNAME_HEADER = "x-paragify-pathname";

function readLocaleOverride(request: NextRequest): "en" | "zh" | "ja" | null {
	const rawValue = request.nextUrl.searchParams.get("locale")?.trim().toLowerCase();
	if (rawValue === "en" || rawValue === "zh" || rawValue === "ja") {
		return rawValue;
	}
	return null;
}

function resolveAppLocale(pathname: string, localeOverride: "en" | "zh" | "ja" | null): "en" | "zh" | "ja" {
	const localeMatch = pathname.match(/\/(en|zh|ja)(\/|$)/);
	if (pathname === "/" && localeOverride) {
		return localeOverride;
	}
	if (localeMatch?.[1] === "en" || localeMatch?.[1] === "zh" || localeMatch?.[1] === "ja") {
		return localeMatch[1];
	}
	if (pathname === "/auth" || pathname.startsWith("/auth/")) {
		return "zh";
	}
	return "en";
}

function resolveAppContext(pathname: string): string {
	const contextMatch = pathname.match(/^\/([^/\s]+)/);
	return contextMatch?.[1] ?? "root";
}

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const localeOverride = readLocaleOverride(request);
	const countryParam = request.nextUrl.searchParams.get("country") ?? undefined;
	const countryCookie = request.cookies.get(POST_COUNTRY_COOKIE_KEY)?.value;
	const countryCode = resolvePostCountrySelection(countryParam, countryCookie);
	const countryLocale = getPostCountryPageLocale(countryCode);

	if (/^\/(en|zh|ja)\/?$/.test(pathname)) {
		const nextLocale = pathname.replaceAll("/", "") as "en" | "zh" | "ja";
		const redirectUrl = request.nextUrl.clone();
		redirectUrl.pathname = "/";
		redirectUrl.searchParams.set("locale", nextLocale);
		return NextResponse.redirect(redirectUrl, 307);
	}

	const requestHeaders = new Headers(request.headers);
	requestHeaders.set(REQUEST_PATHNAME_HEADER, pathname);
	requestHeaders.set(APP_LOCALE_HEADER, pathname === "/" && !localeOverride ? countryLocale : resolveAppLocale(pathname, localeOverride));
	requestHeaders.set(APP_CONTEXT_HEADER, resolveAppContext(pathname));

	const response = NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	});

	if (countryParam?.trim()) {
		response.cookies.set(POST_COUNTRY_COOKIE_KEY, countryCode, {
			path: "/",
			sameSite: "lax",
		});
	}

	return response;
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)"],
};
