export const POST_COUNTRY_FILTER_OPTIONS = [
	{ code: "us", label: "United States", flag: "🇺🇸", localeValues: ["en-us"] },
	{ code: "uk", label: "United Kingdom", flag: "🇬🇧", localeValues: ["en-uk", "en-gb"] },
	{ code: "hk", label: "Hong Kong", flag: "🇭🇰", localeValues: ["zh-hk"] },
	{ code: "tw", label: "Taiwan", flag: "🇹🇼", localeValues: ["zh-tw"] },
	{ code: "jp", label: "Japan", flag: "🇯🇵", localeValues: ["ja-jp", "ja"] },
] as const;

export type PostCountryCode = (typeof POST_COUNTRY_FILTER_OPTIONS)[number]["code"];
export type PostCountryMessageVariant = "en-us" | "en-uk" | "zh-hk" | "zh-tw" | "ja-jp";
export type PostCountryPageLocale = "en" | "zh" | "ja";

export const DEFAULT_POST_COUNTRY_CODE: PostCountryCode = "us";
export const POST_COUNTRY_COOKIE_KEY = "paragify_country";

const COUNTRY_CODE_SET = new Set<PostCountryCode>(POST_COUNTRY_FILTER_OPTIONS.map((option) => option.code));

export function normalizePostLocaleFilterValue(value: string | null | undefined): string {
	return value?.trim().toLowerCase().replace(/_/g, "-") ?? "";
}

export function readPostCountryParam(value: string | string[] | undefined): PostCountryCode {
	const rawValue = Array.isArray(value) ? value[0] : value;
	const normalizedValue = rawValue?.trim().toLowerCase() ?? "";
	return COUNTRY_CODE_SET.has(normalizedValue as PostCountryCode)
		? (normalizedValue as PostCountryCode)
		: DEFAULT_POST_COUNTRY_CODE;
}

export function resolvePostCountrySelection(
	paramValue: string | string[] | undefined,
	cookieValue: string | null | undefined,
): PostCountryCode {
	const rawParamValue = Array.isArray(paramValue) ? paramValue[0] : paramValue;
	if (rawParamValue?.trim()) {
		return readPostCountryParam(rawParamValue);
	}
	return readPostCountryParam(cookieValue ?? undefined);
}

export function getPostCountryLabel(countryCode: PostCountryCode): string {
	return POST_COUNTRY_FILTER_OPTIONS.find((option) => option.code === countryCode)?.label ?? "United States";
}

export function getPostCountryFlag(countryCode: PostCountryCode): string {
	return POST_COUNTRY_FILTER_OPTIONS.find((option) => option.code === countryCode)?.flag ?? "🇺🇸";
}

export function getPostCountryLocaleValues(countryCode: PostCountryCode): readonly string[] {
	return POST_COUNTRY_FILTER_OPTIONS.find((option) => option.code === countryCode)?.localeValues ?? ["en-us"];
}

export function getPostCountryMessageVariant(countryCode: PostCountryCode): PostCountryMessageVariant {
	switch (countryCode) {
		case "uk":
			return "en-uk";
		case "hk":
			return "zh-hk";
		case "tw":
			return "zh-tw";
		case "jp":
			return "ja-jp";
		case "us":
		default:
			return "en-us";
	}
}

export function getPostCountryPageLocale(countryCode: PostCountryCode): PostCountryPageLocale {
	switch (countryCode) {
		case "hk":
		case "tw":
			return "zh";
		case "jp":
			return "ja";
		case "us":
		case "uk":
		default:
			return "en";
	}
}
