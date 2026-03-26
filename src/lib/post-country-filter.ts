export const POST_COUNTRY_FILTER_OPTIONS = [
	{ code: "us", label: "United States", flag: "🇺🇸", localeValues: ["en-us"] },
	{ code: "uk", label: "United Kingdom", flag: "🇬🇧", localeValues: ["en-uk", "en-gb"] },
	{ code: "hk", label: "Hong Kong", flag: "🇭🇰", localeValues: ["zh-hk"] },
	{ code: "tw", label: "Taiwan", flag: "🇹🇼", localeValues: ["zh-tw"] },
	{ code: "jp", label: "Japan", flag: "🇯🇵", localeValues: ["ja-jp", "ja"] },
] as const;

export type PostCountryCode = (typeof POST_COUNTRY_FILTER_OPTIONS)[number]["code"];

export const DEFAULT_POST_COUNTRY_CODE: PostCountryCode = "us";

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

export function getPostCountryLabel(countryCode: PostCountryCode): string {
	return POST_COUNTRY_FILTER_OPTIONS.find((option) => option.code === countryCode)?.label ?? "United States";
}

export function getPostCountryFlag(countryCode: PostCountryCode): string {
	return POST_COUNTRY_FILTER_OPTIONS.find((option) => option.code === countryCode)?.flag ?? "🇺🇸";
}

export function getPostCountryLocaleValues(countryCode: PostCountryCode): readonly string[] {
	return POST_COUNTRY_FILTER_OPTIONS.find((option) => option.code === countryCode)?.localeValues ?? ["en-us"];
}
