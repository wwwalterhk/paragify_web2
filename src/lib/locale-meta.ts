export const DEFAULT_HTML_LANG = "en";

const OPEN_GRAPH_LOCALE_DEFAULTS: Record<string, string> = {
	en: "en_US",
	ja: "ja_JP",
	zh: "zh_HK",
};

export function normalizeHtmlLangTag(value: string | null | undefined): string {
	const normalized = value?.trim().replace(/_/g, "-") ?? "";
	if (!normalized) {
		return DEFAULT_HTML_LANG;
	}

	const segments = normalized
		.split("-")
		.map((segment) => segment.trim())
		.filter(Boolean);
	if (segments.length === 0) {
		return DEFAULT_HTML_LANG;
	}

	return segments
		.map((segment, index) => {
			if (index === 0) {
				return segment.toLowerCase();
			}
			if (/^[A-Za-z]{4}$/.test(segment)) {
				return `${segment.charAt(0).toUpperCase()}${segment.slice(1).toLowerCase()}`;
			}
			if (/^[A-Za-z]{2}$/.test(segment) || /^\d{3}$/.test(segment)) {
				return segment.toUpperCase();
			}
			return segment.toLowerCase();
		})
		.join("-");
}

export function normalizeAppLocaleToHtmlLang(value: string | null | undefined): string {
	const normalized = value?.trim().toLowerCase() ?? "";
	if (normalized === "zh") {
		return "zh-HK";
	}
	if (normalized === "ja") {
		return "ja-JP";
	}
	if (normalized === "en") {
		return "en";
	}
	return normalizeHtmlLangTag(value);
}

export function normalizeOpenGraphLocale(value: string | null | undefined): string {
	const htmlLang = normalizeHtmlLangTag(value);
	const [language = DEFAULT_HTML_LANG, ...rest] = htmlLang.split("-");
	const normalizedLanguage = language.toLowerCase();
	const region = rest.find((segment) => /^[A-Z]{2}$/.test(segment) || /^\d{3}$/.test(segment));
	if (region) {
		return `${normalizedLanguage}_${region.toUpperCase()}`;
	}

	return OPEN_GRAPH_LOCALE_DEFAULTS[normalizedLanguage] ?? htmlLang.replace(/-/g, "_");
}
