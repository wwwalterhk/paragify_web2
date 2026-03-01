// Shared types, constants, and pure helpers for the add-post editor.

export const NOIR_TRANSLUCENT_CJK_FONT_STACK =
	"'Noto Sans TC', 'PingFang TC', 'Heiti TC', 'Microsoft JhengHei', 'Avenir Next', 'Segoe UI', sans-serif";

export type Visibility = "public" | "followers" | "private";
export type PageElementType = "background" | "text" | "media";
export type TextElementStyle = "h1" | "h2" | "h3" | "h4" | "caption";
export type PageElementKey = string;
export type PreviewDraggableElement = PageElementKey;
export type HeadingElementStyle = Exclude<TextElementStyle, "caption">;
export type PageContainerPaddingSide = "top" | "right" | "left" | "bottom";
export type ElementMarginSide = "top" | "right" | "left" | "bottom";
export type MediaFitMode = "width" | "cover" | "repeat";
export type TextAlignment = "left" | "center" | "right";
export type TextBackgroundMode = "off" | "wrap" | "full-width";
export type TextEffectPreset = "none" | "shadow" | "glow" | "outline";
export type BackgroundEffectPreset = "none" | "blur-soft" | "blur-strong" | "dim" | "blur-dim";
export type PostTemplateId = "noir_translucent";
export type PageScaleRatio = "4:5" | "3:4" | "1:1";

export type TemplateElementStyle = {
	fontFamily: string;
	fontSizePx: number;
	fontWeight: number;
	color: string;
	backgroundColor: string;
};

export type TemplateHashtagStyle = {
	color: string;
	backgroundColor: string;
	fontWeight: number;
	paddingXpx: number;
	paddingYpx: number;
	borderRadiusPx: number;
};

export type TemplateTextBackgroundStyle = {
	paddingXpx: number;
	paddingYpx: number;
	borderRadiusPx: number;
};

export type PostTemplate = {
	id: PostTemplateId;
	name: string;
	pageBackgroundColor: string;
	elements: Record<TextElementStyle, TemplateElementStyle>;
	textBackground: TemplateTextBackgroundStyle;
	hashtag: TemplateHashtagStyle;
};

export type UploadImageResponse = {
	error?: string;
	media_url?: string;
	raw_media_url?: string;
	media_type?: string;
};

export type ExistingPostApiResponse = {
	ok: boolean;
	post?: {
		post_id: number;
		post_slug: string | null;
		user_pk: number;
		locale: string | null;
		caption: string | null;
		show_page_content: number | null;
		custom_content: string | null;
		title: string | null;
		template_id: string | null;
		visibility: string;
		created_at: string | null;
		updated_at: string | null;
	};
	pages?: Array<{
		post_id: number;
		page_num: number;
		media_url: string | null;
		raw_media_url: string | null;
		bg_media_url: string | null;
		media_type: string | null;
		width: number | null;
		height: number | null;
		media_crop_top_left_x: number | null;
		media_crop_top_left_y: number | null;
		media_crop_bottom_right_x: number | null;
		media_crop_bottom_right_y: number | null;
		alt_text: string | null;
		title: string | null;
		h1: string | null;
		h2: string | null;
		h3: string | null;
		h4: string | null;
		caption: string | null;
		layout_json: string | null;
	}>;
	message?: string;
	detail?: string;
};

export type InlineCropDragMode = "move" | "resize-left" | "resize-right" | "resize-top" | "resize-bottom";
export type CropTarget = "media" | "background";

export type InlineCropDragState = {
	pageIndex: number;
	target: CropTarget;
	mediaElementKey: PageElementKey | null;
	pointerId: number;
	mode: InlineCropDragMode;
	containerRect: {
		left: number;
		top: number;
		width: number;
		height: number;
	};
	startPointerX: number;
	startPointerY: number;
	startRect: {
		x1: number;
		y1: number;
		x2: number;
		y2: number;
	};
	currentRect: {
		x1: number;
		y1: number;
		x2: number;
		y2: number;
	};
};

export type CoverInlineCropDragState = {
	slotId: string;
	pointerId: number;
	mode: InlineCropDragMode;
	containerRect: {
		left: number;
		top: number;
		width: number;
		height: number;
	};
	startPointerX: number;
	startPointerY: number;
	startRect: {
		x1: number;
		y1: number;
		x2: number;
		y2: number;
	};
	currentRect: {
		x1: number;
		y1: number;
		x2: number;
		y2: number;
	};
};

export type PreviewMarginDragState = {
	pageIndex: number;
	element: PreviewDraggableElement;
	previousElement: PreviewDraggableElement | null;
	previousElementStartBottom: number;
	pointerId: number;
	startClientX: number;
	startClientY: number;
	startMargin: Record<ElementMarginSide, number>;
};

export type MediaElementForm = {
	image_file: File | null;
	image_preview_url: string | null;
	cropped_preview_url: string | null;
	media_url: string | null;
	raw_media_url: string | null;
	width: number | null;
	height: number | null;
	media_crop_top_left_x: number | null;
	media_crop_top_left_y: number | null;
	media_crop_bottom_right_x: number | null;
	media_crop_bottom_right_y: number | null;
	media_fit_mode: MediaFitMode;
};

export type PostPageForm = {
	elements: PageElementKey[];
	hiddenElements: PageElementKey[];
	center_single_media: boolean;
	text_background_elements: PageElementKey[];
	text_background_full_width_elements: PageElementKey[];
	text_alignments: Record<PageElementKey, TextAlignment>;
	text_effects: Record<PageElementKey, TextEffectPreset>;
	element_corner_radius_px: Record<PageElementKey, number | null>;
	element_padding_px: Record<PageElementKey, number>;
	element_margin_px: Record<PageElementKey, Record<ElementMarginSide, number>>;
	text_by_element: Record<PageElementKey, string>;
	text_style_by_element: Record<PageElementKey, TextElementStyle>;
	text_is_heading_by_element: Record<PageElementKey, boolean>;
	text_color_by_element: Record<PageElementKey, string | null>;
	text_background_color_by_element: Record<PageElementKey, string | null>;
	text_background_translucency_by_element: Record<PageElementKey, number | null>;
	media_by_element: Record<PageElementKey, MediaElementForm>;
	container_padding_px: Record<PageContainerPaddingSide, number>;
	image_file: File | null;
	image_preview_url: string | null;
	cropped_preview_url: string | null;
	media_url: string | null;
	raw_media_url: string | null;
	background_image_file: File | null;
	background_image_preview_url: string | null;
	background_cropped_preview_url: string | null;
	background_media_url: string | null;
	background_color: string | null;
	background_gradient_color: string | null;
	background_width: number | null;
	background_height: number | null;
	width: number | null;
	height: number | null;
	media_crop_top_left_x: number | null;
	media_crop_top_left_y: number | null;
	media_crop_bottom_right_x: number | null;
	media_crop_bottom_right_y: number | null;
	media_fit_mode: MediaFitMode;
	background_fit_mode: MediaFitMode;
	background_effect_preset: BackgroundEffectPreset;
	background_crop_top_left_x: number | null;
	background_crop_top_left_y: number | null;
	background_crop_bottom_right_x: number | null;
	background_crop_bottom_right_y: number | null;
};

export type PostForm = {
	user_pk: string;
	locale: string;
	title: string;
	show_page_content: boolean;
	custom_content: string;
	template_id: PostTemplateId;
	page_scale: PageScaleRatio;
	visibility: Visibility;
	pages: PostPageForm[];
};

export type CoverDesignerDraft = {
	eyebrow: string;
	title: string;
	subtitle: string;
	meta: string;
	hashtags: string;
};
export type CoverDesignerTemplateId = "default" | "dual_news" | "warning_alert" | "royal_bold" | "crypto_bulletin";
export type CoverDesignerMediaSlotState = {
	image_file: File | null;
	image_preview_url: string | null;
	cropped_preview_url: string | null;
	media_url: string | null;
	raw_media_url: string | null;
	width: number | null;
	height: number | null;
	crop_top_left_x: number | null;
	crop_top_left_y: number | null;
	crop_bottom_right_x: number | null;
	crop_bottom_right_y: number | null;
};
export type CoverDesignerMediaState = Record<string, CoverDesignerMediaSlotState>;
export type CoverDesignerMediaSlotConfig = {
	id: string;
	label: string;
	required: boolean;
	accept: string;
	helperText?: string;
};
export type CoverDesignerTemplateConfig = {
	mediaSlots: CoverDesignerMediaSlotConfig[];
};

export type CroppedPostPage = PostPageForm & {
	width: number;
	height: number;
	media_crop_top_left_x: number;
	media_crop_top_left_y: number;
	media_crop_bottom_right_x: number;
	media_crop_bottom_right_y: number;
};

export const PAGE_ELEMENT_ORDER: PageElementType[] = ["background", "text", "media"];
export const PREVIEW_DRAGGABLE_ELEMENT_TYPES: Array<Exclude<PageElementType, "background">> = ["text", "media"];

export const PAGE_ELEMENT_LABEL: Record<PageElementType, string> = {
	background: "Background",
	text: "Text",
	media: "Media",
};
export const TEXT_ELEMENT_STYLES: TextElementStyle[] = ["h1", "h2", "h3", "h4", "caption"];
export const TEXT_ELEMENT_STYLE_LABEL: Record<TextElementStyle, string> = {
	h1: "H1",
	h2: "H2",
	h3: "H3",
	h4: "H4",
	caption: "Caption",
};
export const TEXT_STYLE_OPTIONS: Array<{ value: TextElementStyle; label: string }> = TEXT_ELEMENT_STYLES.map((style) => ({
	value: style,
	label: `Style: ${TEXT_ELEMENT_STYLE_LABEL[style]}`,
}));
export const TEXT_ALIGNMENT_OPTIONS: Array<{ value: TextAlignment; label: string }> = [
	{ value: "left", label: "Left" },
	{ value: "center", label: "Center" },
	{ value: "right", label: "Right" },
];
export const TEXT_BACKGROUND_MODE_OPTIONS: Array<{ value: TextBackgroundMode; label: string }> = [
	{ value: "off", label: "BG: Off" },
	{ value: "wrap", label: "BG: Wrap Text" },
	{ value: "full-width", label: "BG: Full Width" },
];
export const TEXT_BACKGROUND_TRANSLUCENCY_OPTIONS: number[] = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
export const PAGE_SCALE_OPTIONS: Array<{ value: PageScaleRatio; label: string }> = [
	{ value: "4:5", label: "4:5 (Default)" },
	{ value: "3:4", label: "3:4" },
	{ value: "1:1", label: "1.0 (Square)" },
];
export const PAGE_SCALE_DIMENSIONS: Record<PageScaleRatio, { width: number; height: number }> = {
	"4:5": { width: 4, height: 5 },
	"3:4": { width: 3, height: 4 },
	"1:1": { width: 1, height: 1 },
};
export const TEXT_EFFECT_OPTIONS: Array<{ value: TextEffectPreset; label: string }> = [
	{ value: "none", label: "FX: None" },
	{ value: "shadow", label: "FX: Shadow" },
	{ value: "glow", label: "FX: Glow" },
	{ value: "outline", label: "FX: Outline" },
];
export const TEXT_EFFECT_STYLES: Record<TextEffectPreset, { textShadow?: string }> = {
	none: {},
	shadow: {
		textShadow: "0 2px 10px rgba(0, 0, 0, 0.45)",
	},
	glow: {
		textShadow: "0 0 7px rgba(255, 255, 255, 0.7), 0 0 14px rgba(255, 255, 255, 0.45)",
	},
	outline: {
		textShadow:
			"-1px -1px 0 rgba(0, 0, 0, 0.8), 1px -1px 0 rgba(0, 0, 0, 0.8), -1px 1px 0 rgba(0, 0, 0, 0.8), 1px 1px 0 rgba(0, 0, 0, 0.8)",
	},
};
export const BACKGROUND_EFFECT_OPTIONS: Array<{ value: BackgroundEffectPreset; label: string }> = [
	{ value: "none", label: "None" },
	{ value: "blur-soft", label: "Blur (Soft)" },
	{ value: "blur-strong", label: "Blur (Strong)" },
	{ value: "dim", label: "Dim" },
	{ value: "blur-dim", label: "Blur + Dim" },
];
export const BACKGROUND_EFFECT_PRESET_STYLES: Record<
	BackgroundEffectPreset,
	{ filter: string; overlayColor: string | null; scale: number }
> = {
	none: {
		filter: "none",
		overlayColor: null,
		scale: 1,
	},
	"blur-soft": {
		filter: "blur(4px)",
		overlayColor: "rgba(0, 0, 0, 0.12)",
		scale: 1.02,
	},
	"blur-strong": {
		filter: "blur(8px)",
		overlayColor: "rgba(0, 0, 0, 0.2)",
		scale: 1.04,
	},
	dim: {
		filter: "brightness(0.74)",
		overlayColor: "rgba(0, 0, 0, 0.12)",
		scale: 1,
	},
	"blur-dim": {
		filter: "blur(6px) brightness(0.7)",
		overlayColor: "rgba(0, 0, 0, 0.22)",
		scale: 1.03,
	},
};
export const DEFAULT_TEXT_ALIGNMENTS: Record<TextElementStyle, TextAlignment> = {
	h1: "left",
	h2: "left",
	h3: "left",
	h4: "left",
	caption: "left",
};
export const DEFAULT_TEXT_EFFECTS: Record<TextElementStyle, TextEffectPreset> = {
	h1: "none",
	h2: "none",
	h3: "none",
	h4: "none",
	caption: "none",
};
export const DEFAULT_TEXT_ELEMENT_STYLE: TextElementStyle = "h1";
export const ELEMENT_CORNER_RADIUS_OPTIONS_PX = [0, 4, 8, 12, 16, 20, 24] as const;
export const DEFAULT_MEDIA_ELEMENT_CORNER_RADIUS_PX = 8;
export const ELEMENT_PADDING_OPTIONS_PX = [0, 4, 8, 12, 16, 20, 24] as const;
export const ELEMENT_MARGIN_OPTIONS_PX = [0, 4, 8, 12, 16, 20, 24, 32] as const;
export const DEFAULT_ELEMENT_PADDING_PX = 0;
export const DEFAULT_ELEMENT_MARGIN_PX: Record<ElementMarginSide, number> = {
	top: 0,
	right: 0,
	left: 0,
	bottom: 8,
};
export const ELEMENT_MARGIN_SIDES: Array<{ side: ElementMarginSide; label: string }> = [
	{ side: "top", label: "T" },
	{ side: "right", label: "R" },
	{ side: "bottom", label: "B" },
	{ side: "left", label: "L" },
];
export const PAGE_CONTAINER_PADDING_OPTIONS_PX = [0, 4, 8, 12, 16, 20, 24] as const;
export const PAGE_CONTAINER_PADDING_SIDES: Array<{ side: PageContainerPaddingSide; label: string }> = [
	{ side: "top", label: "Top" },
	{ side: "right", label: "Right" },
	{ side: "left", label: "Left" },
	{ side: "bottom", label: "Bottom" },
];
export const DEFAULT_PAGE_CONTAINER_PADDING_PX = 12;
export const CDN_MEDIA_BASE_URL = "https://cdn.paragify.com";
export const EDIT_MODE_LAYOUT_BASE_WIDTH_PX = 1080;
export const EDIT_MODE_LAYOUT_BASE_HEIGHT_PX = 1350;
export const EDIT_MODE_EDITOR_REFERENCE_WIDTH_PX = 360;
export const EDIT_MODE_LAYOUT_UNIT_SCALE = EDIT_MODE_EDITOR_REFERENCE_WIDTH_PX / EDIT_MODE_LAYOUT_BASE_WIDTH_PX;
export const EDIT_MODE_SPACING_SCALE_TRIGGER_PX = Math.max(
	...PAGE_CONTAINER_PADDING_OPTIONS_PX,
	...ELEMENT_PADDING_OPTIONS_PX,
	...ELEMENT_MARGIN_OPTIONS_PX,
);

export const POST_TEMPLATES: PostTemplate[] = [
	{
		id: "noir_translucent",
		name: "Noir Translucent",
		pageBackgroundColor: "#05070d",
		elements: {
			h1: {
				fontFamily: NOIR_TRANSLUCENT_CJK_FONT_STACK,
				fontSizePx: 40,
				fontWeight: 900,
				color: "#f8fafc",
				backgroundColor: "rgba(15, 23, 42, 0.46)",
			},
			h2: {
				fontFamily: NOIR_TRANSLUCENT_CJK_FONT_STACK,
				fontSizePx: 30,
				fontWeight: 800,
				color: "#e2e8f0",
				backgroundColor: "rgba(30, 41, 59, 0.42)",
			},
			h3: {
				fontFamily: NOIR_TRANSLUCENT_CJK_FONT_STACK,
				fontSizePx: 24,
				fontWeight: 700,
				color: "#cbd5e1",
				backgroundColor: "rgba(51, 65, 85, 0.38)",
			},
			h4: {
				fontFamily: NOIR_TRANSLUCENT_CJK_FONT_STACK,
				fontSizePx: 19,
				fontWeight: 700,
				color: "#cfe3ff",
				backgroundColor: "rgba(30, 58, 138, 0.34)",
			},
			caption: {
				fontFamily: NOIR_TRANSLUCENT_CJK_FONT_STACK,
				fontSizePx: 16,
				fontWeight: 500,
				color: "#cbd5e1",
				backgroundColor: "rgba(2, 6, 23, 0.4)",
			},
		},
		textBackground: {
			paddingXpx: 10,
			paddingYpx: 5,
			borderRadiusPx: 10,
		},
		hashtag: {
			color: "#dbeafe",
			backgroundColor: "rgba(30, 58, 138, 0.42)",
			fontWeight: 700,
			paddingXpx: 8,
			paddingYpx: 2,
			borderRadiusPx: 8,
		},
	},
];
export const DEFAULT_TEMPLATE_ID: PostTemplateId = "noir_translucent";
export const DEFAULT_PAGE_SCALE: PageScaleRatio = "4:5";
export const DEFAULT_COVER_DESIGNER_TEMPLATE_ID: CoverDesignerTemplateId = "default";
export const DEFAULT_COVER_DESIGNER_DRAFT: CoverDesignerDraft = {
	eyebrow: "COVER STORY",
	title: "Your Cover Title",
	subtitle: "Draft a short hook for the first impression.",
	meta: "@your_handle  |  swipe for details",
	hashtags: "#news #cover #story",
};
export const COVER_DESIGNER_TEMPLATE_OPTIONS: Array<{ value: CoverDesignerTemplateId; label: string }> = [
	{ value: "default", label: "Default" },
	{ value: "dual_news", label: "Dual News (2 Images)" },
	{ value: "warning_alert", label: "Warning Alert (1 Image)" },
	{ value: "royal_bold", label: "Royal Bold (1 Image)" },
	{ value: "crypto_bulletin", label: "Crypto Bulletin (1 Image)" },
];
export const COVER_DESIGNER_TEMPLATE_CONFIG: Record<CoverDesignerTemplateId, CoverDesignerTemplateConfig> = {
	default: {
		mediaSlots: [
			{
				id: "cover-image",
				label: "Cover image",
				required: true,
				accept: "image/*",
				helperText: "Required for Default template.",
			},
		],
	},
	dual_news: {
		mediaSlots: [
			{
				id: "cover-image-main",
				label: "Main image",
				required: true,
				accept: "image/*",
				helperText: "Required. Used for top/middle visual.",
			},
			{
				id: "cover-image-secondary",
				label: "Secondary image",
				required: true,
				accept: "image/*",
				helperText: "Required. Used for lower visual.",
			},
			],
		},
		warning_alert: {
			mediaSlots: [
				{
					id: "cover-image",
					label: "Cover image",
					required: true,
					accept: "image/*",
					helperText: "Required. Used for the warning headline layout.",
				},
			],
		},
		royal_bold: {
			mediaSlots: [
				{
					id: "cover-image",
					label: "Cover image",
					required: true,
					accept: "image/*",
					helperText: "Required. Used for the royal bold headline layout.",
				},
			],
		},
		crypto_bulletin: {
			mediaSlots: [
				{
					id: "cover-image",
					label: "Cover image",
					required: true,
					accept: "image/*",
					helperText: "Required. Used for the crypto bulletin layout.",
				},
			],
		},
};

export function isTemplateId(value: string | null): value is PostTemplateId {
	return value === "noir_translucent";
}

export function isVisibilityValue(value: string | null): value is Visibility {
	return value === "public" || value === "followers" || value === "private";
}

export function isMediaFitModeValue(value: unknown): value is MediaFitMode {
	return value === "width" || value === "cover" || value === "repeat";
}

export function isTextAlignmentValue(value: unknown): value is TextAlignment {
	return value === "left" || value === "center" || value === "right";
}

export function isTextEffectPresetValue(value: unknown): value is TextEffectPreset {
	return value === "none" || value === "shadow" || value === "glow" || value === "outline";
}

export function isTextElementStyleValue(value: unknown): value is TextElementStyle {
	return typeof value === "string" && TEXT_ELEMENT_STYLES.includes(value as TextElementStyle);
}

export function isBackgroundEffectPresetValue(value: unknown): value is BackgroundEffectPreset {
	return value === "none" || value === "blur-soft" || value === "blur-strong" || value === "dim" || value === "blur-dim";
}

export function isPageScaleRatioValue(value: unknown): value is PageScaleRatio {
	return value === "4:5" || value === "3:4" || value === "1:1";
}

export const HASHTAG_SPLIT_PATTERN = /(#[\p{L}\p{N}\p{M}_]+)/gu;
export const HASHTAG_SEGMENT_PATTERN = /^#[\p{L}\p{N}\p{M}_]+$/u;
export const ORIGINAL_IMAGE_UPLOAD_MAX_HEIGHT_PX = 1280;
export const ORIGINAL_IMAGE_UPLOAD_JPEG_QUALITY = 0.9;

export const PREVIEW_HEADING_CLASS: Record<HeadingElementStyle, string> = {
	h1: "leading-tight",
	h2: "leading-tight",
	h3: "leading-snug",
	h4: "leading-snug",
};

export const PAGE_ELEMENT_KEY_SEPARATOR = "::";
let pageElementKeySequence = 0;

export function isPageElementType(value: unknown): value is PageElementType {
	return typeof value === "string" && PAGE_ELEMENT_ORDER.includes(value as PageElementType);
}

export function createElementKey(type: PageElementType, seed?: string): PageElementKey {
	const suffix =
		seed && seed.trim().length > 0
			? seed.trim()
			: `k${pageElementKeySequence++}`;
	return `${type}${PAGE_ELEMENT_KEY_SEPARATOR}${suffix}`;
}

export function getElementTypeFromKey(key: PageElementKey): PageElementType {
	const [rawType] = key.split(PAGE_ELEMENT_KEY_SEPARATOR);
	if (isPageElementType(rawType)) {
		return rawType;
	}
	return "text";
}

export function createElementScopedDefaults(elementKeys: PageElementKey[]) {
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

	for (const key of elementKeys) {
		const elementType = getElementTypeFromKey(key);
		const isTextElement = elementType === "text";
		const textStyle = isTextElement ? DEFAULT_TEXT_ELEMENT_STYLE : null;
		textAlignments[key] = textStyle ? DEFAULT_TEXT_ALIGNMENTS[textStyle] : "left";
		textEffects[key] = textStyle ? DEFAULT_TEXT_EFFECTS[textStyle] : "none";
		elementCornerRadius[key] = null;
		elementPadding[key] = DEFAULT_ELEMENT_PADDING_PX;
		elementMargins[key] = { ...DEFAULT_ELEMENT_MARGIN_PX };
		if (isTextElement) {
			textByElement[key] = "";
			const resolvedTextStyle = textStyle ?? DEFAULT_TEXT_ELEMENT_STYLE;
			textStyleByElement[key] = resolvedTextStyle;
			textIsHeadingByElement[key] = resolvedTextStyle !== "caption";
			textColorByElement[key] = null;
			textBackgroundColorByElement[key] = null;
			textBackgroundTranslucencyByElement[key] = null;
		}
	}

	return {
		textAlignments,
		textEffects,
		elementCornerRadius,
		elementPadding,
		elementMargins,
		textByElement,
		textStyleByElement,
		textIsHeadingByElement,
		textColorByElement,
		textBackgroundColorByElement,
		textBackgroundTranslucencyByElement,
	};
}
