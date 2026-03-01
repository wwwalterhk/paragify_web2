import { CSSProperties } from "react";
import {
	BACKGROUND_EFFECT_OPTIONS,
	BACKGROUND_EFFECT_PRESET_STYLES,
	BackgroundEffectPreset,
	CDN_MEDIA_BASE_URL,
	COVER_DESIGNER_TEMPLATE_CONFIG,
	COVER_DESIGNER_TEMPLATE_OPTIONS,
	CoverDesignerDraft,
	CoverDesignerMediaSlotState,
	CoverDesignerMediaState,
	CoverDesignerTemplateId,
	CoverInlineCropDragState,
	CropTarget,
	CroppedPostPage,
	DEFAULT_COVER_DESIGNER_DRAFT,
	DEFAULT_COVER_DESIGNER_TEMPLATE_ID,
	DEFAULT_ELEMENT_MARGIN_PX,
	DEFAULT_ELEMENT_PADDING_PX,
	DEFAULT_MEDIA_ELEMENT_CORNER_RADIUS_PX,
	DEFAULT_PAGE_CONTAINER_PADDING_PX,
	DEFAULT_PAGE_SCALE,
	DEFAULT_TEMPLATE_ID,
	DEFAULT_TEXT_ALIGNMENTS,
	DEFAULT_TEXT_EFFECTS,
	DEFAULT_TEXT_ELEMENT_STYLE,
	EDIT_MODE_LAYOUT_BASE_HEIGHT_PX,
	EDIT_MODE_LAYOUT_BASE_WIDTH_PX,
	EDIT_MODE_LAYOUT_UNIT_SCALE,
	EDIT_MODE_SPACING_SCALE_TRIGGER_PX,
	ELEMENT_CORNER_RADIUS_OPTIONS_PX,
	ELEMENT_MARGIN_OPTIONS_PX,
	ELEMENT_MARGIN_SIDES,
	ELEMENT_PADDING_OPTIONS_PX,
	ElementMarginSide,
	ExistingPostApiResponse,
	HASHTAG_SEGMENT_PATTERN,
	HASHTAG_SPLIT_PATTERN,
	InlineCropDragMode,
	InlineCropDragState,
	MediaElementForm,
	MediaFitMode,
	ORIGINAL_IMAGE_UPLOAD_JPEG_QUALITY,
	ORIGINAL_IMAGE_UPLOAD_MAX_HEIGHT_PX,
	PAGE_CONTAINER_PADDING_OPTIONS_PX,
	PAGE_CONTAINER_PADDING_SIDES,
	PAGE_ELEMENT_LABEL,
	PAGE_ELEMENT_ORDER,
	PAGE_SCALE_DIMENSIONS,
	PAGE_SCALE_OPTIONS,
	POST_TEMPLATES,
	PREVIEW_HEADING_CLASS,
	PageContainerPaddingSide,
	PageElementKey,
	PageElementType,
	PageScaleRatio,
	PostForm,
	PostPageForm,
	PostTemplate,
	PostTemplateId,
	PreviewDraggableElement,
	PreviewMarginDragState,
	TEXT_ALIGNMENT_OPTIONS,
	TEXT_BACKGROUND_MODE_OPTIONS,
	TEXT_BACKGROUND_TRANSLUCENCY_OPTIONS,
	TEXT_EFFECT_OPTIONS,
	TEXT_EFFECT_STYLES,
	TEXT_ELEMENT_STYLE_LABEL,
	TEXT_STYLE_OPTIONS,
	TemplateElementStyle,
	TemplateHashtagStyle,
	TextAlignment,
	TextBackgroundMode,
	TextEffectPreset,
	TextElementStyle,
	UploadImageResponse,
	Visibility,
	createElementKey,
	createElementScopedDefaults,
	getElementTypeFromKey,
	isBackgroundEffectPresetValue,
	isMediaFitModeValue,
	isPageElementType,
	isPageScaleRatioValue,
	isTemplateId,
	isTextAlignmentValue,
	isTextEffectPresetValue,
	isTextElementStyleValue,
	isVisibilityValue,
} from "./editor-schema";
export function createDefaultMediaElementState(overrides?: Partial<MediaElementForm>): MediaElementForm {
	return {
		image_file: overrides?.image_file ?? null,
		image_preview_url: overrides?.image_preview_url ?? null,
		cropped_preview_url: overrides?.cropped_preview_url ?? null,
		media_url: overrides?.media_url ?? null,
		raw_media_url: overrides?.raw_media_url ?? null,
		width: overrides?.width ?? null,
		height: overrides?.height ?? null,
		media_crop_top_left_x: overrides?.media_crop_top_left_x ?? null,
		media_crop_top_left_y: overrides?.media_crop_top_left_y ?? null,
		media_crop_bottom_right_x: overrides?.media_crop_bottom_right_x ?? null,
		media_crop_bottom_right_y: overrides?.media_crop_bottom_right_y ?? null,
		media_fit_mode: overrides?.media_fit_mode ?? "width",
	};
}

export function createDefaultCoverDesignerMediaSlotState(
	overrides?: Partial<CoverDesignerMediaSlotState>,
): CoverDesignerMediaSlotState {
	return {
		image_file: overrides?.image_file ?? null,
		image_preview_url: overrides?.image_preview_url ?? null,
		cropped_preview_url: overrides?.cropped_preview_url ?? null,
		media_url: overrides?.media_url ?? null,
		raw_media_url: overrides?.raw_media_url ?? null,
		width: overrides?.width ?? null,
		height: overrides?.height ?? null,
		crop_top_left_x: overrides?.crop_top_left_x ?? null,
		crop_top_left_y: overrides?.crop_top_left_y ?? null,
		crop_bottom_right_x: overrides?.crop_bottom_right_x ?? null,
		crop_bottom_right_y: overrides?.crop_bottom_right_y ?? null,
	};
}

export function createInitialCoverDesignerMediaState(templateId: CoverDesignerTemplateId): CoverDesignerMediaState {
	const templateConfig = COVER_DESIGNER_TEMPLATE_CONFIG[templateId];
	const mediaBySlotId: CoverDesignerMediaState = {};
	for (const mediaSlot of templateConfig.mediaSlots) {
		mediaBySlotId[mediaSlot.id] = createDefaultCoverDesignerMediaSlotState();
	}
	return mediaBySlotId;
}

export const EMPTY_COVER_DESIGNER_MEDIA_SLOT_STATE = createDefaultCoverDesignerMediaSlotState();

export function getMediaElementKeys(page: PostPageForm): PageElementKey[] {
	return page.elements.filter((elementKey) => getElementTypeFromKey(elementKey) === "media");
}

export function getVisibleMediaElementKeys(page: PostPageForm): PageElementKey[] {
	return page.elements.filter((elementKey) => {
		return getElementTypeFromKey(elementKey) === "media" && !page.hiddenElements.includes(elementKey);
	});
}

export function getFirstMediaElementKey(page: PostPageForm): PageElementKey | null {
	for (const elementKey of page.elements) {
		if (getElementTypeFromKey(elementKey) === "media") {
			return elementKey;
		}
	}
	return null;
}

export function getMediaStateForElement(page: PostPageForm, elementKey: PageElementKey): MediaElementForm {
	const existing = page.media_by_element[elementKey];
	if (existing) {
		return existing;
	}

	if (getElementTypeFromKey(elementKey) !== "media") {
		return createDefaultMediaElementState();
	}

	return createDefaultMediaElementState({
		image_file: page.image_file,
		image_preview_url: page.image_preview_url,
		cropped_preview_url: page.cropped_preview_url,
		media_url: page.media_url,
		raw_media_url: page.raw_media_url,
		width: page.width,
		height: page.height,
		media_crop_top_left_x: page.media_crop_top_left_x,
		media_crop_top_left_y: page.media_crop_top_left_y,
		media_crop_bottom_right_x: page.media_crop_bottom_right_x,
		media_crop_bottom_right_y: page.media_crop_bottom_right_y,
		media_fit_mode: page.media_fit_mode,
	});
}

export function syncLegacyMediaFieldsFromPrimaryElement(page: PostPageForm): PostPageForm {
	const primaryMediaElementKey = getFirstMediaElementKey(page);
	const primaryMediaState = primaryMediaElementKey ? getMediaStateForElement(page, primaryMediaElementKey) : null;

	return {
		...page,
		image_file: primaryMediaState?.image_file ?? null,
		image_preview_url: primaryMediaState?.image_preview_url ?? null,
		cropped_preview_url: primaryMediaState?.cropped_preview_url ?? null,
		media_url: primaryMediaState?.media_url ?? null,
		raw_media_url: primaryMediaState?.raw_media_url ?? null,
		width: primaryMediaState?.width ?? null,
		height: primaryMediaState?.height ?? null,
		media_crop_top_left_x: primaryMediaState?.media_crop_top_left_x ?? null,
		media_crop_top_left_y: primaryMediaState?.media_crop_top_left_y ?? null,
		media_crop_bottom_right_x: primaryMediaState?.media_crop_bottom_right_x ?? null,
		media_crop_bottom_right_y: primaryMediaState?.media_crop_bottom_right_y ?? null,
		media_fit_mode: primaryMediaState?.media_fit_mode ?? "width",
	};
}

export function createEmptyPage(): PostPageForm {
	const defaultElements = [createElementKey("text"), createElementKey("media"), createElementKey("background")];
	const scopedDefaults = createElementScopedDefaults(defaultElements);
	const defaultMediaElementKey = defaultElements.find((elementKey) => getElementTypeFromKey(elementKey) === "media") ?? null;
	const mediaByElement =
		defaultMediaElementKey !== null ? { [defaultMediaElementKey]: createDefaultMediaElementState() } : {};

	return syncLegacyMediaFieldsFromPrimaryElement({
		elements: defaultElements,
		hiddenElements: [],
		center_single_media: false,
		text_background_elements: [],
		text_background_full_width_elements: [],
		text_alignments: scopedDefaults.textAlignments,
		text_effects: scopedDefaults.textEffects,
		element_corner_radius_px: scopedDefaults.elementCornerRadius,
		element_padding_px: scopedDefaults.elementPadding,
		element_margin_px: scopedDefaults.elementMargins,
		text_by_element: scopedDefaults.textByElement,
		text_style_by_element: scopedDefaults.textStyleByElement,
		text_is_heading_by_element: scopedDefaults.textIsHeadingByElement,
		text_color_by_element: scopedDefaults.textColorByElement,
		text_background_color_by_element: scopedDefaults.textBackgroundColorByElement,
		text_background_translucency_by_element: scopedDefaults.textBackgroundTranslucencyByElement,
		media_by_element: mediaByElement,
		container_padding_px: {
			top: DEFAULT_PAGE_CONTAINER_PADDING_PX,
			right: DEFAULT_PAGE_CONTAINER_PADDING_PX,
			left: DEFAULT_PAGE_CONTAINER_PADDING_PX,
			bottom: DEFAULT_PAGE_CONTAINER_PADDING_PX,
		},
		image_file: null,
		image_preview_url: null,
		cropped_preview_url: null,
		media_url: null,
		raw_media_url: null,
		background_image_file: null,
		background_image_preview_url: null,
		background_cropped_preview_url: null,
		background_media_url: null,
		background_color: null,
		background_gradient_color: null,
		background_width: null,
		background_height: null,
		width: null,
		height: null,
		media_crop_top_left_x: null,
		media_crop_top_left_y: null,
		media_crop_bottom_right_x: null,
		media_crop_bottom_right_y: null,
		media_fit_mode: "width",
		background_fit_mode: "cover",
		background_effect_preset: "none",
		background_crop_top_left_x: null,
		background_crop_top_left_y: null,
		background_crop_bottom_right_x: null,
		background_crop_bottom_right_y: null,
	});
}

export const initialForm: PostForm = {
	user_pk: "",
	locale: "",
	title: "",
	show_page_content: true,
	custom_content: "",
	template_id: DEFAULT_TEMPLATE_ID,
	page_scale: DEFAULT_PAGE_SCALE,
	visibility: "public",
	pages: [createEmptyPage()],
};

export function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

export function toOptionalFiniteNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) return null;
		const parsed = Number(trimmed);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	return null;
}

export function toOptionalString(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export const HEX_COLOR_PATTERN = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function normalizeHexColorToSix(value: string): string {
	const trimmed = value.trim();
	if (!HEX_COLOR_PATTERN.test(trimmed)) {
		return trimmed;
	}
	if (trimmed.length === 4) {
		const r = trimmed[1];
		const g = trimmed[2];
		const b = trimmed[3];
		return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
	}
	return trimmed.toLowerCase();
}

export function parseRgbLikeColor(value: string): { r: number; g: number; b: number; a: number } | null {
	const trimmed = value.trim();
	const match = trimmed.match(
		/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*((?:0(?:\.\d+)?)|(?:1(?:\.0+)?)|\.\d+))?\s*\)$/i,
	);
	if (!match) {
		return null;
	}

	const r = Number.parseInt(match[1], 10);
	const g = Number.parseInt(match[2], 10);
	const b = Number.parseInt(match[3], 10);
	const alphaRaw = match[4];
	const a = alphaRaw === undefined ? 1 : Number.parseFloat(alphaRaw);

	if ([r, g, b].some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 255)) {
		return null;
	}

	if (!Number.isFinite(a) || a < 0 || a > 1) {
		return null;
	}

	return { r, g, b, a };
}

export function rgbChannelsToHexColor(r: number, g: number, b: number): string {
	return `#${[r, g, b]
		.map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
		.join("")}`;
}

export function getTemplateTextBackgroundDefaults(style: TemplateElementStyle): { color: string; translucencyPercent: number } {
	const hexColor = toOptionalHexColor(style.backgroundColor);
	if (hexColor) {
		return {
			color: hexColor,
			translucencyPercent: 0,
		};
	}

	const parsedRgb = parseRgbLikeColor(style.backgroundColor);
	if (parsedRgb) {
		return {
			color: rgbChannelsToHexColor(parsedRgb.r, parsedRgb.g, parsedRgb.b),
			translucencyPercent: normalizeTranslucencyPercent((1 - parsedRgb.a) * 100),
		};
	}

	return {
		color: "#ffffff",
		translucencyPercent: 0,
	};
}

export function toOptionalHexColor(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	if (!HEX_COLOR_PATTERN.test(trimmed)) {
		return null;
	}

	return normalizeHexColorToSix(trimmed);
}

export function normalizeTranslucencyPercent(value: number): number {
	return clamp(Math.round(value), 0, 100);
}

export function toOptionalTranslucencyPercent(value: unknown): number | null {
	const parsed = toOptionalFiniteNumber(value);
	if (parsed === null) {
		return null;
	}

	return normalizeTranslucencyPercent(parsed);
}

export function getTextBackgroundTranslucencyPercent(
	page: PostPageForm,
	elementKey: PageElementKey,
	fallbackPercent = 0,
): number {
	const parsed = toOptionalTranslucencyPercent(page.text_background_translucency_by_element[elementKey]);
	return parsed ?? normalizeTranslucencyPercent(fallbackPercent);
}

export function getTextBackgroundTranslucencyOptions(currentValue: number): number[] {
	const normalizedCurrent = normalizeTranslucencyPercent(currentValue);
	if (TEXT_BACKGROUND_TRANSLUCENCY_OPTIONS.includes(normalizedCurrent)) {
		return [...TEXT_BACKGROUND_TRANSLUCENCY_OPTIONS];
	}

	return [...TEXT_BACKGROUND_TRANSLUCENCY_OPTIONS, normalizedCurrent].sort((a, b) => a - b);
}

export function getColorWithTranslucency(color: string, translucencyPercent: number): string {
	const normalizedHexColor = toOptionalHexColor(color);
	if (!normalizedHexColor) {
		return color;
	}

	const r = Number.parseInt(normalizedHexColor.slice(1, 3), 16);
	const g = Number.parseInt(normalizedHexColor.slice(3, 5), 16);
	const b = Number.parseInt(normalizedHexColor.slice(5, 7), 16);
	const alpha = (100 - normalizeTranslucencyPercent(translucencyPercent)) / 100;
	if (alpha >= 1) {
		return normalizedHexColor;
	}

	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getColorInputValue(color: string | null | undefined, fallback: string): string {
	const fallbackHexColor = toOptionalHexColor(fallback);
	const fallbackRgbColor = fallbackHexColor ? null : parseRgbLikeColor(fallback);
	const normalizedFallback = fallbackHexColor
		? normalizeHexColorToSix(fallbackHexColor)
		: fallbackRgbColor
			? rgbChannelsToHexColor(fallbackRgbColor.r, fallbackRgbColor.g, fallbackRgbColor.b)
			: "#ffffff";
	if (!color) {
		return normalizedFallback;
	}
	const trimmed = color.trim();
	if (!HEX_COLOR_PATTERN.test(trimmed)) {
		const parsedRgb = parseRgbLikeColor(trimmed);
		return parsedRgb ? rgbChannelsToHexColor(parsedRgb.r, parsedRgb.g, parsedRgb.b) : normalizedFallback;
	}
	return normalizeHexColorToSix(trimmed);
}

export function getPageBackgroundSurfaceStyle(
	page: Pick<PostPageForm, "background_color" | "background_gradient_color">,
	fallbackColor: string,
): CSSProperties {
	const baseColor = (typeof page.background_color === "string" && page.background_color.trim().length > 0
		? page.background_color.trim()
		: fallbackColor);
	const gradientColor =
		typeof page.background_gradient_color === "string" && page.background_gradient_color.trim().length > 0
			? page.background_gradient_color.trim()
			: null;

	if (gradientColor) {
		return {
			backgroundColor: baseColor,
			backgroundImage: `linear-gradient(180deg, ${baseColor} 0%, ${gradientColor} 100%)`,
		};
	}

	return {
		backgroundColor: baseColor,
	};
}

export function parseLayoutJsonObject(layoutJson: string | null): Record<string, unknown> | null {
	if (!layoutJson) return null;
	let current: unknown = layoutJson.trim();
	if (typeof current !== "string" || !current) return null;

	for (let depth = 0; depth < 4; depth += 1) {
		if (typeof current !== "string") break;
		const trimmed = current.trim();
		if (!trimmed) return null;
		try {
			current = JSON.parse(trimmed) as unknown;
		} catch {
			return null;
		}
	}

	return asRecord(current);
}

export function parsePageElementArray(value: unknown): PageElementType[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<PageElementType>();
	const elements: PageElementType[] = [];

	for (const item of value) {
		if (typeof item !== "string") continue;
		const element = item as PageElementType;
		if (!PAGE_ELEMENT_ORDER.includes(element) || seen.has(element)) continue;
		seen.add(element);
		elements.push(element);
	}

	return elements;
}

export function parsePageElementKeyArray(value: unknown): PageElementKey[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<PageElementKey>();
	const keys: PageElementKey[] = [];

	for (const item of value) {
		if (typeof item !== "string") continue;
		const key = item.trim();
		if (!key || seen.has(key)) continue;
		if (!isPageElementType(getElementTypeFromKey(key))) continue;
		seen.add(key);
		keys.push(key);
	}

	return keys;
}

export function areArrayValuesEqual<T extends string>(left: T[], right: T[]): boolean {
	if (left.length !== right.length) return false;
	for (let index = 0; index < left.length; index += 1) {
		if (left[index] !== right[index]) {
			return false;
		}
	}
	return true;
}

export function normalizePageElementCollections(page: PostPageForm): PostPageForm {
	const normalizedElements: PageElementKey[] = [];
	const seenElementKeys = new Set<PageElementKey>();
	let counter = 0;

	for (const rawElement of page.elements) {
		if (typeof rawElement !== "string") {
			continue;
		}
		const trimmedRawElement = rawElement.trim();
		if (!trimmedRawElement) {
			continue;
		}

		const rawType = getElementTypeFromKey(trimmedRawElement);
		const baseType = isPageElementType(rawType) ? rawType : null;
		if (!baseType) {
			continue;
		}

		let key = trimmedRawElement;
		if (seenElementKeys.has(key)) {
			key = createElementKey(baseType, `dup-${counter}`);
			counter += 1;
		}
		seenElementKeys.add(key);
		normalizedElements.push(key);
	}
	if (!normalizedElements.some((elementKey) => getElementTypeFromKey(elementKey) === "background")) {
		normalizedElements.push(createElementKey("background"));
	}

	const elements = [
		...normalizedElements.filter((elementKey) => getElementTypeFromKey(elementKey) !== "background"),
		...normalizedElements.filter((elementKey) => getElementTypeFromKey(elementKey) === "background"),
	];
	const hiddenElements = parsePageElementKeyArray(page.hiddenElements).filter((elementKey) => elements.includes(elementKey));
	const textBackgroundElements = parsePageElementKeyArray(page.text_background_elements).filter((elementKey) => {
		return elements.includes(elementKey) && isTextPageElement(getElementTypeFromKey(elementKey));
	});
	const textBackgroundFullWidthElements = parsePageElementKeyArray(page.text_background_full_width_elements).filter((elementKey) =>
		textBackgroundElements.includes(elementKey),
	);

	const textAlignments: Record<PageElementKey, TextAlignment> = {};
	const textEffects: Record<PageElementKey, TextEffectPreset> = {};
	const elementCornerRadius: Record<PageElementKey, number | null> = {};
	const elementPadding: Record<PageElementKey, number> = {};
	const elementMargins: Record<PageElementKey, Record<ElementMarginSide, number>> = {};
	const textByElement: Record<PageElementKey, string> = {};
	const textStyleByElement: Record<PageElementKey, TextElementStyle> = {};
	const textIsHeadingByElement: Record<PageElementKey, boolean> = {};
	const textColorByElement: Record<PageElementKey, string | null> = {};
	const textBackgroundColorByElement: Record<PageElementKey, string | null> = {};
	const textBackgroundTranslucencyByElement: Record<PageElementKey, number | null> = {};
	const mediaByElement: Record<PageElementKey, MediaElementForm> = {};

	for (const elementKey of elements) {
		const elementType = getElementTypeFromKey(elementKey);
		const isTextElement = isTextPageElement(elementType);
		const textStyle = isTextElement
			? (page.text_style_by_element[elementKey] ?? DEFAULT_TEXT_ELEMENT_STYLE)
			: null;
		textAlignments[elementKey] = textStyle
			? (page.text_alignments[elementKey] ?? DEFAULT_TEXT_ALIGNMENTS[textStyle])
			: "left";
		textEffects[elementKey] = textStyle
			? (page.text_effects[elementKey] ?? DEFAULT_TEXT_EFFECTS[textStyle])
			: "none";
		elementCornerRadius[elementKey] =
			page.element_corner_radius_px[elementKey] === undefined ? null : page.element_corner_radius_px[elementKey];
		elementPadding[elementKey] =
			page.element_padding_px[elementKey] === undefined ? DEFAULT_ELEMENT_PADDING_PX : page.element_padding_px[elementKey];
		elementMargins[elementKey] = {
			top: page.element_margin_px[elementKey]?.top ?? DEFAULT_ELEMENT_MARGIN_PX.top,
			right: page.element_margin_px[elementKey]?.right ?? DEFAULT_ELEMENT_MARGIN_PX.right,
			bottom: page.element_margin_px[elementKey]?.bottom ?? DEFAULT_ELEMENT_MARGIN_PX.bottom,
			left: page.element_margin_px[elementKey]?.left ?? DEFAULT_ELEMENT_MARGIN_PX.left,
		};
		if (isTextElement) {
			textByElement[elementKey] = page.text_by_element[elementKey] ?? "";
			const resolvedTextStyle = textStyle ?? DEFAULT_TEXT_ELEMENT_STYLE;
			textStyleByElement[elementKey] = resolvedTextStyle;
			textIsHeadingByElement[elementKey] =
				page.text_is_heading_by_element[elementKey] ?? resolvedTextStyle !== "caption";
			textColorByElement[elementKey] = toOptionalHexColor(page.text_color_by_element[elementKey]);
			textBackgroundColorByElement[elementKey] = toOptionalHexColor(
				page.text_background_color_by_element[elementKey],
			);
			textBackgroundTranslucencyByElement[elementKey] = toOptionalTranslucencyPercent(
				page.text_background_translucency_by_element[elementKey],
			);
		} else if (elementType === "media") {
			const existingMedia = page.media_by_element[elementKey] ?? null;
			mediaByElement[elementKey] = createDefaultMediaElementState(
				existingMedia ?? {
					image_file: page.image_file,
					image_preview_url: page.image_preview_url,
					cropped_preview_url: page.cropped_preview_url,
					media_url: page.media_url,
					raw_media_url: page.raw_media_url,
					width: page.width,
					height: page.height,
					media_crop_top_left_x: page.media_crop_top_left_x,
					media_crop_top_left_y: page.media_crop_top_left_y,
					media_crop_bottom_right_x: page.media_crop_bottom_right_x,
					media_crop_bottom_right_y: page.media_crop_bottom_right_y,
					media_fit_mode: page.media_fit_mode,
				},
			);
		}
	}

	const isSame =
		areArrayValuesEqual(elements, page.elements) &&
		areArrayValuesEqual(hiddenElements, page.hiddenElements) &&
		areArrayValuesEqual(textBackgroundElements, page.text_background_elements) &&
		areArrayValuesEqual(textBackgroundFullWidthElements, page.text_background_full_width_elements) &&
		Object.keys(textAlignments).length === Object.keys(page.text_alignments).length &&
		Object.keys(textEffects).length === Object.keys(page.text_effects).length &&
		Object.keys(elementCornerRadius).length === Object.keys(page.element_corner_radius_px).length &&
		Object.keys(elementPadding).length === Object.keys(page.element_padding_px).length &&
		Object.keys(elementMargins).length === Object.keys(page.element_margin_px).length &&
		Object.keys(textByElement).length === Object.keys(page.text_by_element).length &&
		Object.keys(textStyleByElement).length === Object.keys(page.text_style_by_element ?? {}).length &&
		Object.keys(textIsHeadingByElement).length === Object.keys(page.text_is_heading_by_element ?? {}).length &&
		Object.keys(textColorByElement).length === Object.keys(page.text_color_by_element ?? {}).length &&
		Object.keys(textBackgroundColorByElement).length ===
			Object.keys(page.text_background_color_by_element ?? {}).length &&
		Object.keys(textBackgroundTranslucencyByElement).length ===
			Object.keys(page.text_background_translucency_by_element ?? {}).length &&
		Object.keys(mediaByElement).length === Object.keys(page.media_by_element ?? {}).length;

	if (isSame) {
		return syncLegacyMediaFieldsFromPrimaryElement(page);
	}

	return syncLegacyMediaFieldsFromPrimaryElement({
		...page,
		elements,
		hiddenElements,
		text_background_elements: textBackgroundElements,
		text_background_full_width_elements: textBackgroundFullWidthElements,
		text_alignments: textAlignments,
		text_effects: textEffects,
		element_corner_radius_px: elementCornerRadius,
		element_padding_px: elementPadding,
		element_margin_px: elementMargins,
		text_by_element: textByElement,
		text_style_by_element: textStyleByElement,
		text_is_heading_by_element: textIsHeadingByElement,
		text_color_by_element: textColorByElement,
		text_background_color_by_element: textBackgroundColorByElement,
		text_background_translucency_by_element: textBackgroundTranslucencyByElement,
		media_by_element: mediaByElement,
	});
}

export function buildCdnMediaUrlFromKey(key: string): string | null {
	const normalizedKey = key.trim().replace(/^\/+/, "");
	if (!normalizedKey) return null;
	return `${CDN_MEDIA_BASE_URL}/${normalizedKey}`;
}

export function normalizeImageSourceCandidate(value: string): string {
	let normalized = value.trim();
	if (!normalized) return "";

	const markdownLinkMatch = normalized.match(/^\[[^\]]*\]\((.+)\)$/);
	if (markdownLinkMatch?.[1]) {
		normalized = markdownLinkMatch[1].trim();
	}

	if (normalized.startsWith("<") && normalized.endsWith(">")) {
		normalized = normalized.slice(1, -1).trim();
	}

	if (
		(normalized.startsWith('"') && normalized.endsWith('"')) ||
		(normalized.startsWith("'") && normalized.endsWith("'"))
	) {
		normalized = normalized.slice(1, -1).trim();
	}

	return normalized;
}

export function extractMediaStorageKey(value: string): string | null {
	const trimmed = normalizeImageSourceCandidate(value);
	if (!trimmed) return null;

	// Raw R2 object key (e.g. post-pages/2026-02-22/uuid.jpg)
	if (!trimmed.startsWith("/") && !trimmed.includes("://")) {
		return trimmed;
	}

	// Relative API proxy path.
	if (trimmed.startsWith("/api/media")) {
		try {
			const url = new URL(trimmed, "http://localhost");
			return url.searchParams.get("key");
		} catch {
			return null;
		}
	}

	// Absolute URL: support both /api/media?key=... and direct CDN path.
	try {
		const url = new URL(trimmed);
		if (url.pathname === "/api/media") {
			return url.searchParams.get("key");
		}
		if (url.hostname === "cdn.paragify.com") {
			return url.pathname.replace(/^\/+/, "") || null;
		}
	} catch {
		return null;
	}

	return null;
}

export function resolveMediaUploadAreaSrc(rawMediaUrl: string | null, mediaUrl: string | null): string | null {
	const candidates = [rawMediaUrl, mediaUrl]
		.map((value) => (typeof value === "string" ? normalizeImageSourceCandidate(value) : ""))
		.filter((value): value is string => value.length > 0);

	for (const candidate of candidates) {
		const storageKey = extractMediaStorageKey(candidate);
		if (storageKey) {
			const cdnUrl = buildCdnMediaUrlFromKey(storageKey);
			if (cdnUrl) return cdnUrl;
		}
	}

	const fallback = candidates[0] ?? null;
	if (!fallback) {
		return null;
	}

	if (
		fallback.startsWith("blob:") ||
		fallback.startsWith("data:") ||
		fallback.startsWith("/") ||
		fallback.startsWith("/api/image-proxy?")
	) {
		return fallback;
	}

	return /^https?:\/\//i.test(fallback)
		? `/api/image-proxy?url=${encodeURIComponent(fallback)}`
		: fallback;
}

export function normalizeLoadedSpacingUnit(value: unknown, shouldScale: boolean): number | null {
	const parsed = toOptionalFiniteNumber(value);
	if (parsed === null) return null;

	const normalized = normalizeDraggedMarginValue(parsed);
	if (!shouldScale) {
		return normalized;
	}

	return normalizeDraggedMarginValue(Math.round(normalized * EDIT_MODE_LAYOUT_UNIT_SCALE));
}

export function shouldScaleEditModeSpacing(
	layout: Record<string, unknown> | null,
	pageWidth: number | null,
	pageHeight: number | null,
): boolean {
	if (pageWidth !== EDIT_MODE_LAYOUT_BASE_WIDTH_PX || pageHeight !== EDIT_MODE_LAYOUT_BASE_HEIGHT_PX) {
		return false;
	}

	const spacingValues: number[] = [];
	const collectSpacingValue = (value: unknown) => {
		const parsed = toOptionalFiniteNumber(value);
		if (parsed !== null) {
			spacingValues.push(normalizeDraggedMarginValue(parsed));
		}
	};

	const containerPaddingLayout = asRecord(layout?.container_padding_px);
	if (containerPaddingLayout) {
		for (const side of PAGE_CONTAINER_PADDING_SIDES.map((item) => item.side)) {
			collectSpacingValue(containerPaddingLayout[side]);
		}
	}

	const elementPaddingLayout = asRecord(layout?.element_padding_px);
	if (elementPaddingLayout) {
		for (const element of PAGE_ELEMENT_ORDER) {
			collectSpacingValue(elementPaddingLayout[element]);
		}
	}

	const elementMarginsLayout = asRecord(layout?.element_margin_px);
	if (elementMarginsLayout) {
		for (const element of PAGE_ELEMENT_ORDER) {
			const marginRecord = asRecord(elementMarginsLayout[element]);
			if (!marginRecord) continue;
			for (const side of ELEMENT_MARGIN_SIDES.map((item) => item.side)) {
				collectSpacingValue(marginRecord[side]);
			}
		}
	}

	const elementMarginsBottomLayout = asRecord(layout?.element_margin_bottom_px);
	if (elementMarginsBottomLayout) {
		for (const element of PAGE_ELEMENT_ORDER) {
			collectSpacingValue(elementMarginsBottomLayout[element]);
		}
	}

	return spacingValues.some((value) => value > EDIT_MODE_SPACING_SCALE_TRIGGER_PX);
}

export function createPageFromApi(pageFromApi: NonNullable<ExistingPostApiResponse["pages"]>[number]): PostPageForm {
	const page = createEmptyPage();
	const layout = parseLayoutJsonObject(pageFromApi.layout_json);
	const shouldScaleSpacing = shouldScaleEditModeSpacing(layout, pageFromApi.width, pageFromApi.height);
	const mediaUploadAreaSrc = resolveMediaUploadAreaSrc(pageFromApi.raw_media_url, pageFromApi.media_url);
	const containerPadding = { ...page.container_padding_px };
	const containerPaddingLayout = asRecord(layout?.container_padding_px);
	if (containerPaddingLayout) {
		for (const side of PAGE_CONTAINER_PADDING_SIDES.map((item) => item.side)) {
			const nextValue = normalizeLoadedSpacingUnit(containerPaddingLayout[side], shouldScaleSpacing);
			if (nextValue !== null) {
				containerPadding[side] = nextValue;
			}
		}
	}

	const elements: PageElementKey[] = [];
	const hiddenElements: PageElementKey[] = [];
	const textBackgroundElements: PageElementKey[] = [];
	const textBackgroundFullWidthElements: PageElementKey[] = [];
	const textAlignments: Record<PageElementKey, TextAlignment> = {};
	const textEffects: Record<PageElementKey, TextEffectPreset> = {};
	const elementCornerRadius: Record<PageElementKey, number | null> = {};
	const elementPadding: Record<PageElementKey, number> = {};
	const elementMargins: Record<PageElementKey, Record<ElementMarginSide, number>> = {};
	const textByElement: Record<PageElementKey, string> = {};
	const textStyleByElement: Record<PageElementKey, TextElementStyle> = {};
	const textIsHeadingByElement: Record<PageElementKey, boolean> = {};
	const textColorByElement: Record<PageElementKey, string | null> = {};
	const textBackgroundColorByElement: Record<PageElementKey, string | null> = {};
	const textBackgroundTranslucencyByElement: Record<PageElementKey, number | null> = {};
	const mediaByElement: Record<PageElementKey, MediaElementForm> = {};

	const elementsV2 = Array.isArray(layout?.elements_v2) ? layout.elements_v2 : [];
	if (elementsV2.length > 0) {
		for (let index = 0; index < elementsV2.length; index += 1) {
			const rawItem = asRecord(elementsV2[index]);
			const rawType = rawItem?.type;
			if (!isPageElementType(rawType)) {
				continue;
			}

			const rawKey = typeof rawItem?.key === "string" ? rawItem.key.trim() : "";
			const elementKey = rawKey.length > 0 ? rawKey : createElementKey(rawType, `v2-${index}`);
			elements.push(elementKey);

			if (rawItem?.hidden === true) {
				hiddenElements.push(elementKey);
			}

			const parsedCornerRadius = toOptionalFiniteNumber(rawItem?.corner_radius_px);
			elementCornerRadius[elementKey] = rawItem?.corner_radius_px === null ? null : parsedCornerRadius;
			elementPadding[elementKey] =
				normalizeLoadedSpacingUnit(rawItem?.padding_px, shouldScaleSpacing) ?? DEFAULT_ELEMENT_PADDING_PX;
			const marginRecord = asRecord(rawItem?.margin_px);
			elementMargins[elementKey] = {
				top: normalizeLoadedSpacingUnit(marginRecord?.top, shouldScaleSpacing) ?? DEFAULT_ELEMENT_MARGIN_PX.top,
				right: normalizeLoadedSpacingUnit(marginRecord?.right, shouldScaleSpacing) ?? DEFAULT_ELEMENT_MARGIN_PX.right,
				bottom: normalizeLoadedSpacingUnit(marginRecord?.bottom, shouldScaleSpacing) ?? DEFAULT_ELEMENT_MARGIN_PX.bottom,
				left: normalizeLoadedSpacingUnit(marginRecord?.left, shouldScaleSpacing) ?? DEFAULT_ELEMENT_MARGIN_PX.left,
			};

			const isTextElement = isTextPageElement(rawType);
			if (isTextElement) {
				const textStyle = isTextElementStyleValue(rawItem?.text_style) ? rawItem.text_style : DEFAULT_TEXT_ELEMENT_STYLE;
				const backgroundMode = rawItem?.text_background_mode;
				if (backgroundMode === "wrap" || backgroundMode === "full-width") {
					textBackgroundElements.push(elementKey);
				}
				if (backgroundMode === "full-width") {
					textBackgroundFullWidthElements.push(elementKey);
				}
				textStyleByElement[elementKey] = textStyle;
				textAlignments[elementKey] = isTextAlignmentValue(rawItem?.text_alignment)
					? rawItem.text_alignment
					: DEFAULT_TEXT_ALIGNMENTS[textStyle];
				textEffects[elementKey] = isTextEffectPresetValue(rawItem?.text_effect)
					? rawItem.text_effect
					: DEFAULT_TEXT_EFFECTS[textStyle];
				textByElement[elementKey] = typeof rawItem?.text === "string" ? rawItem.text : "";
				textIsHeadingByElement[elementKey] =
					typeof rawItem?.is_heading === "boolean" ? rawItem.is_heading : textStyle !== "caption";
				textColorByElement[elementKey] = toOptionalHexColor(rawItem?.text_color);
				textBackgroundColorByElement[elementKey] = toOptionalHexColor(rawItem?.text_background_color);
				textBackgroundTranslucencyByElement[elementKey] = toOptionalTranslucencyPercent(
					rawItem?.text_background_translucency,
				);
			} else {
				textAlignments[elementKey] = "left";
				textEffects[elementKey] = "none";
				if (rawType === "media") {
					const mediaUrlValue =
						typeof rawItem?.media_url === "string" ? normalizeImageSourceCandidate(rawItem.media_url) : "";
					const rawMediaUrlValue =
						typeof rawItem?.raw_media_url === "string" ? normalizeImageSourceCandidate(rawItem.raw_media_url) : "";
					const mediaUrl = mediaUrlValue.length > 0 ? mediaUrlValue : null;
					const rawMediaUrl = rawMediaUrlValue.length > 0 ? rawMediaUrlValue : null;
					const imagePreviewUrl = resolveMediaUploadAreaSrc(rawMediaUrl, mediaUrl);
					mediaByElement[elementKey] = createDefaultMediaElementState({
						image_preview_url: imagePreviewUrl,
						cropped_preview_url:
							typeof rawItem?.cropped_preview_url === "string" && rawItem.cropped_preview_url.trim().length > 0
								? rawItem.cropped_preview_url
								: null,
						media_url: mediaUrl,
						raw_media_url: rawMediaUrl,
						width: toOptionalFiniteNumber(rawItem?.width),
						height: toOptionalFiniteNumber(rawItem?.height),
						media_crop_top_left_x: toOptionalFiniteNumber(rawItem?.media_crop_top_left_x),
						media_crop_top_left_y: toOptionalFiniteNumber(rawItem?.media_crop_top_left_y),
						media_crop_bottom_right_x: toOptionalFiniteNumber(rawItem?.media_crop_bottom_right_x),
						media_crop_bottom_right_y: toOptionalFiniteNumber(rawItem?.media_crop_bottom_right_y),
						media_fit_mode: isMediaFitModeValue(rawItem?.media_fit_mode) ? rawItem.media_fit_mode : page.media_fit_mode,
					});
				}
			}
		}
	}

	if (elements.length === 0) {
		const layoutOrder = parsePageElementArray(layout?.order);
		const hasLegacyText = [
			pageFromApi.h1,
			pageFromApi.h2,
			pageFromApi.h3,
			pageFromApi.h4,
			pageFromApi.caption,
		].some((value) => typeof value === "string" && value.trim().length > 0);
		const inferredElements: PageElementType[] = [];
		if (pageFromApi.bg_media_url) inferredElements.push("background");
		if (hasLegacyText) inferredElements.push("text");
		if (pageFromApi.media_url) inferredElements.push("media");
		const elementTypes: PageElementType[] =
			layoutOrder.length > 0
				? layoutOrder
				: inferredElements.length > 0
					? inferredElements
					: (["text", "media"] as PageElementType[]);

		const hiddenTypeSet = new Set(parsePageElementArray(layout?.hidden));
		const textAlignmentsLayout = asRecord(layout?.text_alignments);
		const textEffectsLayout = asRecord(layout?.text_effects);
		const textColorsLayout = asRecord(layout?.text_colors);
		const textBackgroundColorsLayout = asRecord(layout?.text_background_colors);
		const textBackgroundTranslucencyLayout = asRecord(layout?.text_background_translucency);
		const textBackgroundTranslucenciesLayout = asRecord(layout?.text_background_translucencies);
		const elementCornerRadiusLayout = asRecord(layout?.element_corner_radius_px);
		const elementPaddingLayout = asRecord(layout?.element_padding_px);
		const elementMarginsLayout = asRecord(layout?.element_margin_px);
		const elementMarginsBottomLayout = asRecord(layout?.element_margin_bottom_px);

		for (let index = 0; index < elementTypes.length; index += 1) {
			const elementType = elementTypes[index];
			const elementKey = createElementKey(elementType, `legacy-${index}`);
			elements.push(elementKey);

			if (hiddenTypeSet.has(elementType)) {
				hiddenElements.push(elementKey);
			}

			if (isTextPageElement(elementType)) {
				const textStyle = DEFAULT_TEXT_ELEMENT_STYLE;
				textStyleByElement[elementKey] = textStyle;
				const rawTextAlignment = textAlignmentsLayout?.[elementType] ?? textAlignmentsLayout?.caption;
				const rawTextEffect = textEffectsLayout?.[elementType] ?? textEffectsLayout?.caption;
				textAlignments[elementKey] = isTextAlignmentValue(rawTextAlignment)
					? rawTextAlignment
					: DEFAULT_TEXT_ALIGNMENTS[textStyle];
				textEffects[elementKey] = isTextEffectPresetValue(rawTextEffect) ? rawTextEffect : DEFAULT_TEXT_EFFECTS[textStyle];
				textByElement[elementKey] = pageFromApi.caption ?? pageFromApi.h1 ?? pageFromApi.h2 ?? pageFromApi.h3 ?? pageFromApi.h4 ?? "";
				textIsHeadingByElement[elementKey] = textStyle !== "caption";
				const rawTextColor = textColorsLayout?.[elementType] ?? textColorsLayout?.caption;
				textColorByElement[elementKey] = toOptionalHexColor(rawTextColor);
				const rawTextBackgroundColor =
					textBackgroundColorsLayout?.[elementType] ?? textBackgroundColorsLayout?.caption;
				textBackgroundColorByElement[elementKey] = toOptionalHexColor(rawTextBackgroundColor);
				const rawTextBackgroundTranslucency =
					textBackgroundTranslucenciesLayout?.[elementType] ??
					textBackgroundTranslucenciesLayout?.caption ??
					textBackgroundTranslucencyLayout?.[elementType] ??
					textBackgroundTranslucencyLayout?.caption;
				textBackgroundTranslucencyByElement[elementKey] =
					toOptionalTranslucencyPercent(rawTextBackgroundTranslucency);
			} else {
				textAlignments[elementKey] = "left";
				textEffects[elementKey] = "none";
				if (elementType === "media") {
					mediaByElement[elementKey] = createDefaultMediaElementState({
						image_preview_url: mediaUploadAreaSrc,
						media_url: pageFromApi.media_url ?? pageFromApi.raw_media_url,
						raw_media_url: pageFromApi.raw_media_url ?? pageFromApi.media_url,
						width: pageFromApi.width,
						height: pageFromApi.height,
						media_crop_top_left_x: pageFromApi.media_crop_top_left_x,
						media_crop_top_left_y: pageFromApi.media_crop_top_left_y,
						media_crop_bottom_right_x: pageFromApi.media_crop_bottom_right_x,
						media_crop_bottom_right_y: pageFromApi.media_crop_bottom_right_y,
						media_fit_mode: isMediaFitModeValue(layout?.media_fit_mode) ? layout.media_fit_mode : page.media_fit_mode,
					});
				}
			}

			const rawCornerRadius = elementCornerRadiusLayout?.[elementType];
			if (rawCornerRadius === null || rawCornerRadius === undefined) {
				elementCornerRadius[elementKey] = null;
			} else {
				elementCornerRadius[elementKey] = toOptionalFiniteNumber(rawCornerRadius);
			}

			elementPadding[elementKey] =
				normalizeLoadedSpacingUnit(elementPaddingLayout?.[elementType], shouldScaleSpacing) ?? DEFAULT_ELEMENT_PADDING_PX;

			const legacyMargins = asRecord(elementMarginsLayout?.[elementType]);
			const legacyBottom = normalizeLoadedSpacingUnit(elementMarginsBottomLayout?.[elementType], shouldScaleSpacing);
			elementMargins[elementKey] = {
				top: normalizeLoadedSpacingUnit(legacyMargins?.top, shouldScaleSpacing) ?? DEFAULT_ELEMENT_MARGIN_PX.top,
				right: normalizeLoadedSpacingUnit(legacyMargins?.right, shouldScaleSpacing) ?? DEFAULT_ELEMENT_MARGIN_PX.right,
				bottom: legacyBottom ?? normalizeLoadedSpacingUnit(legacyMargins?.bottom, shouldScaleSpacing) ?? DEFAULT_ELEMENT_MARGIN_PX.bottom,
				left: normalizeLoadedSpacingUnit(legacyMargins?.left, shouldScaleSpacing) ?? DEFAULT_ELEMENT_MARGIN_PX.left,
			};
		}
	}

	const mediaElementKeys = elements.filter((elementKey) => getElementTypeFromKey(elementKey) === "media");
	for (let mediaIndex = 0; mediaIndex < mediaElementKeys.length; mediaIndex += 1) {
		const mediaElementKey = mediaElementKeys[mediaIndex];
		if (!mediaByElement[mediaElementKey]) {
			mediaByElement[mediaElementKey] = createDefaultMediaElementState(
				mediaIndex === 0
					? {
							image_preview_url: mediaUploadAreaSrc,
							media_url: pageFromApi.media_url ?? pageFromApi.raw_media_url,
							raw_media_url: pageFromApi.raw_media_url ?? pageFromApi.media_url,
							width: pageFromApi.width,
							height: pageFromApi.height,
							media_crop_top_left_x: pageFromApi.media_crop_top_left_x,
							media_crop_top_left_y: pageFromApi.media_crop_top_left_y,
							media_crop_bottom_right_x: pageFromApi.media_crop_bottom_right_x,
							media_crop_bottom_right_y: pageFromApi.media_crop_bottom_right_y,
					  }
					: undefined,
			);
		}
	}

	const mediaFitMode = isMediaFitModeValue(layout?.media_fit_mode) ? layout.media_fit_mode : page.media_fit_mode;
	const backgroundFitMode = isMediaFitModeValue(layout?.background_fit_mode) ? layout.background_fit_mode : page.background_fit_mode;
	const backgroundEffectPreset = isBackgroundEffectPresetValue(layout?.background_effect_preset)
		? layout.background_effect_preset
		: page.background_effect_preset;
	const backgroundColor = toOptionalString(layout?.background_color);
	const backgroundGradientColor = toOptionalString(layout?.background_gradient_color);
	const mediaCropTopLeftX = toOptionalFiniteNumber(layout?.media_crop_top_left_x) ?? pageFromApi.media_crop_top_left_x;
	const mediaCropTopLeftY = toOptionalFiniteNumber(layout?.media_crop_top_left_y) ?? pageFromApi.media_crop_top_left_y;
	const mediaCropBottomRightX =
		toOptionalFiniteNumber(layout?.media_crop_bottom_right_x) ?? pageFromApi.media_crop_bottom_right_x;
	const mediaCropBottomRightY =
		toOptionalFiniteNumber(layout?.media_crop_bottom_right_y) ?? pageFromApi.media_crop_bottom_right_y;

	const nextPage: PostPageForm = {
		...page,
		elements,
		hiddenElements,
		text_background_elements: textBackgroundElements,
		text_background_full_width_elements: textBackgroundFullWidthElements,
		text_alignments: textAlignments,
		text_effects: textEffects,
		element_corner_radius_px: elementCornerRadius,
		element_padding_px: elementPadding,
		element_margin_px: elementMargins,
		text_by_element: textByElement,
		text_style_by_element: textStyleByElement,
		text_is_heading_by_element: textIsHeadingByElement,
		text_color_by_element: textColorByElement,
		text_background_color_by_element: textBackgroundColorByElement,
		text_background_translucency_by_element: textBackgroundTranslucencyByElement,
		media_by_element: mediaByElement,
		container_padding_px: containerPadding,
		image_preview_url: mediaUploadAreaSrc,
		cropped_preview_url: null,
		media_url: pageFromApi.media_url ?? pageFromApi.raw_media_url,
		raw_media_url: pageFromApi.raw_media_url ?? pageFromApi.media_url,
		background_image_preview_url: pageFromApi.bg_media_url,
		background_cropped_preview_url: null,
		background_media_url: pageFromApi.bg_media_url,
		background_color: backgroundColor,
		background_gradient_color: backgroundGradientColor,
		width: pageFromApi.width,
		height: pageFromApi.height,
		background_width: pageFromApi.width,
		background_height: pageFromApi.height,
		media_crop_top_left_x: mediaCropTopLeftX,
		media_crop_top_left_y: mediaCropTopLeftY,
		media_crop_bottom_right_x: mediaCropBottomRightX,
		media_crop_bottom_right_y: mediaCropBottomRightY,
		media_fit_mode: mediaFitMode,
		background_fit_mode: backgroundFitMode,
		background_effect_preset: backgroundEffectPreset,
		background_crop_top_left_x: toOptionalFiniteNumber(layout?.background_crop_top_left_x),
		background_crop_top_left_y: toOptionalFiniteNumber(layout?.background_crop_top_left_y),
		background_crop_bottom_right_x: toOptionalFiniteNumber(layout?.background_crop_bottom_right_x),
		background_crop_bottom_right_y: toOptionalFiniteNumber(layout?.background_crop_bottom_right_y),
	};

	return normalizePageElementCollections(nextPage);
}

export function createFormFromExistingPostResponse(response: ExistingPostApiResponse): PostForm | null {
	if (!response.post) return null;

	const pagesFromApi = Array.isArray(response.pages) ? [...response.pages].sort((a, b) => a.page_num - b.page_num) : [];
	const contentPagesFromApi = pagesFromApi.filter((page) => {
		const layout = parseLayoutJsonObject(page.layout_json);
		return layout?.type !== "cover";
	});
	const pages = contentPagesFromApi.length > 0 ? contentPagesFromApi.map((page) => createPageFromApi(page)) : [createEmptyPage()];
	const templateId = isTemplateId(response.post.template_id) ? response.post.template_id : DEFAULT_TEMPLATE_ID;
	const visibility = isVisibilityValue(response.post.visibility) ? response.post.visibility : "private";
	const pageScale =
		(pagesFromApi.length > 0 ? pagesFromApi : contentPagesFromApi)
			.map((page) => parseLayoutJsonObject(page.layout_json))
			.map((layout) => (isPageScaleRatioValue(layout?.page_scale) ? layout.page_scale : null))
			.find((value): value is PageScaleRatio => value !== null) ?? DEFAULT_PAGE_SCALE;

	return {
		user_pk: String(response.post.user_pk),
		locale: response.post.locale ?? detectBrowserLocale(),
		title: response.post.title ?? "",
		show_page_content: response.post.show_page_content !== 0,
		custom_content: response.post.custom_content ?? "",
		template_id: templateId,
		page_scale: pageScale,
		visibility,
		pages,
	};
}

export const inputClassName =
	"w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100";
export const labelClassName = "mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-300";

export function getPostTemplate(templateId: PostTemplateId): PostTemplate {
	return POST_TEMPLATES.find((template) => template.id === templateId) ?? POST_TEMPLATES[0];
}

export function getTemplateTextBackgroundEffectStyle(
	templateId: PostTemplateId,
	hasTextBackground: boolean,
	cornerRadiusPx: number,
): CSSProperties {
	if (!hasTextBackground || templateId !== "noir_translucent") {
		return {};
	}

	return {
		backdropFilter: "saturate(180%) blur(16px)",
		WebkitBackdropFilter: "saturate(180%) blur(16px)",
		border: "1px solid rgba(255, 255, 255, 0.22)",
		boxShadow: "0 10px 28px rgba(2, 6, 23, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.18)",
		overflow: "hidden",
		backgroundClip: "padding-box",
		clipPath: `inset(0 round ${cornerRadiusPx}px)`,
		WebkitMaskImage: "-webkit-radial-gradient(white, black)",
	};
}

export function renderTextWithHashtags(text: string, hashtagStyle: TemplateHashtagStyle) {
	return text.split(HASHTAG_SPLIT_PATTERN).map((segment, index) => {
		if (HASHTAG_SEGMENT_PATTERN.test(segment)) {
			return (
				<span
					key={`hashtag-${index}`}
					className="inline-block"
					style={{
						color: hashtagStyle.color,
						backgroundColor: hashtagStyle.backgroundColor,
						fontWeight: hashtagStyle.fontWeight,
						padding: `${hashtagStyle.paddingYpx}px ${hashtagStyle.paddingXpx}px`,
						borderRadius: `${hashtagStyle.borderRadiusPx}px`,
					}}
				>
					{segment}
				</span>
			);
		}

		return <span key={`text-${index}`}>{segment}</span>;
	});
}

export function resizeTextareaToContent(textarea: HTMLTextAreaElement) {
	textarea.style.height = "auto";
	textarea.style.height = `${textarea.scrollHeight}px`;
}

export function buildAutoContentFromPages(pages: PostPageForm[]): string {
	const pageTextBlocks: string[] = [];

	for (const page of pages) {
		const lineItems: string[] = [];
		for (const elementKey of page.elements) {
			const elementType = getElementTypeFromKey(elementKey);
			if (!isTextPageElement(elementType) || page.hiddenElements.includes(elementKey)) {
				continue;
			}

			const textValue = (page.text_by_element[elementKey] ?? "").trim();
			if (textValue.length > 0) {
				lineItems.push(textValue);
			}
		}

		if (lineItems.length > 0) {
			pageTextBlocks.push(lineItems.join("\n"));
		}
	}

	return pageTextBlocks.join("\n\n");
}

export function buildResolvedPostContent(pages: PostPageForm[], customContent: string, includePageContent: boolean): string {
	const pageContent = includePageContent ? buildAutoContentFromPages(pages).trim() : "";
	const custom = customContent.trim();

	return [pageContent, custom].filter((segment) => segment.length > 0).join("\n\n");
}

export function parseOptionalInteger(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}

	const numberValue = Number(trimmed);
	if (!Number.isInteger(numberValue)) {
		return null;
	}

	return numberValue;
}

export function detectBrowserLocale(): string {
	if (typeof navigator === "undefined") {
		return "en-US";
	}

	return navigator.languages?.[0] || navigator.language || "en-US";
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export function getAutoFittedSingleLineFontSizePx(
	element: HTMLElement,
	preferredFontPx: number,
	minFontPx: number,
): number {
	const previousFontSize = element.style.fontSize;
	element.style.fontSize = `${preferredFontPx}px`;
	const availableWidth = element.clientWidth;
	const requiredWidth = element.scrollWidth;
	element.style.fontSize = previousFontSize;

	if (availableWidth <= 0 || requiredWidth <= 0 || requiredWidth <= availableWidth) {
		return preferredFontPx;
	}

	const scaledFontPx = preferredFontPx * (availableWidth / requiredWidth);
	return clamp(Number((scaledFontPx - 0.25).toFixed(2)), minFontPx, preferredFontPx);
}

export function normalizeDraggedMarginValue(value: number): number {
	return Math.max(0, Math.round(value));
}

export function getElementMarginSelectOptions(currentValue: number): number[] {
	const normalizedCurrent = normalizeDraggedMarginValue(currentValue);
	if (ELEMENT_MARGIN_OPTIONS_PX.some((value) => value === normalizedCurrent)) {
		return [...ELEMENT_MARGIN_OPTIONS_PX];
	}

	return [...ELEMENT_MARGIN_OPTIONS_PX, normalizedCurrent].sort((a, b) => a - b);
}

export function getPageContainerPaddingSelectOptions(currentValue: number): number[] {
	const normalizedCurrent = normalizeDraggedMarginValue(currentValue);
	if (PAGE_CONTAINER_PADDING_OPTIONS_PX.some((value) => value === normalizedCurrent)) {
		return [...PAGE_CONTAINER_PADDING_OPTIONS_PX];
	}

	return [...PAGE_CONTAINER_PADDING_OPTIONS_PX, normalizedCurrent].sort((a, b) => a - b);
}

export function revokePreviewUrl(url: string | null) {
	if (url) {
		URL.revokeObjectURL(url);
	}
}

export function getPageMediaPreviewUrls(page: PostPageForm): string[] {
	const urls = new Set<string>();
	for (const mediaState of Object.values(page.media_by_element)) {
		if (mediaState.image_preview_url) {
			urls.add(mediaState.image_preview_url);
		}
		if (mediaState.cropped_preview_url) {
			urls.add(mediaState.cropped_preview_url);
		}
	}
	return [...urls];
}

export function revokePageMediaPreviewUrls(page: PostPageForm) {
	for (const url of getPageMediaPreviewUrls(page)) {
		revokePreviewUrl(url);
	}
}

export function hasMediaCropRect(page: PostPageForm, elementKey: PageElementKey): boolean {
	const mediaState = getMediaStateForElement(page, elementKey);
	return (
		mediaState.width !== null &&
		mediaState.height !== null &&
		mediaState.media_crop_top_left_x !== null &&
		mediaState.media_crop_top_left_y !== null &&
		mediaState.media_crop_bottom_right_x !== null &&
		mediaState.media_crop_bottom_right_y !== null
	);
}

export function hasCropRect(page: PostPageForm): page is CroppedPostPage {
	const primaryMediaElementKey = getFirstMediaElementKey(page);
	if (!primaryMediaElementKey) {
		return false;
	}
	const mediaState = getMediaStateForElement(page, primaryMediaElementKey);
	return (
		mediaState.width !== null &&
		mediaState.height !== null &&
		mediaState.media_crop_top_left_x !== null &&
		mediaState.media_crop_top_left_y !== null &&
		mediaState.media_crop_bottom_right_x !== null &&
		mediaState.media_crop_bottom_right_y !== null
	);
}

export function hasBackgroundCropRect(page: PostPageForm): boolean {
	return (
		page.background_width !== null &&
		page.background_height !== null &&
		page.background_crop_top_left_x !== null &&
		page.background_crop_top_left_y !== null &&
		page.background_crop_bottom_right_x !== null &&
		page.background_crop_bottom_right_y !== null
	);
}

export function isTextPageElement(element: PageElementType): element is "text" {
	return element === "text";
}

export function getTextStyleForElement(page: PostPageForm, elementKey: PageElementKey): TextElementStyle {
	return page.text_style_by_element[elementKey] ?? DEFAULT_TEXT_ELEMENT_STYLE;
}

export function getTextIsHeadingForElement(page: PostPageForm, elementKey: PageElementKey): boolean {
	const textStyle = getTextStyleForElement(page, elementKey);
	return page.text_is_heading_by_element[elementKey] ?? textStyle !== "caption";
}

export function getTextBackgroundMode(page: PostPageForm, elementKey: PageElementKey): TextBackgroundMode {
	if (page.text_background_full_width_elements.includes(elementKey)) {
		return "full-width";
	}

	if (page.text_background_elements.includes(elementKey)) {
		return "wrap";
	}

	return "off";
}

export function getTextEffectPreset(page: PostPageForm, elementKey: PageElementKey): TextEffectPreset {
	return page.text_effects[elementKey] ?? "none";
}

export function getTextAlignmentSelfValue(alignment: TextAlignment): "flex-start" | "center" | "flex-end" {
	if (alignment === "center") {
		return "center";
	}

	if (alignment === "right") {
		return "flex-end";
	}

	return "flex-start";
}

export function getElementLabelForDisplay(elements: PageElementKey[], targetIndex: number): string {
	const targetKey = elements[targetIndex];
	const targetType = getElementTypeFromKey(targetKey);
	const totalOfType = elements.filter((elementKey) => getElementTypeFromKey(elementKey) === targetType).length;
	if (totalOfType <= 1) {
		return PAGE_ELEMENT_LABEL[targetType];
	}

	let occurrence = 0;
	for (let index = 0; index <= targetIndex; index += 1) {
		if (getElementTypeFromKey(elements[index]) === targetType) {
			occurrence += 1;
		}
	}

	return `${PAGE_ELEMENT_LABEL[targetType]} #${occurrence}`;
}

export function getMediaCropRect(page: PostPageForm, elementKey: PageElementKey): { x1: number; y1: number; x2: number; y2: number } | null {
	const mediaState = getMediaStateForElement(page, elementKey);
	if (mediaState.width === null || mediaState.height === null) {
		return null;
	}

	if (
		mediaState.media_crop_top_left_x === null ||
		mediaState.media_crop_top_left_y === null ||
		mediaState.media_crop_bottom_right_x === null ||
		mediaState.media_crop_bottom_right_y === null
	) {
		return {
			x1: 0,
			y1: 0,
			x2: mediaState.width,
			y2: mediaState.height,
		};
	}

	const x1 = clamp(
		Math.round(Math.min(mediaState.media_crop_top_left_x, mediaState.media_crop_bottom_right_x)),
		0,
		mediaState.width - 1,
	);
	const y1 = clamp(
		Math.round(Math.min(mediaState.media_crop_top_left_y, mediaState.media_crop_bottom_right_y)),
		0,
		mediaState.height - 1,
	);
	const x2 = clamp(
		Math.round(Math.max(mediaState.media_crop_top_left_x, mediaState.media_crop_bottom_right_x)),
		x1 + 1,
		mediaState.width,
	);
	const y2 = clamp(
		Math.round(Math.max(mediaState.media_crop_top_left_y, mediaState.media_crop_bottom_right_y)),
		y1 + 1,
		mediaState.height,
	);

	return { x1, y1, x2, y2 };
}

export function getPageCropRect(page: PostPageForm): { x1: number; y1: number; x2: number; y2: number } | null {
	const primaryMediaElementKey = getFirstMediaElementKey(page);
	return primaryMediaElementKey ? getMediaCropRect(page, primaryMediaElementKey) : null;
}

export function getMediaCropSize(page: PostPageForm, elementKey: PageElementKey, axis: "width" | "height"): number | null {
	const rect = getMediaCropRect(page, elementKey);
	if (!rect) {
		return null;
	}

	return axis === "width" ? Math.max(1, rect.x2 - rect.x1) : Math.max(1, rect.y2 - rect.y1);
}

export function getPageCropSize(page: PostPageForm, axis: "width" | "height"): number | null {
	const rect = getPageCropRect(page);
	if (!rect) {
		return null;
	}

	return axis === "width" ? Math.max(1, rect.x2 - rect.x1) : Math.max(1, rect.y2 - rect.y1);
}

export function getBackgroundCropRect(page: PostPageForm): { x1: number; y1: number; x2: number; y2: number } | null {
	if (page.background_width === null || page.background_height === null) {
		return null;
	}

	if (
		page.background_crop_top_left_x === null ||
		page.background_crop_top_left_y === null ||
		page.background_crop_bottom_right_x === null ||
		page.background_crop_bottom_right_y === null
	) {
		return {
			x1: 0,
			y1: 0,
			x2: page.background_width,
			y2: page.background_height,
		};
	}

	const x1 = clamp(
		Math.round(Math.min(page.background_crop_top_left_x, page.background_crop_bottom_right_x)),
		0,
		page.background_width - 1,
	);
	const y1 = clamp(
		Math.round(Math.min(page.background_crop_top_left_y, page.background_crop_bottom_right_y)),
		0,
		page.background_height - 1,
	);
	const x2 = clamp(
		Math.round(Math.max(page.background_crop_top_left_x, page.background_crop_bottom_right_x)),
		x1 + 1,
		page.background_width,
	);
	const y2 = clamp(
		Math.round(Math.max(page.background_crop_top_left_y, page.background_crop_bottom_right_y)),
		y1 + 1,
		page.background_height,
	);

	return { x1, y1, x2, y2 };
}

export function getBackgroundCropSize(page: PostPageForm, axis: "width" | "height"): number | null {
	const rect = getBackgroundCropRect(page);
	if (!rect) {
		return null;
	}

	return axis === "width" ? Math.max(1, rect.x2 - rect.x1) : Math.max(1, rect.y2 - rect.y1);
}

export function getCropRectByScaleBySize(
	imageWidth: number | null,
	imageHeight: number | null,
	pageScale: PageScaleRatio,
): { x1: number; y1: number; x2: number; y2: number } | null {
	if (imageWidth === null || imageHeight === null) {
		return null;
	}

	const pageScaleDimensions = PAGE_SCALE_DIMENSIONS[pageScale];
	const scaleFactor = pageScaleDimensions.width / pageScaleDimensions.height;
	const cropWidth = Math.max(1, Math.min(imageWidth, Math.round(imageWidth * scaleFactor)));
	const cropHeight = Math.max(1, Math.min(imageHeight, Math.round(imageHeight * scaleFactor)));

	const x1 = Math.max(0, Math.floor((imageWidth - cropWidth) / 2));
	const y1 = Math.max(0, Math.floor((imageHeight - cropHeight) / 2));

	return {
		x1,
		y1,
		x2: Math.min(imageWidth, x1 + cropWidth),
		y2: Math.min(imageHeight, y1 + cropHeight),
	};
}

export function getDefaultMediaCropRectByScale(
	page: PostPageForm,
	elementKey: PageElementKey,
	pageScale: PageScaleRatio,
): { x1: number; y1: number; x2: number; y2: number } | null {
	const mediaState = getMediaStateForElement(page, elementKey);
	return getCropRectByScaleBySize(mediaState.width, mediaState.height, pageScale);
}

export function getDefaultBackgroundCropRectByScale(
	page: PostPageForm,
	pageScale: PageScaleRatio,
): { x1: number; y1: number; x2: number; y2: number } | null {
	return getCropRectByScaleBySize(page.background_width, page.background_height, pageScale);
}

export function getVerticalSliceRectsByScale(
	imageWidth: number,
	imageHeight: number,
	pageScale: PageScaleRatio,
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
	const pageScaleDimensions = PAGE_SCALE_DIMENSIONS[pageScale];
	const sliceHeight = Math.max(1, Math.round((imageWidth * pageScaleDimensions.height) / pageScaleDimensions.width));
	if (imageHeight <= sliceHeight) {
		return [{ x1: 0, y1: 0, x2: imageWidth, y2: imageHeight }];
	}

	const slices: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
	let y = 0;
	while (y + sliceHeight < imageHeight) {
		slices.push({ x1: 0, y1: y, x2: imageWidth, y2: y + sliceHeight });
		y += sliceHeight;
	}

	const lastStartY = Math.max(0, imageHeight - sliceHeight);
	if (slices.length === 0 || slices[slices.length - 1].y1 !== lastStartY) {
		slices.push({ x1: 0, y1: lastStartY, x2: imageWidth, y2: imageHeight });
	}

	return slices;
}

export function getInlineCropCursor(mode: InlineCropDragMode): "move" | "ew-resize" | "ns-resize" {
	if (mode === "resize-left" || mode === "resize-right") {
		return "ew-resize";
	}

	if (mode === "resize-top" || mode === "resize-bottom") {
		return "ns-resize";
	}

	return "move";
}

export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
	const objectUrl = URL.createObjectURL(file);

	try {
		const image = new window.Image();
		image.src = objectUrl;

		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error("Failed to read image dimensions."));
		});

		return {
			width: image.naturalWidth,
			height: image.naturalHeight,
		};
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

export async function getImageDimensionsFromSource(imageSrc: string): Promise<{ width: number; height: number }> {
	const normalizedSrc = normalizeImageSourceCandidate(imageSrc);
	if (!normalizedSrc) {
		throw new Error("Failed to read image dimensions from source URL.");
	}

	const image = new window.Image();
	image.src = normalizedSrc;

	await new Promise<void>((resolve, reject) => {
		image.onload = () => resolve();
		image.onerror = () => reject(new Error("Failed to read image dimensions from source URL."));
	});

	if (image.naturalWidth < 1 || image.naturalHeight < 1) {
		throw new Error("Image source dimensions are invalid.");
	}

	return {
		width: image.naturalWidth,
		height: image.naturalHeight,
	};
}

export async function hydrateEditPageDimensionsFromSources(form: PostForm): Promise<PostForm> {
	const pages = await Promise.all(
		form.pages.map(async (page) => {
			let nextPage = page;
			const nextMediaByElement: Record<PageElementKey, MediaElementForm> = { ...page.media_by_element };
			const mediaElementKeys = getMediaElementKeys(page);
			for (const mediaElementKey of mediaElementKeys) {
				const mediaState = getMediaStateForElement(nextPage, mediaElementKey);
				const mediaSource = mediaState.image_preview_url || mediaState.raw_media_url || mediaState.media_url;
				if (!mediaSource) {
					continue;
				}

				try {
					const mediaDimensions = await getImageDimensionsFromSource(mediaSource);
					nextMediaByElement[mediaElementKey] = {
						...mediaState,
						width: mediaDimensions.width,
						height: mediaDimensions.height,
					};
				} catch {
					// Keep existing persisted dimensions when source probing fails.
				}
			}
			nextPage = {
				...nextPage,
				media_by_element: nextMediaByElement,
			};

			const backgroundSource = page.background_image_preview_url || page.background_media_url;
			if (backgroundSource) {
				try {
					const backgroundDimensions = await getImageDimensionsFromSource(backgroundSource);
					nextPage = {
						...nextPage,
						background_width: backgroundDimensions.width,
						background_height: backgroundDimensions.height,
					};
				} catch {
					// Keep existing persisted dimensions when source probing fails.
				}
			}

			return syncLegacyMediaFieldsFromPrimaryElement(nextPage);
		}),
	);

	return {
		...form,
		pages,
	};
}

export function getJpegFilename(originalFilename: string): string {
	const normalizedName = originalFilename.trim();
	if (normalizedName.length === 0) {
		return "original.jpg";
	}

	const baseName = normalizedName.replace(/\.[^./\\]+$/, "");
	return `${baseName.length > 0 ? baseName : "original"}.jpg`;
}

export async function resizeOriginalImageForUpload(file: File): Promise<File> {
	const objectUrl = URL.createObjectURL(file);

	try {
		const image = new window.Image();
		image.src = objectUrl;

		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error("Failed to load original image for upload."));
		});

		const sourceWidth = image.naturalWidth;
		const sourceHeight = image.naturalHeight;
		if (sourceWidth <= 0 || sourceHeight <= 0) {
			throw new Error("Original image dimensions are invalid.");
		}

		const scale =
			sourceHeight > ORIGINAL_IMAGE_UPLOAD_MAX_HEIGHT_PX ? ORIGINAL_IMAGE_UPLOAD_MAX_HEIGHT_PX / sourceHeight : 1;
		const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
		const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

		const canvas = document.createElement("canvas");
		canvas.width = targetWidth;
		canvas.height = targetHeight;

		const context = canvas.getContext("2d");
		if (!context) {
			throw new Error("Failed to create original image upload canvas.");
		}

		// JPEG has no alpha channel, so use white background before drawing.
		context.fillStyle = "#ffffff";
		context.fillRect(0, 0, targetWidth, targetHeight);
		context.drawImage(image, 0, 0, targetWidth, targetHeight);

		const blob = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(nextBlob) => {
					if (!nextBlob) {
						reject(new Error("Failed to render resized original image."));
						return;
					}

					resolve(nextBlob);
				},
				"image/jpeg",
				ORIGINAL_IMAGE_UPLOAD_JPEG_QUALITY,
			);
		});

		return new File([blob], getJpegFilename(file.name), { type: "image/jpeg", lastModified: Date.now() });
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

export async function objectUrlToFile(objectUrl: string, fileName: string, fallbackMimeType: string): Promise<File> {
	const response = await fetch(objectUrl);
	if (!response.ok) {
		throw new Error("Failed to read cropped image preview.");
	}

	const blob = await response.blob();
	const mimeType = blob.type || fallbackMimeType;
	return new File([blob], fileName, { type: mimeType, lastModified: Date.now() });
}

export async function uploadPageImage(file: File): Promise<{ media_url: string; raw_media_url: string; media_type: string }> {
	const formData = new FormData();
	formData.append("file", file);

	const response = await fetch("/api/uploads/post-image", {
		method: "POST",
		body: formData,
	});

	const data = (await response.json()) as UploadImageResponse;
	if (!response.ok) {
		throw new Error(data.error ?? "Image upload failed.");
	}

	if (!data.media_url || !data.raw_media_url) {
		throw new Error("Upload response is missing media paths.");
	}

	return {
		media_url: data.media_url,
		raw_media_url: data.raw_media_url,
		media_type: data.media_type ?? "image",
	};
}

export async function createCroppedPreviewUrl(
	imageSrc: string,
	rect: { x1: number; y1: number; x2: number; y2: number },
): Promise<string> {
	return await new Promise<string>((resolve, reject) => {
		const normalizedSrc = normalizeImageSourceCandidate(imageSrc);
		if (!normalizedSrc) {
			reject(new Error("Failed to load image for crop preview."));
			return;
		}

		const processLoadedImage = (image: HTMLImageElement) => {
			const imageWidth = image.naturalWidth;
			const imageHeight = image.naturalHeight;

			const x1 = clamp(Math.round(Math.min(rect.x1, rect.x2)), 0, imageWidth - 1);
			const y1 = clamp(Math.round(Math.min(rect.y1, rect.y2)), 0, imageHeight - 1);
			const x2 = clamp(Math.round(Math.max(rect.x1, rect.x2)), x1 + 1, imageWidth);
			const y2 = clamp(Math.round(Math.max(rect.y1, rect.y2)), y1 + 1, imageHeight);
			const cropWidth = x2 - x1;
			const cropHeight = y2 - y1;

			const canvas = document.createElement("canvas");
			canvas.width = cropWidth;
			canvas.height = cropHeight;

			const context = canvas.getContext("2d");
			if (!context) {
				reject(new Error("Failed to create crop preview canvas."));
				return;
			}

			context.drawImage(image, x1, y1, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
			try {
				canvas.toBlob((blob) => {
					if (!blob) {
						reject(new Error("Failed to render cropped preview."));
						return;
					}

					resolve(URL.createObjectURL(blob));
				}, "image/png");
			} catch (error) {
				if (error instanceof DOMException && error.name === "SecurityError") {
					reject(
						new Error(
							"This image URL blocks browser canvas export (CORS). Crop coordinates were still applied, but cropped preview cannot be generated.",
						),
					);
					return;
				}

				reject(error instanceof Error ? error : new Error("Failed to render cropped preview."));
			}
		};

		const loadWithMode = (useAnonymousCors: boolean, onError: () => void) => {
			const image = new window.Image();
			if (useAnonymousCors) {
				image.crossOrigin = "anonymous";
			}
			image.onload = () => processLoadedImage(image);
			image.onerror = onError;
			image.src = normalizedSrc;
		};

		const isAbsolute = /^(https?:)?\/\//i.test(normalizedSrc);
		if (isAbsolute) {
			loadWithMode(true, () => {
				loadWithMode(false, () => {
					reject(new Error("Failed to load image for crop preview."));
				});
			});
			return;
		}

		loadWithMode(false, () => {
			reject(new Error("Failed to load image for crop preview."));
		});
	});
}

export async function waitForRenderedImages(node: HTMLElement): Promise<void> {
	const images = Array.from(node.querySelectorAll("img"));
	if (images.length === 0) {
		return;
	}

	await Promise.all(
		images.map(
			(image) =>
				new Promise<void>((resolve, reject) => {
					if (image.complete) {
						if (image.naturalWidth > 0) {
							resolve();
						} else {
							reject(new Error("A preview image failed to load."));
						}
						return;
					}

					const timeout = window.setTimeout(() => {
						cleanup();
						reject(new Error("Timed out while waiting for preview image to load."));
					}, 8000);

					const cleanup = () => {
						window.clearTimeout(timeout);
						image.removeEventListener("load", onLoad);
						image.removeEventListener("error", onError);
					};

					const onLoad = () => {
						cleanup();
						resolve();
					};

					const onError = () => {
						cleanup();
						reject(new Error("A preview image failed to load."));
					};

					image.addEventListener("load", onLoad);
					image.addEventListener("error", onError);
				}),
		),
	);
}

export function imageElementToDataUrl(image: HTMLImageElement): string {
	const width = image.naturalWidth || image.width;
	const height = image.naturalHeight || image.height;

	if (width < 1 || height < 1) {
		throw new Error("Preview image dimensions are invalid.");
	}

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Failed to create image export canvas.");
	}

	context.drawImage(image, 0, 0, width, height);
	return canvas.toDataURL("image/png");
}

function shouldUseImageDataUrlForExport(source: string): boolean {
	if (source.startsWith("blob:")) {
		return true;
	}
	if (source.startsWith("/api/image-proxy?")) {
		return true;
	}
	if (typeof window !== "undefined") {
		const originPrefix = `${window.location.origin}/api/image-proxy?`;
		if (source.startsWith(originPrefix)) {
			return true;
		}
	}
	return false;
}

export async function buildImageSourceReplacementMap(node: HTMLElement): Promise<Map<string, string>> {
	const sourceMap = new Map<string, string>();
	const images = Array.from(node.querySelectorAll("img"));

	for (const image of images) {
		const source = image.currentSrc || image.src;
		if (!source || sourceMap.has(source) || !shouldUseImageDataUrlForExport(source)) {
			continue;
		}

		try {
			sourceMap.set(source, imageElementToDataUrl(image));
		} catch {
			// Keep original image source if canvas conversion fails.
		}
	}

	return sourceMap;
}

export async function swapBlobSourcesForExport(node: HTMLElement): Promise<() => void> {
	const replacementMap = await buildImageSourceReplacementMap(node);
	if (replacementMap.size === 0) {
		return () => {};
	}

	const images = Array.from(node.querySelectorAll("img"));
	const originalSources: Array<{ image: HTMLImageElement; src: string | null; srcset: string | null }> = [];

	for (const image of images) {
		const source = image.currentSrc || image.src;
		const replacement = replacementMap.get(source);
		if (!replacement) {
			continue;
		}

		originalSources.push({
			image,
			src: image.getAttribute("src"),
			srcset: image.getAttribute("srcset"),
		});

		image.removeAttribute("srcset");
		image.setAttribute("src", replacement);
	}

	return () => {
		for (const original of originalSources) {
			if (original.src === null) {
				original.image.removeAttribute("src");
			} else {
				original.image.setAttribute("src", original.src);
			}

			if (original.srcset === null) {
				original.image.removeAttribute("srcset");
			} else {
				original.image.setAttribute("srcset", original.srcset);
			}
		}
	};
}

export async function renderPreviewNodeToBlob(previewNode: HTMLElement, backgroundColor: string): Promise<Blob> {
	await waitForRenderedImages(previewNode);
	const restoreBlobSources = await swapBlobSourcesForExport(previewNode);

	try {
		const { toBlob } = await import("html-to-image");
		const blob = await toBlob(previewNode, {
			cacheBust: true,
			pixelRatio: 2,
			backgroundColor,
			imagePlaceholder:
				"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
		});

		if (!blob) {
			throw new Error("Failed to render preview image.");
		}

		return blob;
	} finally {
		restoreBlobSources();
	}
}
