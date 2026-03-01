"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon, ArrowDownTrayIcon, DocumentPlusIcon, PlusCircleIcon, TrashIcon, CloudArrowUpIcon, ChevronDoubleUpIcon, ChevronUpIcon, ChevronDownIcon, ChevronDoubleDownIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";
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

import {
  EMPTY_COVER_DESIGNER_MEDIA_SLOT_STATE,
  buildResolvedPostContent,
  clamp,
  createCroppedPreviewUrl,
  createDefaultCoverDesignerMediaSlotState,
  createDefaultMediaElementState,
  createEmptyPage,
  createFormFromExistingPostResponse,
  createInitialCoverDesignerMediaState,
  detectBrowserLocale,
  getAutoFittedSingleLineFontSizePx,
  getBackgroundCropRect,
  getBackgroundCropSize,
  getColorInputValue,
  getColorWithTranslucency,
  getCropRectByScaleBySize,
  getDefaultBackgroundCropRectByScale,
  getDefaultMediaCropRectByScale,
  getElementLabelForDisplay,
  getElementMarginSelectOptions,
  getImageDimensions,
  getImageDimensionsFromSource,
  getInlineCropCursor,
  getMediaCropRect,
  getMediaCropSize,
  getMediaElementKeys,
  getMediaStateForElement,
  getPageBackgroundSurfaceStyle,
  getPageContainerPaddingSelectOptions,
  getPageMediaPreviewUrls,
  getPostTemplate,
  getTemplateTextBackgroundDefaults,
  getTemplateTextBackgroundEffectStyle,
  getTextAlignmentSelfValue,
  getTextBackgroundMode,
  getTextBackgroundTranslucencyOptions,
  getTextBackgroundTranslucencyPercent,
  getTextEffectPreset,
  getTextIsHeadingForElement,
  getTextStyleForElement,
  getVerticalSliceRectsByScale,
  getVisibleMediaElementKeys,
  hasBackgroundCropRect,
  hasMediaCropRect,
  hydrateEditPageDimensionsFromSources,
  initialForm,
  inputClassName,
  isTextPageElement,
  labelClassName,
  normalizeDraggedMarginValue,
  normalizeHexColorToSix,
  normalizePageElementCollections,
  normalizeTranslucencyPercent,
  objectUrlToFile,
  parseOptionalInteger,
  renderPreviewNodeToBlob,
  renderTextWithHashtags,
  resizeOriginalImageForUpload,
  resizeTextareaToContent,
  revokePageMediaPreviewUrls,
  revokePreviewUrl,
  syncLegacyMediaFieldsFromPrimaryElement,
  toOptionalHexColor,
  toOptionalTranslucencyPercent,
  uploadPageImage,
} from "./editor-helpers";
import { CoverPreviewCanvas } from "./cover-preview-canvas";

type ImportedJsonCrop = {
  x1?: unknown;
  y1?: unknown;
  x2?: unknown;
  y2?: unknown;
};

type ImportedJsonHeadingImage = {
  url?: unknown;
  heading?: unknown;
  desc?: unknown;
  crop?: ImportedJsonCrop;
};

type ImportedJsonParagraph = {
  type?: unknown;
  heading?: unknown;
  content?: unknown;
  url?: unknown;
  background_image?: unknown;
  crop?: ImportedJsonCrop;
  background_color?: unknown;
  heading_color?: unknown;
  content_color?: unknown;
};

type ImportedPostJsonPayload = {
  title?: unknown;
  eyeblow?: unknown;
  eyebrow?: unknown;
  subtitle?: unknown;
  footer_line?: unknown;
  heading_hashtags?: unknown;
  heading_image_1?: ImportedJsonHeadingImage;
  heading_image_2?: ImportedJsonHeadingImage;
  paragraphs?: ImportedJsonParagraph[];
};

type ImportedJsonCropSavePayload = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type ImportedJsonHeadingImageSavePayload = {
  url?: string;
  heading?: string;
  desc?: string;
  crop?: ImportedJsonCropSavePayload;
};

type ImportedJsonParagraphSavePayload = {
  type: "p" | "image" | "hashtags";
  heading?: string;
  content?: string;
  url?: string;
  background_image?: string;
  crop?: ImportedJsonCropSavePayload;
  background_color?: string;
  heading_color?: string;
  content_color?: string;
};

type ImportedPostJsonSavePayload = {
  title?: string;
  eyeblow?: string;
  subtitle?: string;
  footer_line?: string;
  heading_hashtags?: string;
  heading_image_1?: ImportedJsonHeadingImageSavePayload;
  heading_image_2?: ImportedJsonHeadingImageSavePayload;
  paragraphs: ImportedJsonParagraphSavePayload[];
};

const TEXT_STYLE_SCALE_ORDER: TextElementStyle[] = ["caption", "h4", "h3", "h2", "h1"];

function getTextStyleScaleIndex(style: TextElementStyle): number {
  return TEXT_STYLE_SCALE_ORDER.indexOf(style);
}

function getTextStyleByScaleIndex(index: number): TextElementStyle {
  return TEXT_STYLE_SCALE_ORDER[clamp(index, 0, TEXT_STYLE_SCALE_ORDER.length - 1)] ?? "caption";
}

function shiftTextStyleByStep(style: TextElementStyle, step: number): TextElementStyle {
  return getTextStyleByScaleIndex(getTextStyleScaleIndex(style) + step);
}

function buildTextDisplayContent(coverDraft: CoverDesignerDraft, resolvedPostContent: string): string {
  const coverDisplayContent = [
    coverDraft.eyebrow.trim(),
    coverDraft.title.trim(),
    coverDraft.subtitle.trim(),
    coverDraft.meta.trim(),
    coverDraft.hashtags.trim(),
  ]
    .filter((line) => line.length > 0)
    .join(" · ");

  return [coverDisplayContent, resolvedPostContent.trim()]
    .filter((section) => section.length > 0)
    .join("\n\n");
}

export default function AddPostPage() {
  const [requestedEditPostId, setRequestedEditPostId] = useState<number | null>(null);
  const isEditMode = requestedEditPostId !== null;

  const [form, setForm] = useState<PostForm>(initialForm);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEditPost, setLoadingEditPost] = useState(false);
  const [loadedEditPostId, setLoadedEditPostId] = useState<number | null>(null);
  const [savingPreviewImage, setSavingPreviewImage] = useState(false);
  const [uploadingPageIndex, setUploadingPageIndex] = useState<number | null>(null);
  const [dragOverMediaTarget, setDragOverMediaTarget] = useState<string | null>(null);
  const [dragOverBackgroundPageIndex, setDragOverBackgroundPageIndex] = useState<number | null>(null);
  const [inlineCropDrag, setInlineCropDrag] = useState<InlineCropDragState | null>(null);
  const [coverInlineCropDrag, setCoverInlineCropDrag] = useState<CoverInlineCropDragState | null>(null);
  const [previewMarginDrag, setPreviewMarginDrag] = useState<PreviewMarginDragState | null>(null);
  const [dualNewsTitleFittedFontPx, setDualNewsTitleFittedFontPx] = useState<number | null>(null);
  const [dualNewsSubtitleFittedFontPx, setDualNewsSubtitleFittedFontPx] = useState<number | null>(null);
  const [warningAlertEyebrowFittedFontPx, setWarningAlertEyebrowFittedFontPx] = useState<number | null>(null);
  const [warningAlertTitleFittedFontPx, setWarningAlertTitleFittedFontPx] = useState<number | null>(null);
  const [warningAlertSubtitleFittedFontPx, setWarningAlertSubtitleFittedFontPx] = useState<number | null>(null);
  const [warningAlertMetaFittedFontPx, setWarningAlertMetaFittedFontPx] = useState<number | null>(null);
  const [warningAlertHashtagsFittedFontPx, setWarningAlertHashtagsFittedFontPx] = useState<number | null>(null);
  const [royalBoldEyebrowFittedFontPx, setRoyalBoldEyebrowFittedFontPx] = useState<number | null>(null);
  const [royalBoldTitleFittedFontPx, setRoyalBoldTitleFittedFontPx] = useState<number | null>(null);
  const [royalBoldSubtitleFittedFontPx, setRoyalBoldSubtitleFittedFontPx] = useState<number | null>(null);
  const [royalBoldHashtagsFittedFontPx, setRoyalBoldHashtagsFittedFontPx] = useState<number | null>(null);
  const [cryptoBulletinTitleFittedFontPx, setCryptoBulletinTitleFittedFontPx] = useState<number | null>(null);
  const [cryptoBulletinSubtitleFittedFontPx, setCryptoBulletinSubtitleFittedFontPx] = useState<number | null>(null);
  const [cryptoBulletinMetaFittedFontPx, setCryptoBulletinMetaFittedFontPx] = useState<number | null>(null);
  const [coverDesignerTemplateId, setCoverDesignerTemplateId] = useState<CoverDesignerTemplateId>(DEFAULT_COVER_DESIGNER_TEMPLATE_ID);
  const [coverDesignerDraft, setCoverDesignerDraft] = useState<CoverDesignerDraft>(DEFAULT_COVER_DESIGNER_DRAFT);
  const [dragOverCoverMediaSlotId, setDragOverCoverMediaSlotId] = useState<string | null>(null);
  const [coverDesignerMediaBySlotId, setCoverDesignerMediaBySlotId] = useState<CoverDesignerMediaState>(() => createInitialCoverDesignerMediaState(DEFAULT_COVER_DESIGNER_TEMPLATE_ID));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [importingJsonFile, setImportingJsonFile] = useState(false);
  const importJsonInputRef = useRef<HTMLInputElement | null>(null);
  const pagesRef = useRef<PostPageForm[]>(form.pages);
  const coverDesignerMediaBySlotIdRef = useRef<CoverDesignerMediaState>(coverDesignerMediaBySlotId);
  const inlineCropDragRef = useRef<InlineCropDragState | null>(null);
  const coverInlineCropDragRef = useRef<CoverInlineCropDragState | null>(null);
  const previewMarginDragRef = useRef<PreviewMarginDragState | null>(null);
  const inlineCropOverlayRef = useRef<HTMLDivElement | null>(null);
  const coverInlineCropOverlayRef = useRef<HTMLDivElement | null>(null);
  const postPagesSectionRef = useRef<HTMLElement | null>(null);
  const coverPreviewCaptureRef = useRef<HTMLDivElement | null>(null);
  const previewCaptureRef = useRef<HTMLDivElement | null>(null);
  const previewContinuousAreaRef = useRef<HTMLDivElement | null>(null);
  const previewPageContentRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const previousPageScaleRef = useRef<PageScaleRatio>(form.page_scale);
  const dualNewsTitlePreviewRef = useRef<HTMLHeadingElement | null>(null);
  const dualNewsSubtitlePreviewRef = useRef<HTMLParagraphElement | null>(null);
  const warningAlertEyebrowPreviewRef = useRef<HTMLParagraphElement | null>(null);
  const warningAlertTitlePreviewRef = useRef<HTMLHeadingElement | null>(null);
  const warningAlertSubtitlePreviewRef = useRef<HTMLParagraphElement | null>(null);
  const warningAlertMetaPreviewRef = useRef<HTMLParagraphElement | null>(null);
  const warningAlertHashtagsPreviewRef = useRef<HTMLParagraphElement | null>(null);
  const royalBoldEyebrowPreviewRef = useRef<HTMLParagraphElement | null>(null);
  const royalBoldTitlePreviewRef = useRef<HTMLHeadingElement | null>(null);
  const royalBoldSubtitlePreviewRef = useRef<HTMLParagraphElement | null>(null);
  const royalBoldHashtagsPreviewRef = useRef<HTMLParagraphElement | null>(null);
  const cryptoBulletinTitlePreviewRef = useRef<HTMLHeadingElement | null>(null);
  const cryptoBulletinSubtitlePreviewRef = useRef<HTMLParagraphElement | null>(null);
  const cryptoBulletinMetaPreviewRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    setForm((previous) => ({
      ...previous,
      locale: previous.locale || detectBrowserLocale(),
    }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const rawPostId = url.searchParams.get("post_id") ?? url.searchParams.get("postId");
    setRequestedEditPostId(rawPostId ? parseOptionalInteger(rawPostId) : null);
  }, []);

  useEffect(() => {
    if (!requestedEditPostId) {
      if (loadedEditPostId !== null) {
        setLoadedEditPostId(null);
      }
      return;
    }

    if (loadedEditPostId === requestedEditPostId) {
      return;
    }

    let cancelled = false;
    setLoadingEditPost(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const loadPost = async () => {
      try {
        const response = await fetch(`/api/posts?post_id=${encodeURIComponent(String(requestedEditPostId))}`, {
          cache: "no-store",
        });
        const data = (await response.json().catch(() => null)) as ExistingPostApiResponse | null;
        if (!response.ok || !data?.ok) {
          throw new Error(data?.message ?? "Failed to load post for edit mode.");
        }

        const baseForm = createFormFromExistingPostResponse(data);
        if (!baseForm) {
          throw new Error("Loaded post payload is invalid.");
        }
        const nextForm = await hydrateEditPageDimensionsFromSources(baseForm);

        if (cancelled) return;

        setForm((previous) => {
          for (const page of previous.pages) {
            revokePageMediaPreviewUrls(page);
            revokePreviewUrl(page.background_image_preview_url);
            revokePreviewUrl(page.background_cropped_preview_url);
          }
          return nextForm;
        });
        setActivePageIndex(0);
        setLoadedEditPostId(requestedEditPostId);
        setSuccessMessage(`Loaded post ${requestedEditPostId} in edit mode.`);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Failed to load post for edit mode.");
      } finally {
        if (!cancelled) {
          setLoadingEditPost(false);
        }
      }
    };

    void loadPost();

    return () => {
      cancelled = true;
    };
  }, [requestedEditPostId, loadedEditPostId]);

  useEffect(() => {
    pagesRef.current = form.pages;
  }, [form.pages]);

  useEffect(() => {
    coverDesignerMediaBySlotIdRef.current = coverDesignerMediaBySlotId;
  }, [coverDesignerMediaBySlotId]);

  useEffect(() => {
    const templateConfig = COVER_DESIGNER_TEMPLATE_CONFIG[coverDesignerTemplateId];
    setCoverDesignerMediaBySlotId((previous) => {
      let changed = false;
      const nextState = { ...previous };
      for (const mediaSlot of templateConfig.mediaSlots) {
        if (!nextState[mediaSlot.id]) {
          nextState[mediaSlot.id] = createDefaultCoverDesignerMediaSlotState();
          changed = true;
        }
      }
      return changed ? nextState : previous;
    });
  }, [coverDesignerTemplateId]);

  useEffect(() => {
    setActivePageIndex((current) => clamp(current, 0, Math.max(0, form.pages.length - 1)));
  }, [form.pages.length]);

  useEffect(() => {
    if (previousPageScaleRef.current === form.page_scale) {
      return;
    }
    previousPageScaleRef.current = form.page_scale;

    let cancelled = false;
    const rerunAutoLayoutForScale = async () => {
      await waitForPreviewRender();
      if (cancelled) {
        return;
      }
      const autoArrangedPages = await autoArrangeImportedPagesLayout(pagesRef.current);
      if (cancelled) {
        return;
      }
      setForm((previous) => ({
        ...previous,
        pages: autoArrangedPages,
      }));
    };

    void rerunAutoLayoutForScale();
    return () => {
      cancelled = true;
    };
  }, [form.page_scale]);

  useEffect(() => {
    return () => {
      for (const page of pagesRef.current) {
        revokePageMediaPreviewUrls(page);
        revokePreviewUrl(page.background_image_preview_url);
        revokePreviewUrl(page.background_cropped_preview_url);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      for (const mediaSlotState of Object.values(coverDesignerMediaBySlotIdRef.current)) {
        revokePreviewUrl(mediaSlotState.image_preview_url);
        revokePreviewUrl(mediaSlotState.cropped_preview_url);
      }
    };
  }, []);

  function setField<K extends keyof PostForm>(field: K, value: PostForm[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function toObjectRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
  }

  function readImportedString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
  }

  function resolveImportedUrlCandidate(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    const candidates = [trimmed];
    try {
      const decoded = decodeURIComponent(trimmed);
      if (decoded && decoded !== trimmed) {
        candidates.unshift(decoded);
      }
    } catch {
      // Keep raw value when decoding fails.
    }

    for (const candidate of candidates) {
      try {
        const parsedUrl = new URL(candidate);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          continue;
        }

        const host = parsedUrl.hostname.toLowerCase();
        if ((host === "google.com" || host === "www.google.com") && parsedUrl.pathname === "/search") {
          const queryUrl = parsedUrl.searchParams.get("q");
          if (queryUrl) {
            const resolvedQueryUrl = resolveImportedUrlCandidate(queryUrl);
            if (resolvedQueryUrl) {
              return resolvedQueryUrl;
            }
          }
        }

        return parsedUrl.toString();
      } catch {
        // Try next candidate.
      }
    }

    return "";
  }

  function readImportedUrl(value: unknown): string {
    const rawValue = readImportedString(value);
    if (!rawValue) {
      return "";
    }

    const markdownLinkMatch = rawValue.match(/\[[^\]]*]\(([^)]+)\)/);
    const extractedValue = (markdownLinkMatch?.[1] ?? rawValue).trim().replace(/^<|>$/g, "");
    return resolveImportedUrlCandidate(extractedValue);
  }

  function toImportedImagePreviewSource(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) {
      return "";
    }

    if (trimmed.startsWith("blob:") || trimmed.startsWith("data:") || trimmed.startsWith("/")) {
      return trimmed;
    }

    if (trimmed.startsWith("/api/image-proxy?")) {
      return trimmed;
    }

    return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
  }

  async function resolveImportedPreviewSourceWithDimensions(sourceUrl: string): Promise<{
    previewSourceUrl: string;
    width: number | null;
    height: number | null;
  }> {
    const proxiedSourceUrl = toImportedImagePreviewSource(sourceUrl);
    const candidates = Array.from(new Set([proxiedSourceUrl, sourceUrl].filter((candidate) => candidate.length > 0)));
    let resolvedWidth: number | null = null;
    let resolvedHeight: number | null = null;
    for (const candidate of candidates) {
      try {
        const dimensions = await getImageDimensionsFromSource(candidate);
        resolvedWidth = dimensions.width;
        resolvedHeight = dimensions.height;
        break;
      } catch {
        // Try next candidate.
      }
    }

    return {
      previewSourceUrl: proxiedSourceUrl || (candidates[0] ?? sourceUrl),
      width: resolvedWidth,
      height: resolvedHeight,
    };
  }

  function toCssUrlValue(url: string): string {
    return `url("${url.replace(/"/g, '\\"')}")`;
  }

  function applyImportedPatternBackground(page: PostPageForm, backgroundImageUrl: string): PostPageForm {
    if (!backgroundImageUrl) {
      return page;
    }
    const backgroundPreviewSourceUrl = toImportedImagePreviewSource(backgroundImageUrl);

    return {
      ...page,
      background_image_file: null,
      background_image_preview_url: backgroundPreviewSourceUrl,
      background_cropped_preview_url: null,
      background_media_url: backgroundPreviewSourceUrl,
      background_width: null,
      background_height: null,
      background_crop_top_left_x: null,
      background_crop_top_left_y: null,
      background_crop_bottom_right_x: null,
      background_crop_bottom_right_y: null,
      background_fit_mode: "repeat",
    };
  }

  function readImportedNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  function readImportedHexColor(value: unknown): string | null {
    const directColor = toOptionalHexColor(value);
    if (directColor) {
      return directColor;
    }

    const rawValue = readImportedString(value);
    if (!rawValue) {
      return null;
    }

    const matchedHexColor = rawValue.match(/#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})/);
    return matchedHexColor ? toOptionalHexColor(matchedHexColor[0]) : null;
  }

  function applyImportedParagraphColors(
    page: PostPageForm,
    options: {
      backgroundColor: string | null;
      headingColor: string | null;
      contentColor: string | null;
    },
  ): PostPageForm {
    const { backgroundColor, headingColor, contentColor } = options;
    const fallbackTextColor = contentColor ?? headingColor;
    const nextTextColorByElement = { ...page.text_color_by_element };
    let hasTextColorUpdate = false;

    for (const elementKey of page.elements) {
      if (getElementTypeFromKey(elementKey) !== "text") {
        continue;
      }
      const isHeading = getTextIsHeadingForElement(page, elementKey);
      const nextColor = isHeading ? (headingColor ?? fallbackTextColor) : (contentColor ?? fallbackTextColor);
      if (nextColor) {
        nextTextColorByElement[elementKey] = nextColor;
        hasTextColorUpdate = true;
      }
    }

    return {
      ...page,
      text_color_by_element: hasTextColorUpdate ? nextTextColorByElement : page.text_color_by_element,
      background_color: backgroundColor ?? page.background_color,
    };
  }

  function normalizeImportedHashtags(rawValue: string): string {
    return rawValue
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => (token.startsWith("#") ? token : `#${token}`))
      .join(" ");
  }

  function parseImportedCropRect(rawCrop: unknown, width: number | null, height: number | null): { x1: number; y1: number; x2: number; y2: number } | null {
    const cropRecord = toObjectRecord(rawCrop);
    if (!cropRecord) {
      return null;
    }

    const rawX1 = readImportedNumber(cropRecord.x1);
    const rawY1 = readImportedNumber(cropRecord.y1);
    const rawX2 = readImportedNumber(cropRecord.x2);
    const rawY2 = readImportedNumber(cropRecord.y2);
    if (rawX1 === null || rawY1 === null || rawX2 === null || rawY2 === null) {
      return null;
    }

    let x1 = Math.round(rawX1);
    let y1 = Math.round(rawY1);
    let x2 = Math.round(rawX2);
    let y2 = Math.round(rawY2);

    if (width !== null && width > 0) {
      x1 = clamp(x1, 0, width - 1);
      x2 = clamp(x2, 1, width);
    }
    if (height !== null && height > 0) {
      y1 = clamp(y1, 0, height - 1);
      y2 = clamp(y2, 1, height);
    }

    if (x2 <= x1 || y2 <= y1) {
      return null;
    }

    if (width !== null && height !== null && width > 0 && height > 0) {
      const originalArea = width * height;
      const croppedArea = (x2 - x1) * (y2 - y1);
      if (croppedArea < originalArea * 0.5) {
        return null;
      }
    }

    return { x1, y1, x2, y2 };
  }

  function createImportedPageWithElements(elementTypes: Array<"text" | "media">): { page: PostPageForm; textElementKeys: PageElementKey[]; mediaElementKeys: PageElementKey[] } {
    const elementKeys = [...elementTypes.map((elementType) => createElementKey(elementType)), createElementKey("background")];
    const scopedDefaults = createElementScopedDefaults(elementKeys);
    const mediaByElement: Record<PageElementKey, MediaElementForm> = {};
    for (const elementKey of elementKeys) {
      if (getElementTypeFromKey(elementKey) === "media") {
        mediaByElement[elementKey] = createDefaultMediaElementState();
      }
    }

    const basePage = createEmptyPage();
    const pageWithScopedElements: PostPageForm = {
      ...basePage,
      elements: elementKeys,
      hiddenElements: [],
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
    };

    return {
      page: syncLegacyMediaFieldsFromPrimaryElement(pageWithScopedElements),
      textElementKeys: elementKeys.filter((elementKey) => getElementTypeFromKey(elementKey) === "text"),
      mediaElementKeys: elementKeys.filter((elementKey) => getElementTypeFromKey(elementKey) === "media"),
    };
  }

  async function buildImportedCoverSlotState(rawValue: unknown): Promise<CoverDesignerMediaSlotState> {
    const headingImage = toObjectRecord(rawValue);
    const sourceUrl = readImportedUrl(headingImage?.url);
    if (!sourceUrl) {
      return createDefaultCoverDesignerMediaSlotState();
    }

    const {
      previewSourceUrl,
      width,
      height,
    } = await resolveImportedPreviewSourceWithDimensions(sourceUrl);

    const cropRect = parseImportedCropRect(headingImage?.crop, width, height);
    let croppedPreviewUrl: string | null = null;
    if (cropRect && width !== null && height !== null) {
      try {
        croppedPreviewUrl = await createCroppedPreviewUrl(previewSourceUrl, cropRect);
      } catch {
        croppedPreviewUrl = null;
      }
    }

    return createDefaultCoverDesignerMediaSlotState({
      image_file: null,
      image_preview_url: previewSourceUrl,
      cropped_preview_url: croppedPreviewUrl,
      media_url: previewSourceUrl,
      raw_media_url: sourceUrl,
      width,
      height,
      crop_top_left_x: cropRect?.x1 ?? null,
      crop_top_left_y: cropRect?.y1 ?? null,
      crop_bottom_right_x: cropRect?.x2 ?? null,
      crop_bottom_right_y: cropRect?.y2 ?? null,
    });
  }

  async function buildImportedPageFromHeadingImage(rawValue: unknown): Promise<PostPageForm | null> {
    const headingImage = toObjectRecord(rawValue);
    if (!headingImage) {
      return null;
    }

    const imageUrl = readImportedUrl(headingImage.url);
    const headingText = readImportedString(headingImage.heading);
    const descriptionText = readImportedString(headingImage.desc);

    if (!imageUrl && !headingText && !descriptionText) {
      return null;
    }

    const elementTypes: Array<"text" | "media"> = [];
    if (imageUrl) {
      elementTypes.push("media");
    }
    if (headingText) {
      elementTypes.push("text");
    }
    if (descriptionText) {
      elementTypes.push("text");
    }

    if (elementTypes.length === 0) {
      return null;
    }

    const { page, textElementKeys, mediaElementKeys } = createImportedPageWithElements(elementTypes);
    const mediaElementKey = mediaElementKeys[0] ?? null;
    const headingElementKey = textElementKeys[0] ?? null;
    const descriptionElementKey = textElementKeys[1] ?? null;
    const descriptionTargetElementKey = descriptionElementKey ?? headingElementKey;
    let nextPage = page;
    const shouldCenterSingleMedia = elementTypes.length === 1 && elementTypes[0] === "media";

    if (imageUrl && mediaElementKey) {
      const { previewSourceUrl, width, height } = await resolveImportedPreviewSourceWithDimensions(imageUrl);
      nextPage = {
        ...nextPage,
        media_by_element: {
          ...nextPage.media_by_element,
          [mediaElementKey]: createDefaultMediaElementState({
            image_file: null,
            image_preview_url: previewSourceUrl,
            cropped_preview_url: null,
            media_url: previewSourceUrl,
            raw_media_url: imageUrl,
            width,
            height,
            media_crop_top_left_x: null,
            media_crop_top_left_y: null,
            media_crop_bottom_right_x: null,
            media_crop_bottom_right_y: null,
            media_fit_mode: "width",
          }),
        },
      };
    }

    if (headingText && headingElementKey) {
      nextPage = {
        ...nextPage,
        text_by_element: {
          ...nextPage.text_by_element,
          [headingElementKey]: headingText,
        },
        text_style_by_element: {
          ...nextPage.text_style_by_element,
          [headingElementKey]: "h2",
        },
        text_is_heading_by_element: {
          ...nextPage.text_is_heading_by_element,
          [headingElementKey]: true,
        },
      };
    }

    if (descriptionText && descriptionTargetElementKey) {
        nextPage = {
          ...nextPage,
          text_by_element: {
            ...nextPage.text_by_element,
            [descriptionTargetElementKey]: descriptionText,
          },
          text_style_by_element: {
            ...nextPage.text_style_by_element,
            [descriptionTargetElementKey]: "caption",
          },
          text_is_heading_by_element: {
            ...nextPage.text_is_heading_by_element,
            [descriptionTargetElementKey]: false,
          },
        };
    }

    const nextElementCornerRadius = {
      ...nextPage.element_corner_radius_px,
      ...(mediaElementKey ? { [mediaElementKey]: 0 } : {}),
    };
    const nextElementPadding = {
      ...nextPage.element_padding_px,
      ...(mediaElementKey ? { [mediaElementKey]: 0 } : {}),
      ...(headingElementKey ? { [headingElementKey]: 0 } : {}),
      ...(descriptionTargetElementKey ? { [descriptionTargetElementKey]: 0 } : {}),
    };
    const nextElementMargins = {
      ...nextPage.element_margin_px,
      ...(mediaElementKey
        ? {
            [mediaElementKey]: {
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            },
          }
        : {}),
      ...(headingText && headingElementKey
        ? {
            [headingElementKey]: {
              top: 12,
              right: 16,
              bottom: 6,
              left: 16,
            },
          }
        : {}),
      ...(descriptionText && descriptionTargetElementKey
        ? {
            [descriptionTargetElementKey]: {
              top: headingText ? 0 : 12,
              right: 16,
              bottom: 16,
              left: 16,
            },
          }
        : {}),
    };
    nextPage = {
      ...nextPage,
      center_single_media: shouldCenterSingleMedia,
      container_padding_px: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
      element_corner_radius_px: nextElementCornerRadius,
      element_padding_px: nextElementPadding,
      element_margin_px: nextElementMargins,
    };

    return syncLegacyMediaFieldsFromPrimaryElement(nextPage);
  }

  async function buildImportedPageFromParagraph(rawValue: unknown): Promise<PostPageForm | null> {
    const paragraph = toObjectRecord(rawValue);
    if (!paragraph) {
      return null;
    }

    const paragraphType = readImportedString(paragraph.type).toLowerCase();
    const paragraphBackgroundImageUrl = readImportedUrl(paragraph.background_image);
    const paragraphBackgroundColor = readImportedHexColor(paragraph.background_color);
    const paragraphHeadingColor = readImportedHexColor(paragraph.heading_color);
    const paragraphContentColor = readImportedHexColor(paragraph.content_color);

    if (paragraphType === "p") {
      const headingText = readImportedString(paragraph.heading);
      const contentText = readImportedString(paragraph.content);
      if (!headingText && !contentText) {
        return null;
      }

      const hasBodyText = Boolean(headingText && contentText);
      const { page, textElementKeys } = createImportedPageWithElements(hasBodyText ? ["text", "text"] : ["text"]);
      const headingElementKey = textElementKeys[0];
      const bodyElementKey = textElementKeys[1];
      if (!headingElementKey) {
        return null;
      }

      const nextPage: PostPageForm = {
        ...page,
        text_by_element: {
          ...page.text_by_element,
          [headingElementKey]: headingText || contentText,
          ...(bodyElementKey ? { [bodyElementKey]: contentText } : {}),
        },
        text_style_by_element: {
          ...page.text_style_by_element,
          [headingElementKey]: headingText ? "h2" : "caption",
          ...(bodyElementKey ? { [bodyElementKey]: "caption" } : {}),
        },
        text_is_heading_by_element: {
          ...page.text_is_heading_by_element,
          [headingElementKey]: Boolean(headingText),
          ...(bodyElementKey ? { [bodyElementKey]: false } : {}),
        },
      };

      const nextColoredPage = applyImportedParagraphColors(nextPage, {
        backgroundColor: paragraphBackgroundColor,
        headingColor: paragraphHeadingColor,
        contentColor: paragraphContentColor,
      });
      return syncLegacyMediaFieldsFromPrimaryElement(applyImportedPatternBackground(nextColoredPage, paragraphBackgroundImageUrl));
    }

    if (paragraphType === "image") {
      const imageUrl = readImportedUrl(paragraph.url);
      const imageCaption = readImportedString(paragraph.content);
      if (!imageUrl && !imageCaption) {
        return null;
      }

      const includeCaption = imageCaption.length > 0;
      const shouldCenterSingleMedia = Boolean(imageUrl && !includeCaption);
      const { page, textElementKeys, mediaElementKeys } = createImportedPageWithElements(imageUrl ? (includeCaption ? ["media", "text"] : ["media"]) : ["text"]);
      const mediaElementKey = mediaElementKeys[0] ?? null;
      const captionElementKey = textElementKeys[0] ?? null;
      let nextPage = page;

      if (imageUrl && mediaElementKey) {
        const {
          previewSourceUrl,
          width,
          height,
        } = await resolveImportedPreviewSourceWithDimensions(imageUrl);

        const cropRect = parseImportedCropRect(paragraph.crop, width, height);
        let croppedPreviewUrl: string | null = null;
        if (cropRect && width !== null && height !== null) {
          try {
            croppedPreviewUrl = await createCroppedPreviewUrl(previewSourceUrl, cropRect);
          } catch {
            croppedPreviewUrl = null;
          }
        }

        nextPage = {
          ...nextPage,
          media_by_element: {
            ...nextPage.media_by_element,
            [mediaElementKey]: createDefaultMediaElementState({
              image_file: null,
              image_preview_url: previewSourceUrl,
              cropped_preview_url: croppedPreviewUrl,
              media_url: previewSourceUrl,
              raw_media_url: imageUrl,
              width,
              height,
              media_crop_top_left_x: cropRect?.x1 ?? null,
              media_crop_top_left_y: cropRect?.y1 ?? null,
              media_crop_bottom_right_x: cropRect?.x2 ?? null,
              media_crop_bottom_right_y: cropRect?.y2 ?? null,
            }),
          },
        };
      }

      if (captionElementKey && imageCaption) {
        nextPage = {
          ...nextPage,
          text_by_element: {
            ...nextPage.text_by_element,
            [captionElementKey]: imageCaption,
          },
          text_style_by_element: {
            ...nextPage.text_style_by_element,
            [captionElementKey]: "caption",
          },
          text_is_heading_by_element: {
            ...nextPage.text_is_heading_by_element,
            [captionElementKey]: false,
          },
        };
      }

      const centeredPage = {
        ...nextPage,
        center_single_media: shouldCenterSingleMedia,
      };
      const nextColoredPage = applyImportedParagraphColors(centeredPage, {
        backgroundColor: paragraphBackgroundColor,
        headingColor: paragraphHeadingColor,
        contentColor: paragraphContentColor,
      });
      return syncLegacyMediaFieldsFromPrimaryElement(applyImportedPatternBackground(nextColoredPage, paragraphBackgroundImageUrl));
    }

    if (paragraphType === "hashtags") {
      const hashtagsContent = normalizeImportedHashtags(readImportedString(paragraph.content));
      if (!hashtagsContent) {
        return null;
      }
      const { page, textElementKeys } = createImportedPageWithElements(["text"]);
      const hashtagElementKey = textElementKeys[0];
      if (!hashtagElementKey) {
        return null;
      }

      const nextPage: PostPageForm = {
        ...page,
        text_by_element: {
          ...page.text_by_element,
          [hashtagElementKey]: hashtagsContent,
        },
        text_style_by_element: {
          ...page.text_style_by_element,
          [hashtagElementKey]: "h4",
        },
        text_is_heading_by_element: {
          ...page.text_is_heading_by_element,
          [hashtagElementKey]: false,
        },
        text_alignments: {
          ...page.text_alignments,
          [hashtagElementKey]: "center",
        },
      };
      const nextColoredPage = applyImportedParagraphColors(nextPage, {
        backgroundColor: paragraphBackgroundColor,
        headingColor: paragraphHeadingColor,
        contentColor: paragraphContentColor,
      });
      return syncLegacyMediaFieldsFromPrimaryElement(applyImportedPatternBackground(nextColoredPage, paragraphBackgroundImageUrl));
    }

    return null;
  }

  function doesPreviewPageFitContainer(pageIndex: number): boolean {
    const pageContentNode = previewPageContentRefs.current[pageIndex];
    if (!pageContentNode) {
      return false;
    }

    return pageContentNode.scrollWidth <= pageContentNode.clientWidth + 1 && pageContentNode.scrollHeight <= pageContentNode.clientHeight + 1;
  }

  function createPageWithAutoAdjustedTextStyleStep(page: PostPageForm, styleStep: number): PostPageForm {
    const visibleTextElementKeys = page.elements.filter((elementKey) => {
      return getElementTypeFromKey(elementKey) === "text" && !page.hiddenElements.includes(elementKey);
    });
    if (visibleTextElementKeys.length === 0) {
      return page;
    }

    const nextTextStyleByElement = { ...page.text_style_by_element };
    const maxStyleScaleIndex = TEXT_STYLE_SCALE_ORDER.length - 1;
    const nextScaleIndexByElementKey: Record<PageElementKey, number> = {};

    for (const elementKey of visibleTextElementKeys) {
      const baseStyle = getTextStyleForElement(page, elementKey);
      const shiftedStyle = shiftTextStyleByStep(baseStyle, styleStep);
      nextScaleIndexByElementKey[elementKey] = getTextStyleScaleIndex(shiftedStyle);
    }

    const hasHeading = visibleTextElementKeys.some((elementKey) => getTextIsHeadingForElement(page, elementKey));
    if (hasHeading) {
      for (const elementKey of visibleTextElementKeys) {
        if (!getTextIsHeadingForElement(page, elementKey)) {
          nextScaleIndexByElementKey[elementKey] = Math.min(nextScaleIndexByElementKey[elementKey] ?? 0, maxStyleScaleIndex - 1);
        }
      }
    }

    const maxNonHeadingScaleIndex = visibleTextElementKeys.reduce((currentMax, elementKey) => {
      if (getTextIsHeadingForElement(page, elementKey)) {
        return currentMax;
      }
      return Math.max(currentMax, nextScaleIndexByElementKey[elementKey] ?? 0);
    }, -1);

    if (maxNonHeadingScaleIndex >= 0) {
      const minHeadingScaleIndex = Math.min(maxStyleScaleIndex, maxNonHeadingScaleIndex + 1);
      for (const elementKey of visibleTextElementKeys) {
        if (getTextIsHeadingForElement(page, elementKey)) {
          nextScaleIndexByElementKey[elementKey] = Math.max(nextScaleIndexByElementKey[elementKey] ?? 0, minHeadingScaleIndex);
        }
      }
    }

    for (const elementKey of visibleTextElementKeys) {
      nextTextStyleByElement[elementKey] = getTextStyleByScaleIndex(nextScaleIndexByElementKey[elementKey] ?? 0);
    }

    return {
      ...page,
      text_style_by_element: nextTextStyleByElement,
    };
  }

  async function autoArrangeImportedPagesLayout(initialPages: PostPageForm[]): Promise<PostPageForm[]> {
    let workingPages = initialPages;

    for (let pageIndex = 0; pageIndex < workingPages.length; pageIndex += 1) {
      const currentPage = workingPages[pageIndex];
      const hasVisibleTextElement = currentPage.elements.some((elementKey) => {
        return getElementTypeFromKey(elementKey) === "text" && !currentPage.hiddenElements.includes(elementKey);
      });
      if (!hasVisibleTextElement) {
        continue;
      }

      let bestPage: PostPageForm | null = null;
      for (let styleStep = 4; styleStep >= -4; styleStep -= 1) {
        const candidatePage = createPageWithAutoAdjustedTextStyleStep(currentPage, styleStep);
        const candidatePages = workingPages.map((page, candidatePageIndex) => (candidatePageIndex === pageIndex ? candidatePage : page));
        setForm((previous) => ({
          ...previous,
          pages: candidatePages,
        }));
        await waitForPreviewRender();

        if (doesPreviewPageFitContainer(pageIndex)) {
          bestPage = candidatePage;
          workingPages = candidatePages;
          break;
        }
      }

      if (!bestPage) {
        const fallbackPage = createPageWithAutoAdjustedTextStyleStep(currentPage, -4);
        workingPages = workingPages.map((page, candidatePageIndex) => (candidatePageIndex === pageIndex ? fallbackPage : page));
        setForm((previous) => ({
          ...previous,
          pages: workingPages,
        }));
        await waitForPreviewRender();
      }
    }

    return workingPages;
  }

  async function importFromJsonFile(file: File): Promise<void> {
    setImportingJsonFile(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payloadUnknown = JSON.parse(await file.text()) as unknown;
      const payloadRecord = toObjectRecord(payloadUnknown);
      if (!payloadRecord) {
        throw new Error("Invalid JSON file: root object is required.");
      }

      const payload = payloadRecord as ImportedPostJsonPayload;
      const importedTitle = readImportedString(payload.title);
      const importedEyebrow = readImportedString(payload.eyeblow ?? payload.eyebrow);
      const importedSubtitle = readImportedString(payload.subtitle);
      const importedFooterLine = readImportedString(payload.footer_line);
      const importedHeadingHashtags = normalizeImportedHashtags(readImportedString(payload.heading_hashtags));
      const nextCoverTemplateId: CoverDesignerTemplateId = "warning_alert";

      const [coverMediaSlot1State, coverMediaSlot2State] = await Promise.all([
        buildImportedCoverSlotState(payload.heading_image_1),
        buildImportedCoverSlotState(payload.heading_image_2),
      ]);
      const nextCoverMediaBySlotId = createInitialCoverDesignerMediaState(nextCoverTemplateId);
      const nextCoverMediaSlots = COVER_DESIGNER_TEMPLATE_CONFIG[nextCoverTemplateId].mediaSlots;
      if (nextCoverMediaSlots[0]) {
        nextCoverMediaBySlotId[nextCoverMediaSlots[0].id] = hasCoverDesignerMediaSource(coverMediaSlot1State) ? coverMediaSlot1State : coverMediaSlot2State;
      }

      const paragraphs = Array.isArray(payload.paragraphs) ? payload.paragraphs : [];
      const importedPages: PostPageForm[] = [];
      const importedPageKinds: Array<"normal" | "hashtags"> = [];
      for (const paragraph of paragraphs) {
        const importedPage = await buildImportedPageFromParagraph(paragraph);
        if (importedPage) {
          importedPages.push(importedPage);
          const paragraphType = readImportedString(toObjectRecord(paragraph)?.type).toLowerCase();
          importedPageKinds.push(paragraphType === "hashtags" ? "hashtags" : "normal");
        }
      }
      const headingImage1Page = await buildImportedPageFromHeadingImage(payload.heading_image_1);
      const headingImage2Page = await buildImportedPageFromHeadingImage(payload.heading_image_2);

      const pagesWithHeadingImages = [...importedPages];
      const pageKindsWithHeadingImages = [...importedPageKinds];

      if (headingImage1Page) {
        pagesWithHeadingImages.unshift(headingImage1Page);
        pageKindsWithHeadingImages.unshift("normal");
      }

      if (headingImage2Page) {
        const hashtagsPageIndex = pageKindsWithHeadingImages.findIndex((kind) => kind === "hashtags");
        if (hashtagsPageIndex >= 0) {
          pagesWithHeadingImages.splice(hashtagsPageIndex, 0, headingImage2Page);
          pageKindsWithHeadingImages.splice(hashtagsPageIndex, 0, "normal");
        } else {
          pagesWithHeadingImages.push(headingImage2Page);
          pageKindsWithHeadingImages.push("normal");
        }
      }

      const nextPages = pagesWithHeadingImages.length > 0 ? pagesWithHeadingImages : [createEmptyPage()];
      const nextCoverDraft: CoverDesignerDraft = {
        eyebrow: importedEyebrow || DEFAULT_COVER_DESIGNER_DRAFT.eyebrow,
        title: importedTitle || DEFAULT_COVER_DESIGNER_DRAFT.title,
        subtitle: importedSubtitle || DEFAULT_COVER_DESIGNER_DRAFT.subtitle,
        meta: importedFooterLine || DEFAULT_COVER_DESIGNER_DRAFT.meta,
        hashtags: importedHeadingHashtags || DEFAULT_COVER_DESIGNER_DRAFT.hashtags,
      };

      for (const page of pagesRef.current) {
        revokePageMediaPreviewUrls(page);
        revokePreviewUrl(page.background_image_preview_url);
        revokePreviewUrl(page.background_cropped_preview_url);
      }

      setCoverDesignerMediaBySlotId((previous) => {
        for (const mediaSlotState of Object.values(previous)) {
          revokePreviewUrl(mediaSlotState.image_preview_url);
          revokePreviewUrl(mediaSlotState.cropped_preview_url);
        }
        return nextCoverMediaBySlotId;
      });
      setCoverDesignerTemplateId(nextCoverTemplateId);
      setCoverDesignerDraft(nextCoverDraft);
      setForm((previous) => ({
        ...previous,
        title: importedTitle || previous.title,
        pages: nextPages,
      }));
      setActivePageIndex(0);
      await waitForPreviewRender();
      const autoArrangedPages = await autoArrangeImportedPagesLayout(nextPages);
      setForm((previous) => ({
        ...previous,
        pages: autoArrangedPages,
      }));
      setSuccessMessage(`Imported JSON successfully (${autoArrangedPages.length} pages) with auto text-style layout.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to import JSON file.");
    } finally {
      setImportingJsonFile(false);
    }
  }

  function runWithoutScrollJump(action: () => void) {
    if (typeof window === "undefined") {
      action();
      return;
    }

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const anchorTopBefore = postPagesSectionRef.current?.getBoundingClientRect().top ?? null;
    action();

    const restoreScroll = () => {
      if (anchorTopBefore === null || !postPagesSectionRef.current) {
        window.scrollTo(scrollX, scrollY);
        return;
      }

      const anchorTopAfter = postPagesSectionRef.current.getBoundingClientRect().top;
      const anchorDelta = anchorTopAfter - anchorTopBefore;
      window.scrollTo(scrollX, scrollY + anchorDelta);
    };

    requestAnimationFrame(() => {
      restoreScroll();
      requestAnimationFrame(restoreScroll);
    });
  }

  async function waitForPreviewRender() {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  async function saveCurrentPreviewAsImage() {
    const previewNode = previewCaptureRef.current ?? previewContinuousAreaRef.current;
    if (!previewNode) {
      setErrorMessage("Preview is not ready to export yet.");
      return;
    }

    setSavingPreviewImage(true);
    setErrorMessage(null);

    try {
      const blob = await renderPreviewNodeToBlob(previewNode, selectedTemplate.pageBackgroundColor || "#ffffff");
      const dataUrl = URL.createObjectURL(blob);

      const downloadLink = document.createElement("a");
      downloadLink.href = dataUrl;
      downloadLink.download = `post-preview-${currentPageNumber}.png`;
      downloadLink.click();
      URL.revokeObjectURL(dataUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to export preview image.");
    } finally {
      setSavingPreviewImage(false);
    }
  }

  function setCoverDesignerField(field: keyof CoverDesignerDraft, value: string) {
    setCoverDesignerDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function getCoverDesignerMediaSlotState(slotId: string): CoverDesignerMediaSlotState {
    return coverDesignerMediaBySlotId[slotId] ?? EMPTY_COVER_DESIGNER_MEDIA_SLOT_STATE;
  }

  async function setCoverDesignerMediaFile(slotId: string, file: File) {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Only image files are allowed.");
      return;
    }

    try {
      const { width, height } = await getImageDimensions(file);
      const previewUrl = URL.createObjectURL(file);
      setCoverDesignerMediaBySlotId((previous) => {
        const currentSlotState = previous[slotId];
        if (currentSlotState?.image_preview_url && currentSlotState.image_preview_url !== previewUrl) {
          revokePreviewUrl(currentSlotState.image_preview_url);
        }
        if (currentSlotState?.cropped_preview_url) {
          revokePreviewUrl(currentSlotState.cropped_preview_url);
        }

        return {
          ...previous,
          [slotId]: createDefaultCoverDesignerMediaSlotState({
            image_file: file,
            image_preview_url: previewUrl,
            cropped_preview_url: null,
            media_url: null,
            raw_media_url: null,
            width,
            height,
            crop_top_left_x: null,
            crop_top_left_y: null,
            crop_bottom_right_x: null,
            crop_bottom_right_y: null,
          }),
        };
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to read cover image.");
    }
  }

  function clearCoverDesignerMediaFile(slotId: string) {
    setCoverDesignerMediaBySlotId((previous) => {
      const currentSlotState = previous[slotId];
      if (!currentSlotState) {
        return previous;
      }

      revokePreviewUrl(currentSlotState.image_preview_url);
      revokePreviewUrl(currentSlotState.cropped_preview_url);
      return {
        ...previous,
        [slotId]: createDefaultCoverDesignerMediaSlotState(),
      };
    });
  }

  async function setCoverDesignerMediaCropRect(slotId: string, rect: { x1: number; y1: number; x2: number; y2: number }): Promise<void> {
    const mediaState = getCoverDesignerMediaSlotState(slotId);
    const imageSrc = mediaState.image_preview_url || mediaState.raw_media_url || mediaState.media_url;
    if (!imageSrc || mediaState.width === null || mediaState.height === null) {
      return;
    }

    const x1 = clamp(Math.round(Math.min(rect.x1, rect.x2)), 0, mediaState.width - 1);
    const y1 = clamp(Math.round(Math.min(rect.y1, rect.y2)), 0, mediaState.height - 1);
    const x2 = clamp(Math.round(Math.max(rect.x1, rect.x2)), x1 + 1, mediaState.width);
    const y2 = clamp(Math.round(Math.max(rect.y1, rect.y2)), y1 + 1, mediaState.height);

    let croppedPreviewUrl: string | null = null;
    try {
      croppedPreviewUrl = await createCroppedPreviewUrl(imageSrc, {
        x1,
        y1,
        x2,
        y2,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create cropped preview.");
    }

    setCoverDesignerMediaBySlotId((previous) => {
      const currentSlotState = previous[slotId];
      if (!currentSlotState) {
        if (croppedPreviewUrl) {
          revokePreviewUrl(croppedPreviewUrl);
        }
        return previous;
      }

      revokePreviewUrl(currentSlotState.cropped_preview_url);
      return {
        ...previous,
        [slotId]: {
          ...currentSlotState,
          cropped_preview_url: croppedPreviewUrl,
          crop_top_left_x: x1,
          crop_top_left_y: y1,
          crop_bottom_right_x: x2,
          crop_bottom_right_y: y2,
        },
      };
    });
  }

  async function applyDefaultCoverDesignerMediaCrop(slotId: string) {
    const mediaState = getCoverDesignerMediaSlotState(slotId);
    if (mediaState.width === null || mediaState.height === null) {
      setErrorMessage("Add an image before cropping.");
      return;
    }

    const defaultRect = getCropRectByScaleBySize(mediaState.width, mediaState.height, form.page_scale);
    if (!defaultRect) {
      setErrorMessage("Crop area could not be created.");
      return;
    }

    await setCoverDesignerMediaCropRect(slotId, defaultRect);
  }

  function clearCoverDesignerMediaCrop(slotId: string) {
    setCoverDesignerMediaBySlotId((previous) => {
      const currentSlotState = previous[slotId];
      if (!currentSlotState) {
        return previous;
      }

      revokePreviewUrl(currentSlotState.cropped_preview_url);
      return {
        ...previous,
        [slotId]: {
          ...currentSlotState,
          cropped_preview_url: null,
          crop_top_left_x: null,
          crop_top_left_y: null,
          crop_bottom_right_x: null,
          crop_bottom_right_y: null,
        },
      };
    });
  }

  async function setCoverDesignerMediaCropDimension(slotId: string, axis: "width" | "height", rawValue: string): Promise<void> {
    const targetValue = parseOptionalInteger(rawValue);
    const mediaState = getCoverDesignerMediaSlotState(slotId);
    const rect = getCoverDesignerMediaCropRect(mediaState);
    if (targetValue === null || !rect || mediaState.width === null || mediaState.height === null) {
      return;
    }

    const requestedSize = axis === "width" ? clamp(targetValue, 1, mediaState.width) : clamp(targetValue, 1, mediaState.height);

    let nextX1 = rect.x1;
    let nextY1 = rect.y1;
    let nextX2 = rect.x2;
    let nextY2 = rect.y2;

    if (axis === "width") {
      nextX2 = nextX1 + requestedSize;
      if (nextX2 > mediaState.width) {
        nextX2 = mediaState.width;
        nextX1 = Math.max(0, nextX2 - requestedSize);
      }
    } else {
      nextY2 = nextY1 + requestedSize;
      if (nextY2 > mediaState.height) {
        nextY2 = mediaState.height;
        nextY1 = Math.max(0, nextY2 - requestedSize);
      }
    }

    await setCoverDesignerMediaCropRect(slotId, {
      x1: nextX1,
      y1: nextY1,
      x2: nextX2,
      y2: nextY2,
    });
  }

  function trimTrailingEmptyPages(pages: PostPageForm[]): PostPageForm[] {
    if (pages.length <= 1) {
      return pages;
    }

    const nextPages = [...pages];
    while (nextPages.length > 1) {
      const lastPage = nextPages[nextPages.length - 1];
      if (lastPage.elements.length > 0) {
        break;
      }

      revokePageMediaPreviewUrls(lastPage);
      revokePreviewUrl(lastPage.background_image_preview_url);
      revokePreviewUrl(lastPage.background_cropped_preview_url);
      nextPages.pop();
    }

    return nextPages;
  }

  function updatePage(index: number, updater: (page: PostPageForm) => PostPageForm, options?: { trimTrailingEmptyLastPage?: boolean }) {
    setForm((previous) => {
      if (!previous.pages[index]) {
        return previous;
      }

      let nextPages = [...previous.pages];
      nextPages[index] = normalizePageElementCollections(updater(nextPages[index]));
      if (options?.trimTrailingEmptyLastPage) {
        nextPages = trimTrailingEmptyPages(nextPages);
      }
      return { ...previous, pages: nextPages };
    });
  }

  function updatePageText(index: number, elementKey: PageElementKey, value: string) {
    updatePage(index, (page) => ({
      ...page,
      text_by_element: {
        ...page.text_by_element,
        [elementKey]: value,
      },
    }));
  }

  function setPageMediaFitMode(index: number, elementKey: PageElementKey, mode: MediaFitMode) {
    updatePage(index, (page) => {
      const currentMedia = getMediaStateForElement(page, elementKey);
      return {
        ...page,
        media_by_element: {
          ...page.media_by_element,
          [elementKey]: {
            ...currentMedia,
            media_fit_mode: mode,
          },
        },
      };
    });
  }

  function setPageBackgroundFitMode(index: number, mode: MediaFitMode) {
    updatePage(index, (page) => ({ ...page, background_fit_mode: mode }));
  }

  function setPageBackgroundEffectPreset(index: number, preset: BackgroundEffectPreset) {
    updatePage(index, (page) => ({
      ...page,
      background_effect_preset: preset,
    }));
  }

  function setPageBackgroundColor(index: number, color: string) {
    updatePage(index, (page) => ({ ...page, background_color: color }));
  }

  function setPageBackgroundGradientColor(index: number, color: string | null) {
    updatePage(index, (page) => ({
      ...page,
      background_gradient_color: color,
    }));
  }

  function setPageContainerPadding(index: number, side: PageContainerPaddingSide, paddingPx: number) {
    const normalizedPadding = normalizeDraggedMarginValue(paddingPx);

    updatePage(index, (page) => ({
      ...page,
      container_padding_px: {
        ...page.container_padding_px,
        [side]: normalizedPadding,
      },
    }));
  }

  function setElementCornerRadius(index: number, elementKey: PageElementKey, radiusPxRaw: string) {
    const radiusPx = radiusPxRaw === "default" ? null : Number.isFinite(Number(radiusPxRaw)) ? Number(radiusPxRaw) : null;
    const normalizedRadius = radiusPx !== null && ELEMENT_CORNER_RADIUS_OPTIONS_PX.includes(radiusPx as (typeof ELEMENT_CORNER_RADIUS_OPTIONS_PX)[number]) ? radiusPx : null;

    updatePage(index, (page) => ({
      ...page,
      element_corner_radius_px: {
        ...page.element_corner_radius_px,
        [elementKey]: normalizedRadius,
      },
    }));
  }

  function setElementPadding(index: number, elementKey: PageElementKey, paddingPx: number) {
    const normalizedPadding = ELEMENT_PADDING_OPTIONS_PX.includes(paddingPx as (typeof ELEMENT_PADDING_OPTIONS_PX)[number]) ? paddingPx : DEFAULT_ELEMENT_PADDING_PX;

    updatePage(index, (page) => ({
      ...page,
      element_padding_px: {
        ...page.element_padding_px,
        [elementKey]: normalizedPadding,
      },
    }));
  }

  function setElementMargin(index: number, elementKey: PageElementKey, side: ElementMarginSide, marginPx: number) {
    const normalizedMargin = normalizeDraggedMarginValue(marginPx);

    updatePage(index, (page) => ({
      ...page,
      element_margin_px: {
        ...page.element_margin_px,
        [elementKey]: {
          ...page.element_margin_px[elementKey],
          [side]: normalizedMargin,
        },
      },
    }));
  }

  function setElementMargins(index: number, elementKey: PageElementKey, marginPx: Record<ElementMarginSide, number>) {
    updatePage(index, (page) => {
      const normalizedMargin = {
        top: normalizeDraggedMarginValue(marginPx.top),
        right: normalizeDraggedMarginValue(marginPx.right),
        bottom: normalizeDraggedMarginValue(marginPx.bottom),
        left: normalizeDraggedMarginValue(marginPx.left),
      };

      const currentMargin = page.element_margin_px[elementKey];
      if (currentMargin.top === normalizedMargin.top && currentMargin.right === normalizedMargin.right && currentMargin.bottom === normalizedMargin.bottom && currentMargin.left === normalizedMargin.left) {
        return page;
      }

      return {
        ...page,
        element_margin_px: {
          ...page.element_margin_px,
          [elementKey]: normalizedMargin,
        },
      };
    });
  }

  function resetElementMargins(index: number, elementKey: PageElementKey) {
    setElementMargins(index, elementKey, DEFAULT_ELEMENT_MARGIN_PX);
  }

  function applyPreviewMarginDragMargins(index: number, element: PreviewDraggableElement, elementMarginPx: Record<ElementMarginSide, number>, previousElement: PreviewDraggableElement | null, previousElementBottomPx: number | null) {
    updatePage(index, (page) => {
      const normalizedElementMargin = {
        top: normalizeDraggedMarginValue(elementMarginPx.top),
        right: normalizeDraggedMarginValue(elementMarginPx.right),
        bottom: normalizeDraggedMarginValue(elementMarginPx.bottom),
        left: normalizeDraggedMarginValue(elementMarginPx.left),
      };

      const nextElementMargins = { ...page.element_margin_px };
      let hasChanges = false;

      const currentElementMargin = page.element_margin_px[element];
      if (currentElementMargin.top !== normalizedElementMargin.top || currentElementMargin.right !== normalizedElementMargin.right || currentElementMargin.bottom !== normalizedElementMargin.bottom || currentElementMargin.left !== normalizedElementMargin.left) {
        nextElementMargins[element] = normalizedElementMargin;
        hasChanges = true;
      }

      if (previousElement && previousElementBottomPx !== null) {
        const normalizedPreviousBottom = normalizeDraggedMarginValue(previousElementBottomPx);
        const previousMargin = page.element_margin_px[previousElement];
        if (previousMargin.bottom !== normalizedPreviousBottom) {
          nextElementMargins[previousElement] = {
            ...previousMargin,
            bottom: normalizedPreviousBottom,
          };
          hasChanges = true;
        }
      }

      if (!hasChanges) {
        return page;
      }

      return {
        ...page,
        element_margin_px: nextElementMargins,
      };
    });
  }

  function setTextBackgroundMode(index: number, elementKey: PageElementKey, mode: TextBackgroundMode) {
    updatePage(index, (page) => {
      const withWrapText = page.text_background_elements.filter((value) => value !== elementKey);
      const withFullWidth = page.text_background_full_width_elements.filter((value) => value !== elementKey);

      if (mode === "wrap") {
        withWrapText.push(elementKey);
      } else if (mode === "full-width") {
        withWrapText.push(elementKey);
        withFullWidth.push(elementKey);
      }

      return {
        ...page,
        text_background_elements: withWrapText,
        text_background_full_width_elements: withFullWidth,
      };
    });
  }

  function setTextElementStyle(index: number, elementKey: PageElementKey, style: TextElementStyle) {
    updatePage(index, (page) => {
      const currentTextColor = toOptionalHexColor(page.text_color_by_element[elementKey]);
      const defaultTemplateColor = normalizeHexColorToSix(selectedTemplate.elements[style].color);
      const currentTextBackgroundTranslucency = toOptionalTranslucencyPercent(page.text_background_translucency_by_element[elementKey]);
      const defaultTemplateBackgroundTranslucency = getTemplateTextBackgroundDefaults(selectedTemplate.elements[style]).translucencyPercent;
      return {
        ...page,
        text_style_by_element: {
          ...page.text_style_by_element,
          [elementKey]: style,
        },
        text_color_by_element: {
          ...page.text_color_by_element,
          [elementKey]: currentTextColor ?? defaultTemplateColor,
        },
        text_background_translucency_by_element: {
          ...page.text_background_translucency_by_element,
          [elementKey]: currentTextBackgroundTranslucency ?? defaultTemplateBackgroundTranslucency,
        },
      };
    });
  }

  function setTextIsHeading(index: number, elementKey: PageElementKey, isHeading: boolean) {
    updatePage(index, (page) => ({
      ...page,
      text_is_heading_by_element: {
        ...page.text_is_heading_by_element,
        [elementKey]: isHeading,
      },
    }));
  }

  function setTextAlignment(index: number, elementKey: PageElementKey, alignment: TextAlignment) {
    updatePage(index, (page) => ({
      ...page,
      text_alignments: {
        ...page.text_alignments,
        [elementKey]: alignment,
      },
    }));
  }

  function setTextEffect(index: number, elementKey: PageElementKey, effect: TextEffectPreset) {
    updatePage(index, (page) => ({
      ...page,
      text_effects: {
        ...page.text_effects,
        [elementKey]: effect,
      },
    }));
  }

  function setTextColor(index: number, elementKey: PageElementKey, color: string) {
    updatePage(index, (page) => ({
      ...page,
      text_color_by_element: {
        ...page.text_color_by_element,
        [elementKey]: toOptionalHexColor(color),
      },
    }));
  }

  function setTextBackgroundColor(index: number, elementKey: PageElementKey, color: string) {
    updatePage(index, (page) => ({
      ...page,
      text_background_color_by_element: {
        ...page.text_background_color_by_element,
        [elementKey]: toOptionalHexColor(color),
      },
    }));
  }

  function setTextBackgroundTranslucency(index: number, elementKey: PageElementKey, value: number) {
    updatePage(index, (page) => ({
      ...page,
      text_background_translucency_by_element: {
        ...page.text_background_translucency_by_element,
        [elementKey]: normalizeTranslucencyPercent(value),
      },
    }));
  }

  function addElementToPage(index: number, elementType: PageElementType) {
    updatePage(
      index,
      (page) => {
        const elementKey = createElementKey(elementType);
        const scopedDefaults = createElementScopedDefaults([elementKey]);
        const nextTextColorByElement = {
          ...page.text_color_by_element,
          ...scopedDefaults.textColorByElement,
        };
        const nextTextBackgroundTranslucencyByElement = {
          ...page.text_background_translucency_by_element,
          ...scopedDefaults.textBackgroundTranslucencyByElement,
        };
        if (elementType === "text") {
          const defaultTextStyle = scopedDefaults.textStyleByElement[elementKey] ?? DEFAULT_TEXT_ELEMENT_STYLE;
          nextTextColorByElement[elementKey] = normalizeHexColorToSix(selectedTemplate.elements[defaultTextStyle].color);
          nextTextBackgroundTranslucencyByElement[elementKey] = getTemplateTextBackgroundDefaults(selectedTemplate.elements[defaultTextStyle]).translucencyPercent;
        }
        const nextPage: PostPageForm = {
          ...page,
          elements: [...page.elements, elementKey],
          text_alignments: {
            ...page.text_alignments,
            ...scopedDefaults.textAlignments,
          },
          text_effects: {
            ...page.text_effects,
            ...scopedDefaults.textEffects,
          },
          element_corner_radius_px: {
            ...page.element_corner_radius_px,
            ...scopedDefaults.elementCornerRadius,
          },
          element_padding_px: {
            ...page.element_padding_px,
            ...scopedDefaults.elementPadding,
          },
          element_margin_px: {
            ...page.element_margin_px,
            ...scopedDefaults.elementMargins,
          },
          text_by_element: {
            ...page.text_by_element,
            ...scopedDefaults.textByElement,
          },
          text_style_by_element: {
            ...page.text_style_by_element,
            ...scopedDefaults.textStyleByElement,
          },
          text_is_heading_by_element: {
            ...page.text_is_heading_by_element,
            ...scopedDefaults.textIsHeadingByElement,
          },
          text_color_by_element: nextTextColorByElement,
          text_background_color_by_element: {
            ...page.text_background_color_by_element,
            ...scopedDefaults.textBackgroundColorByElement,
          },
          text_background_translucency_by_element: nextTextBackgroundTranslucencyByElement,
          media_by_element:
            elementType === "media"
              ? {
                  ...page.media_by_element,
                  [elementKey]: createDefaultMediaElementState(),
                }
              : page.media_by_element,
        };
        return nextPage;
      },
      { trimTrailingEmptyLastPage: true },
    );
  }

  function addPageAfter(index: number) {
    runWithoutScrollJump(() => {
      setForm((previous) => {
        if (!previous.pages[index]) {
          return previous;
        }

        const nextPages = [...previous.pages];
        nextPages.splice(index + 1, 0, createEmptyPage());

        return {
          ...previous,
          pages: nextPages,
        };
      });
      setActivePageIndex(index + 1);
    });
  }

  function removeElementFromPage(index: number, elementKey: PageElementKey) {
    updatePage(index, (page) => {
      const nextElements = page.elements.filter((value) => value !== elementKey);
      const existingMediaState = page.media_by_element[elementKey];
      const { [elementKey]: _removedAlignment, ...nextAlignments } = page.text_alignments;
      const { [elementKey]: _removedEffect, ...nextEffects } = page.text_effects;
      const { [elementKey]: _removedCorner, ...nextCornerRadius } = page.element_corner_radius_px;
      const { [elementKey]: _removedPadding, ...nextPadding } = page.element_padding_px;
      const { [elementKey]: _removedMargin, ...nextMargins } = page.element_margin_px;
      const { [elementKey]: _removedText, ...nextTextByElement } = page.text_by_element;
      const { [elementKey]: _removedTextStyle, ...nextTextStyleByElement } = page.text_style_by_element;
      const { [elementKey]: _removedTextIsHeading, ...nextTextIsHeadingByElement } = page.text_is_heading_by_element;
      const { [elementKey]: _removedTextColor, ...nextTextColorByElement } = page.text_color_by_element;
      const { [elementKey]: _removedTextBackgroundColor, ...nextTextBackgroundColorByElement } = page.text_background_color_by_element;
      const { [elementKey]: _removedTextBackgroundTranslucency, ...nextTextBackgroundTranslucencyByElement } = page.text_background_translucency_by_element;
      const { [elementKey]: _removedMedia, ...nextMediaByElement } = page.media_by_element;

      if (existingMediaState) {
        revokePreviewUrl(existingMediaState.image_preview_url);
        revokePreviewUrl(existingMediaState.cropped_preview_url);
      }

      return {
        ...page,
        elements: nextElements,
        hiddenElements: page.hiddenElements.filter((value) => value !== elementKey),
        text_background_elements: page.text_background_elements.filter((value) => value !== elementKey),
        text_background_full_width_elements: page.text_background_full_width_elements.filter((value) => value !== elementKey),
        text_alignments: nextAlignments,
        text_effects: nextEffects,
        element_corner_radius_px: nextCornerRadius,
        element_padding_px: nextPadding,
        element_margin_px: nextMargins,
        text_by_element: nextTextByElement,
        text_style_by_element: nextTextStyleByElement,
        text_is_heading_by_element: nextTextIsHeadingByElement,
        text_color_by_element: nextTextColorByElement,
        text_background_color_by_element: nextTextBackgroundColorByElement,
        text_background_translucency_by_element: nextTextBackgroundTranslucencyByElement,
        media_by_element: nextMediaByElement,
      };
    });
  }

  function toggleElementHidden(index: number, elementKey: PageElementKey) {
    updatePage(index, (page) => {
      if (!page.elements.includes(elementKey)) {
        return page;
      }

      const isHidden = page.hiddenElements.includes(elementKey);
      return {
        ...page,
        hiddenElements: isHidden ? page.hiddenElements.filter((value) => value !== elementKey) : [...page.hiddenElements, elementKey],
      };
    });
  }

  function moveElementInPage(index: number, fromIndex: number, toIndex: number) {
    updatePage(
      index,
      (page) => {
        if (toIndex < 0 || toIndex >= page.elements.length || fromIndex === toIndex) {
          return page;
        }

        const nextElements = [...page.elements];
        const [item] = nextElements.splice(fromIndex, 1);
        nextElements.splice(toIndex, 0, item);

        return {
          ...page,
          elements: nextElements,
        };
      },
      { trimTrailingEmptyLastPage: true },
    );
  }

  async function setPageImageFile(index: number, elementKey: PageElementKey, file: File) {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Only image files are allowed.");
      return;
    }

    try {
      const { width, height } = await getImageDimensions(file);
      const previewUrl = URL.createObjectURL(file);

      if (isEditMode) {
        updatePage(index, (page) => {
          const currentMediaState = getMediaStateForElement(page, elementKey);
          if (currentMediaState.image_preview_url && currentMediaState.image_preview_url !== previewUrl) {
            revokePreviewUrl(currentMediaState.image_preview_url);
          }
          if (currentMediaState.cropped_preview_url) {
            revokePreviewUrl(currentMediaState.cropped_preview_url);
          }

          const nextMediaState = createDefaultMediaElementState({
            image_file: file,
            image_preview_url: previewUrl,
            cropped_preview_url: null,
            media_url: null,
            raw_media_url: null,
            width,
            height,
            media_crop_top_left_x: null,
            media_crop_top_left_y: null,
            media_crop_bottom_right_x: null,
            media_crop_bottom_right_y: null,
            media_fit_mode: currentMediaState.media_fit_mode ?? "width",
          });

          return syncLegacyMediaFieldsFromPrimaryElement({
            ...page,
            media_by_element: {
              ...page.media_by_element,
              [elementKey]: nextMediaState,
            },
          });
        });
        return;
      }

      const sliceRects = getVerticalSliceRectsByScale(width, height, form.page_scale);
      const generatedCroppedPreviewUrls: string[] = [];

      try {
        const nextPagesForSlices = await Promise.all(
          sliceRects.map(async (sliceRect, sliceIndex) => {
            const croppedPreviewUrl = await createCroppedPreviewUrl(previewUrl, sliceRect);
            generatedCroppedPreviewUrls.push(croppedPreviewUrl);

            const basePage = sliceIndex === 0 ? (pagesRef.current[index] ?? form.pages[index] ?? createEmptyPage()) : createEmptyPage();
            const mediaElementKey = sliceIndex === 0 ? elementKey : createElementKey("media");
            const mediaOnlyDefaults = createElementScopedDefaults([mediaElementKey]);
            const nextMediaState = createDefaultMediaElementState({
              image_file: file,
              image_preview_url: previewUrl,
              cropped_preview_url: croppedPreviewUrl,
              media_url: null,
              raw_media_url: null,
              width,
              height,
              media_crop_top_left_x: sliceRect.x1,
              media_crop_top_left_y: sliceRect.y1,
              media_crop_bottom_right_x: sliceRect.x2,
              media_crop_bottom_right_y: sliceRect.y2,
              media_fit_mode: "width",
            });
            const nextMediaByElement =
              sliceIndex === 0
                ? {
                    ...basePage.media_by_element,
                    [mediaElementKey]: nextMediaState,
                  }
                : {
                    [mediaElementKey]: nextMediaState,
                  };
            return syncLegacyMediaFieldsFromPrimaryElement({
              ...basePage,
              elements: sliceIndex === 0 ? basePage.elements : [mediaElementKey],
              hiddenElements: sliceIndex === 0 ? basePage.hiddenElements : [],
              text_background_elements: sliceIndex === 0 ? basePage.text_background_elements : [],
              text_background_full_width_elements: sliceIndex === 0 ? basePage.text_background_full_width_elements : [],
              text_alignments: sliceIndex === 0 ? basePage.text_alignments : mediaOnlyDefaults.textAlignments,
              text_effects: sliceIndex === 0 ? basePage.text_effects : mediaOnlyDefaults.textEffects,
              element_corner_radius_px: sliceIndex === 0 ? basePage.element_corner_radius_px : mediaOnlyDefaults.elementCornerRadius,
              element_padding_px: sliceIndex === 0 ? basePage.element_padding_px : mediaOnlyDefaults.elementPadding,
              element_margin_px: sliceIndex === 0 ? basePage.element_margin_px : mediaOnlyDefaults.elementMargins,
              text_by_element: sliceIndex === 0 ? basePage.text_by_element : mediaOnlyDefaults.textByElement,
              text_style_by_element: sliceIndex === 0 ? basePage.text_style_by_element : mediaOnlyDefaults.textStyleByElement,
              text_is_heading_by_element: sliceIndex === 0 ? basePage.text_is_heading_by_element : mediaOnlyDefaults.textIsHeadingByElement,
              text_color_by_element: sliceIndex === 0 ? basePage.text_color_by_element : mediaOnlyDefaults.textColorByElement,
              text_background_color_by_element: sliceIndex === 0 ? basePage.text_background_color_by_element : mediaOnlyDefaults.textBackgroundColorByElement,
              text_background_translucency_by_element: sliceIndex === 0 ? basePage.text_background_translucency_by_element : mediaOnlyDefaults.textBackgroundTranslucencyByElement,
              media_by_element: nextMediaByElement,
            });
          }),
        );

        setForm((previous) => {
          const nextPages = [...previous.pages];
          const existingPage = nextPages[index];
          if (existingPage) {
            const existingUrls = getPageMediaPreviewUrls(existingPage);
            const retainedUrls = new Set(nextPagesForSlices.flatMap((nextPage) => getPageMediaPreviewUrls(nextPage)));
            for (const url of existingUrls) {
              if (!retainedUrls.has(url)) {
                revokePreviewUrl(url);
              }
            }
          }

          nextPages.splice(index, 1, ...nextPagesForSlices);
          return { ...previous, pages: nextPages };
        });
        setActivePageIndex(index);
        if (sliceRects.length > 1) {
          setSuccessMessage(`Image auto-sliced into ${sliceRects.length} ${form.page_scale} slices.`);
        }
      } catch (error) {
        for (const generatedUrl of generatedCroppedPreviewUrls) {
          revokePreviewUrl(generatedUrl);
        }
        revokePreviewUrl(previewUrl);
        throw error;
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to read image.");
    }
  }

  async function setPageBackgroundImageFile(index: number, file: File) {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Only image files are allowed.");
      return;
    }

    try {
      const { width, height } = await getImageDimensions(file);
      const previewUrl = URL.createObjectURL(file);

      updatePage(index, (page) => {
        revokePreviewUrl(page.background_image_preview_url);
        revokePreviewUrl(page.background_cropped_preview_url);
        return {
          ...page,
          background_image_file: file,
          background_image_preview_url: previewUrl,
          background_cropped_preview_url: null,
          background_media_url: null,
          background_width: width,
          background_height: height,
          background_crop_top_left_x: null,
          background_crop_top_left_y: null,
          background_crop_bottom_right_x: null,
          background_crop_bottom_right_y: null,
          background_fit_mode: page.background_fit_mode === "repeat" ? "cover" : page.background_fit_mode,
        };
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to read background image.");
    }
  }

  async function applyDefaultBackgroundCrop(index: number) {
    const page = pagesRef.current[index] ?? form.pages[index];
    const imageSrc = page?.background_image_preview_url || page?.background_media_url;

    if (!page || !imageSrc || page.background_width === null || page.background_height === null) {
      setErrorMessage("Add a background image before cropping.");
      return;
    }

    const defaultRect = getDefaultBackgroundCropRectByScale(page, form.page_scale);
    if (!defaultRect) {
      setErrorMessage("Background crop area could not be created.");
      return;
    }

    await setPageBackgroundCropRect(index, defaultRect);
  }

  function clearPageBackgroundCrop(index: number) {
    updatePage(index, (page) => {
      revokePreviewUrl(page.background_cropped_preview_url);
      return {
        ...page,
        background_cropped_preview_url: null,
        background_crop_top_left_x: null,
        background_crop_top_left_y: null,
        background_crop_bottom_right_x: null,
        background_crop_bottom_right_y: null,
      };
    });
  }

  function clearPageBackgroundImage(index: number) {
    updatePage(index, (page) => {
      revokePreviewUrl(page.background_image_preview_url);
      revokePreviewUrl(page.background_cropped_preview_url);
      return {
        ...page,
        background_image_file: null,
        background_image_preview_url: null,
        background_cropped_preview_url: null,
        background_media_url: null,
        background_width: null,
        background_height: null,
        background_crop_top_left_x: null,
        background_crop_top_left_y: null,
        background_crop_bottom_right_x: null,
        background_crop_bottom_right_y: null,
        background_fit_mode: page.background_fit_mode === "repeat" ? "cover" : page.background_fit_mode,
      };
    });
  }

  async function setPageBackgroundCropRect(index: number, rect: { x1: number; y1: number; x2: number; y2: number }): Promise<void> {
    const page = pagesRef.current[index] ?? form.pages[index];
    const imageSrc = page?.background_image_preview_url || page?.background_media_url;

    if (!page || !imageSrc || page.background_width === null || page.background_height === null) {
      return;
    }

    const x1 = clamp(Math.round(Math.min(rect.x1, rect.x2)), 0, page.background_width - 1);
    const y1 = clamp(Math.round(Math.min(rect.y1, rect.y2)), 0, page.background_height - 1);
    const x2 = clamp(Math.round(Math.max(rect.x1, rect.x2)), x1 + 1, page.background_width);
    const y2 = clamp(Math.round(Math.max(rect.y1, rect.y2)), y1 + 1, page.background_height);

    let croppedPreviewUrl: string | null = null;
    try {
      croppedPreviewUrl = await createCroppedPreviewUrl(imageSrc, {
        x1,
        y1,
        x2,
        y2,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create cropped background preview.");
    }

    updatePage(index, (currentPage) => {
      revokePreviewUrl(currentPage.background_cropped_preview_url);
      return {
        ...currentPage,
        background_cropped_preview_url: croppedPreviewUrl,
        background_crop_top_left_x: x1,
        background_crop_top_left_y: y1,
        background_crop_bottom_right_x: x2,
        background_crop_bottom_right_y: y2,
      };
    });
  }

  async function setPageBackgroundCropDimension(index: number, axis: "width" | "height", rawValue: string): Promise<void> {
    const targetValue = parseOptionalInteger(rawValue);
    const page = pagesRef.current[index] ?? form.pages[index];
    const rect = page ? getBackgroundCropRect(page) : null;

    if (targetValue === null || !page || !rect || page.background_width === null || page.background_height === null) {
      return;
    }

    const requestedSize = axis === "width" ? clamp(targetValue, 1, page.background_width) : clamp(targetValue, 1, page.background_height);

    let nextX1 = rect.x1;
    let nextY1 = rect.y1;
    let nextX2 = rect.x2;
    let nextY2 = rect.y2;

    if (axis === "width") {
      nextX2 = nextX1 + requestedSize;
      if (nextX2 > page.background_width) {
        nextX2 = page.background_width;
        nextX1 = Math.max(0, nextX2 - requestedSize);
      }
    } else {
      nextY2 = nextY1 + requestedSize;
      if (nextY2 > page.background_height) {
        nextY2 = page.background_height;
        nextY1 = Math.max(0, nextY2 - requestedSize);
      }
    }

    await setPageBackgroundCropRect(index, {
      x1: nextX1,
      y1: nextY1,
      x2: nextX2,
      y2: nextY2,
    });
  }

  async function applyDefaultCrop(index: number, elementKey: PageElementKey) {
    const page = pagesRef.current[index] ?? form.pages[index];
    const mediaState = page ? getMediaStateForElement(page, elementKey) : null;
    const imageSrc = mediaState?.image_preview_url || mediaState?.raw_media_url || mediaState?.media_url;

    if (!page || !mediaState || !imageSrc || mediaState.width === null || mediaState.height === null) {
      setErrorMessage("Add an image before cropping.");
      return;
    }

    const defaultRect = getDefaultMediaCropRectByScale(page, elementKey, form.page_scale);
    if (!defaultRect) {
      setErrorMessage("Crop area could not be created.");
      return;
    }

    await setPageCropRect(index, elementKey, defaultRect);
  }

  function clearPageCrop(index: number, elementKey: PageElementKey) {
    updatePage(index, (page) => {
      const mediaState = getMediaStateForElement(page, elementKey);
      revokePreviewUrl(mediaState.cropped_preview_url);
      return {
        ...page,
        media_by_element: {
          ...page.media_by_element,
          [elementKey]: {
            ...mediaState,
            cropped_preview_url: null,
            media_crop_top_left_x: null,
            media_crop_top_left_y: null,
            media_crop_bottom_right_x: null,
            media_crop_bottom_right_y: null,
          },
        },
      };
    });
  }

  async function setPageCropRect(index: number, elementKey: PageElementKey, rect: { x1: number; y1: number; x2: number; y2: number }): Promise<void> {
    const page = pagesRef.current[index] ?? form.pages[index];
    const mediaState = page ? getMediaStateForElement(page, elementKey) : null;
    const imageSrc = mediaState?.image_preview_url || mediaState?.raw_media_url || mediaState?.media_url;

    if (!page || !mediaState || !imageSrc || mediaState.width === null || mediaState.height === null) {
      return;
    }

    const x1 = clamp(Math.round(Math.min(rect.x1, rect.x2)), 0, mediaState.width - 1);
    const y1 = clamp(Math.round(Math.min(rect.y1, rect.y2)), 0, mediaState.height - 1);
    const x2 = clamp(Math.round(Math.max(rect.x1, rect.x2)), x1 + 1, mediaState.width);
    const y2 = clamp(Math.round(Math.max(rect.y1, rect.y2)), y1 + 1, mediaState.height);

    let croppedPreviewUrl: string | null = null;
    try {
      croppedPreviewUrl = await createCroppedPreviewUrl(imageSrc, {
        x1,
        y1,
        x2,
        y2,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create cropped preview.");
    }

    updatePage(index, (currentPage) => {
      const currentMediaState = getMediaStateForElement(currentPage, elementKey);
      revokePreviewUrl(currentMediaState.cropped_preview_url);
      return {
        ...currentPage,
        media_by_element: {
          ...currentPage.media_by_element,
          [elementKey]: {
            ...currentMediaState,
            cropped_preview_url: croppedPreviewUrl,
            media_crop_top_left_x: x1,
            media_crop_top_left_y: y1,
            media_crop_bottom_right_x: x2,
            media_crop_bottom_right_y: y2,
          },
        },
      };
    });
  }

  async function setPageCropDimension(index: number, elementKey: PageElementKey, axis: "width" | "height", rawValue: string): Promise<void> {
    const targetValue = parseOptionalInteger(rawValue);
    const page = pagesRef.current[index] ?? form.pages[index];
    const mediaState = page ? getMediaStateForElement(page, elementKey) : null;
    const rect = page ? getMediaCropRect(page, elementKey) : null;

    if (targetValue === null || !page || !mediaState || !rect || mediaState.width === null || mediaState.height === null) {
      return;
    }

    const requestedSize = axis === "width" ? clamp(targetValue, 1, mediaState.width) : clamp(targetValue, 1, mediaState.height);

    let nextX1 = rect.x1;
    let nextY1 = rect.y1;
    let nextX2 = rect.x2;
    let nextY2 = rect.y2;

    if (axis === "width") {
      nextX2 = nextX1 + requestedSize;
      if (nextX2 > mediaState.width) {
        nextX2 = mediaState.width;
        nextX1 = Math.max(0, nextX2 - requestedSize);
      }
    } else {
      nextY2 = nextY1 + requestedSize;
      if (nextY2 > mediaState.height) {
        nextY2 = mediaState.height;
        nextY1 = Math.max(0, nextY2 - requestedSize);
      }
    }

    await setPageCropRect(index, elementKey, {
      x1: nextX1,
      y1: nextY1,
      x2: nextX2,
      y2: nextY2,
    });
  }

  function getInlineCropPointerPosition(imageWidth: number, imageHeight: number, clientX: number, clientY: number, containerRect: { left: number; top: number; width: number; height: number }) {
    if (containerRect.width <= 0 || containerRect.height <= 0) {
      return null;
    }

    const relativeX = clamp(clientX - containerRect.left, 0, containerRect.width);
    const relativeY = clamp(clientY - containerRect.top, 0, containerRect.height);

    return {
      x: (relativeX / containerRect.width) * imageWidth,
      y: (relativeY / containerRect.height) * imageHeight,
    };
  }

  function applyInlineCropOverlayStyle(overlay: HTMLDivElement | null, rect: { x1: number; y1: number; x2: number; y2: number }, imageWidth: number, imageHeight: number) {
    if (!overlay || imageWidth <= 0 || imageHeight <= 0) {
      return;
    }

    overlay.style.left = `${(Math.min(rect.x1, rect.x2) / imageWidth) * 100}%`;
    overlay.style.top = `${(Math.min(rect.y1, rect.y2) / imageHeight) * 100}%`;
    overlay.style.width = `${((Math.max(rect.x1, rect.x2) - Math.min(rect.x1, rect.x2)) / imageWidth) * 100}%`;
    overlay.style.height = `${((Math.max(rect.y1, rect.y2) - Math.min(rect.y1, rect.y2)) / imageHeight) * 100}%`;
  }

  function resolveInlineCropDragMode(clientX: number, clientY: number, overlayRect: DOMRect): InlineCropDragMode {
    const edgeThreshold = 12;
    const distances: Array<{ mode: InlineCropDragMode; distance: number }> = [
      { mode: "resize-left", distance: Math.abs(clientX - overlayRect.left) },
      { mode: "resize-right", distance: Math.abs(overlayRect.right - clientX) },
      { mode: "resize-top", distance: Math.abs(clientY - overlayRect.top) },
      {
        mode: "resize-bottom",
        distance: Math.abs(overlayRect.bottom - clientY),
      },
    ];

    distances.sort((a, b) => a.distance - b.distance);
    return distances[0].distance <= edgeThreshold ? distances[0].mode : "move";
  }

  function updateInlineCropHoverCursor(event: React.PointerEvent<HTMLDivElement>) {
    const mode = resolveInlineCropDragMode(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
    event.currentTarget.style.cursor = getInlineCropCursor(mode);
  }

  function computeInlineCropDragRect(dragState: InlineCropDragState, point: { x: number; y: number }, imageWidth: number, imageHeight: number): { x1: number; y1: number; x2: number; y2: number } {
    const rectWidth = dragState.startRect.x2 - dragState.startRect.x1;
    const rectHeight = dragState.startRect.y2 - dragState.startRect.y1;
    const dx = Math.round(point.x - dragState.startPointerX);
    const dy = Math.round(point.y - dragState.startPointerY);

    if (dragState.mode === "move") {
      const nextX1 = clamp(dragState.startRect.x1 + dx, 0, Math.max(0, imageWidth - rectWidth));
      const nextY1 = clamp(dragState.startRect.y1 + dy, 0, Math.max(0, imageHeight - rectHeight));
      return {
        x1: nextX1,
        y1: nextY1,
        x2: nextX1 + rectWidth,
        y2: nextY1 + rectHeight,
      };
    }

    if (dragState.mode === "resize-left") {
      const nextX1 = clamp(dragState.startRect.x1 + dx, 0, dragState.startRect.x2 - 1);
      return {
        x1: nextX1,
        y1: dragState.startRect.y1,
        x2: dragState.startRect.x2,
        y2: dragState.startRect.y2,
      };
    }

    if (dragState.mode === "resize-right") {
      const nextX2 = clamp(dragState.startRect.x2 + dx, dragState.startRect.x1 + 1, imageWidth);
      return {
        x1: dragState.startRect.x1,
        y1: dragState.startRect.y1,
        x2: nextX2,
        y2: dragState.startRect.y2,
      };
    }

    if (dragState.mode === "resize-top") {
      const nextY1 = clamp(dragState.startRect.y1 + dy, 0, dragState.startRect.y2 - 1);
      return {
        x1: dragState.startRect.x1,
        y1: nextY1,
        x2: dragState.startRect.x2,
        y2: dragState.startRect.y2,
      };
    }

    const nextY2 = clamp(dragState.startRect.y2 + dy, dragState.startRect.y1 + 1, imageHeight);
    return {
      x1: dragState.startRect.x1,
      y1: dragState.startRect.y1,
      x2: dragState.startRect.x2,
      y2: nextY2,
    };
  }

  function computeCoverInlineCropDragRect(dragState: CoverInlineCropDragState, point: { x: number; y: number }, imageWidth: number, imageHeight: number): { x1: number; y1: number; x2: number; y2: number } {
    const rectWidth = dragState.startRect.x2 - dragState.startRect.x1;
    const rectHeight = dragState.startRect.y2 - dragState.startRect.y1;
    const dx = Math.round(point.x - dragState.startPointerX);
    const dy = Math.round(point.y - dragState.startPointerY);

    if (dragState.mode === "move") {
      const nextX1 = clamp(dragState.startRect.x1 + dx, 0, Math.max(0, imageWidth - rectWidth));
      const nextY1 = clamp(dragState.startRect.y1 + dy, 0, Math.max(0, imageHeight - rectHeight));
      return {
        x1: nextX1,
        y1: nextY1,
        x2: nextX1 + rectWidth,
        y2: nextY1 + rectHeight,
      };
    }

    if (dragState.mode === "resize-left") {
      const nextX1 = clamp(dragState.startRect.x1 + dx, 0, dragState.startRect.x2 - 1);
      return {
        x1: nextX1,
        y1: dragState.startRect.y1,
        x2: dragState.startRect.x2,
        y2: dragState.startRect.y2,
      };
    }

    if (dragState.mode === "resize-right") {
      const nextX2 = clamp(dragState.startRect.x2 + dx, dragState.startRect.x1 + 1, imageWidth);
      return {
        x1: dragState.startRect.x1,
        y1: dragState.startRect.y1,
        x2: nextX2,
        y2: dragState.startRect.y2,
      };
    }

    if (dragState.mode === "resize-top") {
      const nextY1 = clamp(dragState.startRect.y1 + dy, 0, dragState.startRect.y2 - 1);
      return {
        x1: dragState.startRect.x1,
        y1: nextY1,
        x2: dragState.startRect.x2,
        y2: dragState.startRect.y2,
      };
    }

    const nextY2 = clamp(dragState.startRect.y2 + dy, dragState.startRect.y1 + 1, imageHeight);
    return {
      x1: dragState.startRect.x1,
      y1: dragState.startRect.y1,
      x2: dragState.startRect.x2,
      y2: nextY2,
    };
  }

  function startInlineCropDrag(index: number, target: CropTarget, mediaElementKey: PageElementKey | null, event: React.PointerEvent<HTMLDivElement>) {
    const page = form.pages[index];
    if (!page) {
      return;
    }

    const mediaState = target === "media" && mediaElementKey ? getMediaStateForElement(page, mediaElementKey) : null;
    const imageWidth = target === "media" ? mediaState?.width : page.background_width;
    const imageHeight = target === "media" ? mediaState?.height : page.background_height;
    const rect = target === "media" && mediaElementKey ? getMediaCropRect(page, mediaElementKey) : getBackgroundCropRect(page);
    const hasTargetCrop = target === "media" && mediaElementKey ? hasMediaCropRect(page, mediaElementKey) : hasBackgroundCropRect(page);
    if (!hasTargetCrop || typeof imageWidth !== "number" || typeof imageHeight !== "number" || !rect) {
      return;
    }

    const container = event.currentTarget.parentElement;
    if (!container) {
      return;
    }

    const containerRectRaw = container.getBoundingClientRect();
    const containerRect = {
      left: containerRectRaw.left,
      top: containerRectRaw.top,
      width: containerRectRaw.width,
      height: containerRectRaw.height,
    };

    const point = getInlineCropPointerPosition(imageWidth, imageHeight, event.clientX, event.clientY, containerRect);
    if (!point) {
      return;
    }

    if (point.x < rect.x1 || point.x > rect.x2 || point.y < rect.y1 || point.y > rect.y2) {
      return;
    }

    const dragMode = resolveInlineCropDragMode(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
    event.currentTarget.style.cursor = getInlineCropCursor(dragMode);

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const dragState: InlineCropDragState = {
      pageIndex: index,
      target,
      mediaElementKey: target === "media" ? mediaElementKey : null,
      pointerId: event.pointerId,
      mode: dragMode,
      containerRect,
      startPointerX: point.x,
      startPointerY: point.y,
      startRect: rect,
      currentRect: rect,
    };

    inlineCropDragRef.current = dragState;
    setInlineCropDrag(dragState);
  }

  function moveInlineCropDrag(index: number, target: CropTarget, mediaElementKey: PageElementKey | null, event: React.PointerEvent<HTMLDivElement>) {
    const dragState = inlineCropDragRef.current;
    if (!dragState || dragState.pageIndex !== index || dragState.target !== target || dragState.mediaElementKey !== (target === "media" ? mediaElementKey : null) || dragState.pointerId !== event.pointerId) {
      updateInlineCropHoverCursor(event);
      return;
    }

    const page = pagesRef.current[index] ?? form.pages[index];
    const mediaState = target === "media" && mediaElementKey && page ? getMediaStateForElement(page, mediaElementKey) : null;
    const imageWidth = target === "media" ? mediaState?.width : page?.background_width;
    const imageHeight = target === "media" ? mediaState?.height : page?.background_height;
    const point = typeof imageWidth === "number" && typeof imageHeight === "number" ? getInlineCropPointerPosition(imageWidth, imageHeight, event.clientX, event.clientY, dragState.containerRect) : null;
    if (!page || typeof imageWidth !== "number" || typeof imageHeight !== "number" || !point) {
      return;
    }

    dragState.currentRect = computeInlineCropDragRect(dragState, point, imageWidth, imageHeight);
    inlineCropDragRef.current = dragState;
    applyInlineCropOverlayStyle(inlineCropOverlayRef.current, dragState.currentRect, imageWidth, imageHeight);
  }

  function endInlineCropDrag(index: number, target: CropTarget, mediaElementKey: PageElementKey | null, event: React.PointerEvent<HTMLDivElement>) {
    const dragState = inlineCropDragRef.current;
    if (!dragState || dragState.pageIndex !== index || dragState.target !== target || dragState.mediaElementKey !== (target === "media" ? mediaElementKey : null) || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    event.currentTarget.style.cursor = "move";

    const page = pagesRef.current[index] ?? form.pages[index];
    const mediaState = target === "media" && mediaElementKey && page ? getMediaStateForElement(page, mediaElementKey) : null;
    const imageWidth = target === "media" ? mediaState?.width : page?.background_width;
    const imageHeight = target === "media" ? mediaState?.height : page?.background_height;
    const point = typeof imageWidth === "number" && typeof imageHeight === "number" ? getInlineCropPointerPosition(imageWidth, imageHeight, event.clientX, event.clientY, dragState.containerRect) : null;
    let finalizedRect = dragState.currentRect;

    if (page && point && typeof imageWidth === "number" && typeof imageHeight === "number") {
      finalizedRect = computeInlineCropDragRect(dragState, point, imageWidth, imageHeight);
    }

    inlineCropDragRef.current = null;
    inlineCropOverlayRef.current = null;
    if (target === "media" && mediaElementKey) {
      void setPageCropRect(index, mediaElementKey, finalizedRect);
    } else {
      void setPageBackgroundCropRect(index, finalizedRect);
    }

    setInlineCropDrag(null);
  }

  function startCoverInlineCropDrag(slotId: string, event: React.PointerEvent<HTMLDivElement>) {
    const mediaState = getCoverDesignerMediaSlotState(slotId);
    const rect = getCoverDesignerMediaCropRect(mediaState);
    const imageWidth = mediaState.width;
    const imageHeight = mediaState.height;
    if (!rect || typeof imageWidth !== "number" || typeof imageHeight !== "number") {
      return;
    }

    const container = event.currentTarget.parentElement;
    if (!container) {
      return;
    }

    const containerRectRaw = container.getBoundingClientRect();
    const containerRect = {
      left: containerRectRaw.left,
      top: containerRectRaw.top,
      width: containerRectRaw.width,
      height: containerRectRaw.height,
    };
    const point = getInlineCropPointerPosition(imageWidth, imageHeight, event.clientX, event.clientY, containerRect);
    if (!point) {
      return;
    }
    if (point.x < rect.x1 || point.x > rect.x2 || point.y < rect.y1 || point.y > rect.y2) {
      return;
    }

    const dragMode = resolveInlineCropDragMode(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
    event.currentTarget.style.cursor = getInlineCropCursor(dragMode);

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const dragState: CoverInlineCropDragState = {
      slotId,
      pointerId: event.pointerId,
      mode: dragMode,
      containerRect,
      startPointerX: point.x,
      startPointerY: point.y,
      startRect: rect,
      currentRect: rect,
    };
    coverInlineCropDragRef.current = dragState;
    setCoverInlineCropDrag(dragState);
  }

  function moveCoverInlineCropDrag(slotId: string, event: React.PointerEvent<HTMLDivElement>) {
    const dragState = coverInlineCropDragRef.current;
    if (!dragState || dragState.slotId !== slotId || dragState.pointerId !== event.pointerId) {
      updateInlineCropHoverCursor(event);
      return;
    }

    const mediaState = getCoverDesignerMediaSlotState(slotId);
    const imageWidth = mediaState.width;
    const imageHeight = mediaState.height;
    const point = typeof imageWidth === "number" && typeof imageHeight === "number" ? getInlineCropPointerPosition(imageWidth, imageHeight, event.clientX, event.clientY, dragState.containerRect) : null;
    if (typeof imageWidth !== "number" || typeof imageHeight !== "number" || !point) {
      return;
    }

    dragState.currentRect = computeCoverInlineCropDragRect(dragState, point, imageWidth, imageHeight);
    coverInlineCropDragRef.current = dragState;
    applyInlineCropOverlayStyle(coverInlineCropOverlayRef.current, dragState.currentRect, imageWidth, imageHeight);
  }

  function endCoverInlineCropDrag(slotId: string, event: React.PointerEvent<HTMLDivElement>) {
    const dragState = coverInlineCropDragRef.current;
    if (!dragState || dragState.slotId !== slotId || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    event.currentTarget.style.cursor = "move";

    const mediaState = getCoverDesignerMediaSlotState(slotId);
    const imageWidth = mediaState.width;
    const imageHeight = mediaState.height;
    const point = typeof imageWidth === "number" && typeof imageHeight === "number" ? getInlineCropPointerPosition(imageWidth, imageHeight, event.clientX, event.clientY, dragState.containerRect) : null;
    let finalizedRect = dragState.currentRect;
    if (point && typeof imageWidth === "number" && typeof imageHeight === "number") {
      finalizedRect = computeCoverInlineCropDragRect(dragState, point, imageWidth, imageHeight);
    }

    coverInlineCropDragRef.current = null;
    coverInlineCropOverlayRef.current = null;
    void setCoverDesignerMediaCropRect(slotId, finalizedRect);
    setCoverInlineCropDrag(null);
  }

  function computeDraggedElementMargins(
    dragState: PreviewMarginDragState,
    clientX: number,
    clientY: number,
  ): {
    elementMargins: Record<ElementMarginSide, number>;
    previousElementBottom: number | null;
  } {
    const deltaX = clientX - dragState.startClientX;
    const deltaY = clientY - dragState.startClientY;
    const upwardOverflow = Math.max(0, -deltaY - dragState.startMargin.top);
    const previousElementBottom = dragState.previousElement ? Math.max(0, dragState.previousElementStartBottom - upwardOverflow) : null;
    const topMargin = upwardOverflow > 0 ? 0 : normalizeDraggedMarginValue(dragState.startMargin.top + deltaY);
    const bottomMargin = upwardOverflow > 0 ? normalizeDraggedMarginValue(dragState.startMargin.bottom + dragState.startMargin.top) : normalizeDraggedMarginValue(dragState.startMargin.bottom - deltaY);

    return {
      elementMargins: {
        top: topMargin,
        right: normalizeDraggedMarginValue(dragState.startMargin.right - deltaX),
        bottom: bottomMargin,
        left: normalizeDraggedMarginValue(dragState.startMargin.left + deltaX),
      },
      previousElementBottom,
    };
  }

  function startPreviewMarginDrag(pageIndex: number, element: PreviewDraggableElement, visibleElementIndex: number, event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    const page = form.pages[pageIndex];
    if (!page || !page.elements.includes(element) || page.hiddenElements.includes(element)) {
      return;
    }

    const visibleElements = page.elements.filter((candidate): candidate is PreviewDraggableElement => getElementTypeFromKey(candidate) !== "background" && !page.hiddenElements.includes(candidate));
    const previousElement = visibleElementIndex > 0 ? visibleElements[visibleElementIndex - 1] : null;
    const previousElementStartBottom = previousElement ? page.element_margin_px[previousElement].bottom : 0;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const dragState: PreviewMarginDragState = {
      pageIndex,
      element,
      previousElement,
      previousElementStartBottom,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startMargin: {
        ...page.element_margin_px[element],
      },
    };

    previewMarginDragRef.current = dragState;
    setPreviewMarginDrag(dragState);
  }

  function movePreviewMarginDrag(pageIndex: number, element: PreviewDraggableElement, event: React.PointerEvent<HTMLDivElement>) {
    const dragState = previewMarginDragRef.current;
    if (!dragState || dragState.pageIndex !== pageIndex || dragState.element !== element || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const { elementMargins, previousElementBottom } = computeDraggedElementMargins(dragState, event.clientX, event.clientY);
    applyPreviewMarginDragMargins(pageIndex, element, elementMargins, dragState.previousElement, previousElementBottom);
  }

  function endPreviewMarginDrag(pageIndex: number, element: PreviewDraggableElement, event: React.PointerEvent<HTMLDivElement>) {
    const dragState = previewMarginDragRef.current;
    if (!dragState || dragState.pageIndex !== pageIndex || dragState.element !== element || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const { elementMargins, previousElementBottom } = computeDraggedElementMargins(dragState, event.clientX, event.clientY);
    applyPreviewMarginDragMargins(pageIndex, element, elementMargins, dragState.previousElement, previousElementBottom);

    previewMarginDragRef.current = null;
    setPreviewMarginDrag(null);
  }

  function resetFormPreservingIdentity(previous: PostForm) {
    for (const page of previous.pages) {
      revokePageMediaPreviewUrls(page);
      revokePreviewUrl(page.background_image_preview_url);
      revokePreviewUrl(page.background_cropped_preview_url);
    }

    setCoverDesignerMediaBySlotId((current) => {
      for (const mediaSlotState of Object.values(current)) {
        revokePreviewUrl(mediaSlotState.image_preview_url);
        revokePreviewUrl(mediaSlotState.cropped_preview_url);
      }
      return createInitialCoverDesignerMediaState(DEFAULT_COVER_DESIGNER_TEMPLATE_ID);
    });
    setCoverDesignerTemplateId(DEFAULT_COVER_DESIGNER_TEMPLATE_ID);
    setCoverDesignerDraft(DEFAULT_COVER_DESIGNER_DRAFT);

    setForm({
      ...initialForm,
      user_pk: previous.user_pk,
      locale: previous.locale || detectBrowserLocale(),
      show_page_content: previous.show_page_content,
      template_id: previous.template_id,
      page_scale: previous.page_scale,
    });
    setActivePageIndex(0);
  }

  function hasVisibleElementType(page: PostPageForm, elementType: PageElementType): boolean {
    return page.elements.some((elementKey) => {
      return getElementTypeFromKey(elementKey) === elementType && !page.hiddenElements.includes(elementKey);
    });
  }

  function hasMediaSource(mediaState: MediaElementForm): boolean {
    return Boolean(mediaState.image_preview_url || mediaState.cropped_preview_url || mediaState.media_url || mediaState.raw_media_url);
  }

  function hasCoverDesignerMediaSource(mediaState: CoverDesignerMediaSlotState | null | undefined): boolean {
    return Boolean(mediaState?.image_file || mediaState?.cropped_preview_url || mediaState?.image_preview_url || mediaState?.media_url || mediaState?.raw_media_url);
  }

  function hasCoverDesignerMediaCropRect(mediaState: CoverDesignerMediaSlotState): mediaState is CoverDesignerMediaSlotState & {
    width: number;
    height: number;
    crop_top_left_x: number;
    crop_top_left_y: number;
    crop_bottom_right_x: number;
    crop_bottom_right_y: number;
  } {
    return mediaState.width !== null && mediaState.height !== null && mediaState.crop_top_left_x !== null && mediaState.crop_top_left_y !== null && mediaState.crop_bottom_right_x !== null && mediaState.crop_bottom_right_y !== null;
  }

  function getCoverDesignerMediaCropRect(mediaState: CoverDesignerMediaSlotState): { x1: number; y1: number; x2: number; y2: number } | null {
    if (!hasCoverDesignerMediaCropRect(mediaState)) {
      return null;
    }

    const x1 = clamp(Math.round(Math.min(mediaState.crop_top_left_x, mediaState.crop_bottom_right_x)), 0, mediaState.width! - 1);
    const y1 = clamp(Math.round(Math.min(mediaState.crop_top_left_y, mediaState.crop_bottom_right_y)), 0, mediaState.height! - 1);
    const x2 = clamp(Math.round(Math.max(mediaState.crop_top_left_x, mediaState.crop_bottom_right_x)), x1 + 1, mediaState.width!);
    const y2 = clamp(Math.round(Math.max(mediaState.crop_top_left_y, mediaState.crop_bottom_right_y)), y1 + 1, mediaState.height!);

    return { x1, y1, x2, y2 };
  }

  function getFirstVisibleTextByStyle(page: PostPageForm, textStyle: TextElementStyle): string | null {
    for (const elementKey of page.elements) {
      if (getElementTypeFromKey(elementKey) !== "text") {
        continue;
      }
      if (page.hiddenElements.includes(elementKey)) {
        continue;
      }
      if (getTextStyleForElement(page, elementKey) !== textStyle) {
        continue;
      }
      const value = (page.text_by_element[elementKey] ?? "").trim();
      if (value.length > 0) {
        return value;
      }
    }
    return null;
  }

  function toTrimmedOrUndefined(value: string | null | undefined): string | undefined {
    if (!value) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  function toImportedCropPayload(rect: { x1: number; y1: number; x2: number; y2: number } | null): ImportedJsonCropSavePayload | undefined {
    if (!rect) {
      return undefined;
    }
    return {
      x1: Math.round(rect.x1),
      y1: Math.round(rect.y1),
      x2: Math.round(rect.x2),
      y2: Math.round(rect.y2),
    };
  }

  function extractHashtagTokensFromText(value: string): string[] {
    if (!value.trim()) {
      return [];
    }

    const tokens = value
      .split(HASHTAG_SPLIT_PATTERN)
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0 && HASHTAG_SEGMENT_PATTERN.test(segment))
      .map((segment) => (segment.startsWith("#") ? segment : `#${segment}`));
    return Array.from(new Set(tokens));
  }

  function stripHashtagsFromText(value: string): string {
    if (!value.trim()) {
      return "";
    }

    return value
      .split(HASHTAG_SPLIT_PATTERN)
      .filter((segment) => !HASHTAG_SEGMENT_PATTERN.test(segment.trim()))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getVisibleTextElementKeys(page: PostPageForm): PageElementKey[] {
    return page.elements.filter((elementKey) => {
      return getElementTypeFromKey(elementKey) === "text" && !page.hiddenElements.includes(elementKey);
    });
  }

  function buildImportedParagraphFromPage(page: PostPageForm): ImportedJsonParagraphSavePayload | null {
    const visibleMediaElementKeys = getVisibleMediaElementKeys(page);
    const primaryMediaElementKey = visibleMediaElementKeys[0] ?? getMediaElementKeys(page)[0] ?? null;
    const primaryMediaState = primaryMediaElementKey ? getMediaStateForElement(page, primaryMediaElementKey) : null;
    const primaryMediaUrl = toTrimmedOrUndefined(primaryMediaState?.raw_media_url ?? primaryMediaState?.media_url ?? null);
    const mediaCropPayload = toImportedCropPayload(primaryMediaElementKey ? getMediaCropRect(page, primaryMediaElementKey) : null);

    const h1 = getFirstVisibleTextByStyle(page, "h1");
    const h2 = getFirstVisibleTextByStyle(page, "h2");
    const h3 = getFirstVisibleTextByStyle(page, "h3");
    const h4 = getFirstVisibleTextByStyle(page, "h4");
    const caption = getFirstVisibleTextByStyle(page, "caption");
    const headingText = h1 ?? h2 ?? h3 ?? h4 ?? "";
    const headingWithoutHashtags = stripHashtagsFromText(headingText);
    const captionWithoutHashtags = stripHashtagsFromText(caption ?? "");

    const visibleTextElementKeys = getVisibleTextElementKeys(page);
    let headingColor: string | undefined;
    let contentColor: string | undefined;
    for (const elementKey of visibleTextElementKeys) {
      const textColor = toOptionalHexColor(page.text_color_by_element[elementKey]);
      if (!textColor) {
        continue;
      }
      if (!headingColor && getTextIsHeadingForElement(page, elementKey)) {
        headingColor = textColor;
      }
      if (!contentColor && !getTextIsHeadingForElement(page, elementKey)) {
        contentColor = textColor;
      }
      if (headingColor && contentColor) {
        break;
      }
    }

    const backgroundColor = toOptionalHexColor(page.background_color);
    const backgroundImage = hasVisibleElementType(page, "background")
      ? toTrimmedOrUndefined(page.background_media_url)
      : undefined;

    if (primaryMediaUrl) {
      const paragraph: ImportedJsonParagraphSavePayload = {
        type: "image",
      };
      const imageContent = toTrimmedOrUndefined(captionWithoutHashtags || headingWithoutHashtags || null);
      if (imageContent) {
        paragraph.content = imageContent;
      }
      paragraph.url = primaryMediaUrl;
      if (mediaCropPayload) {
        paragraph.crop = mediaCropPayload;
      }
      if (backgroundImage) {
        paragraph.background_image = backgroundImage;
      }
      if (backgroundColor) {
        paragraph.background_color = backgroundColor;
      }
      if (headingColor) {
        paragraph.heading_color = headingColor;
      }
      if (contentColor) {
        paragraph.content_color = contentColor;
      }
      return paragraph;
    }

    const textForHashtagDetection = [headingText, caption ?? ""].join(" ").trim();
    const normalizedHashtags = normalizeImportedHashtags(extractHashtagTokensFromText(textForHashtagDetection).join(" "));
    const hasOnlyHashtags = normalizedHashtags.length > 0 && !headingWithoutHashtags && !captionWithoutHashtags;

    if (hasOnlyHashtags) {
      const paragraph: ImportedJsonParagraphSavePayload = {
        type: "hashtags",
        content: normalizedHashtags,
      };
      if (backgroundImage) {
        paragraph.background_image = backgroundImage;
      }
      if (backgroundColor) {
        paragraph.background_color = backgroundColor;
      }
      if (headingColor) {
        paragraph.heading_color = headingColor;
      }
      if (contentColor) {
        paragraph.content_color = contentColor;
      }
      return paragraph;
    }

    const paragraphHeading = toTrimmedOrUndefined(headingWithoutHashtags);
    const paragraphContent = toTrimmedOrUndefined(captionWithoutHashtags);
    if (!paragraphHeading && !paragraphContent) {
      return null;
    }

    const paragraph: ImportedJsonParagraphSavePayload = {
      type: "p",
    };
    if (paragraphHeading) {
      paragraph.heading = paragraphHeading;
    }
    if (paragraphContent) {
      paragraph.content = paragraphContent;
    }
    if (backgroundImage) {
      paragraph.background_image = backgroundImage;
    }
    if (backgroundColor) {
      paragraph.background_color = backgroundColor;
    }
    if (headingColor) {
      paragraph.heading_color = headingColor;
    }
    if (contentColor) {
      paragraph.content_color = contentColor;
    }
    return paragraph;
  }

  function buildImportedHeadingImagePayload(mediaState: CoverDesignerMediaSlotState | null | undefined): ImportedJsonHeadingImageSavePayload | undefined {
    if (!mediaState) {
      return undefined;
    }

    const sourceUrl = toTrimmedOrUndefined(mediaState.raw_media_url ?? mediaState.media_url ?? null);
    if (!sourceUrl) {
      return undefined;
    }

    const payload: ImportedJsonHeadingImageSavePayload = {
      url: sourceUrl,
    };
    const cropPayload = toImportedCropPayload(getCoverDesignerMediaCropRect(mediaState));
    if (cropPayload) {
      payload.crop = cropPayload;
    }
    return payload;
  }

  function buildPrepareContentJsonPayload(): ImportedPostJsonSavePayload {
    const headingImagePayloads = selectedCoverMediaSlots
      .slice(0, 2)
      .map((slot) => buildImportedHeadingImagePayload(getCoverDesignerMediaSlotState(slot.id)));
    const paragraphs = form.pages
      .map((page) => buildImportedParagraphFromPage(page))
      .filter((paragraph): paragraph is ImportedJsonParagraphSavePayload => Boolean(paragraph));

    const payload: ImportedPostJsonSavePayload = {
      paragraphs,
    };

    const title = toTrimmedOrUndefined(form.title) ?? toTrimmedOrUndefined(coverDesignerDraft.title);
    const eyebrow = toTrimmedOrUndefined(coverDesignerDraft.eyebrow);
    const subtitle = toTrimmedOrUndefined(coverDesignerDraft.subtitle);
    const footerLine = toTrimmedOrUndefined(coverDesignerDraft.meta);
    const headingHashtags = normalizeImportedHashtags(coverDesignerDraft.hashtags);

    if (title) {
      payload.title = title;
    }
    if (eyebrow) {
      payload.eyeblow = eyebrow;
    }
    if (subtitle) {
      payload.subtitle = subtitle;
    }
    if (footerLine) {
      payload.footer_line = footerLine;
    }
    if (headingHashtags) {
      payload.heading_hashtags = headingHashtags;
    }
    if (headingImagePayloads[0]) {
      payload.heading_image_1 = headingImagePayloads[0];
    }
    if (headingImagePayloads[1]) {
      payload.heading_image_2 = headingImagePayloads[1];
    }

    return payload;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const userPk = parseOptionalInteger(form.user_pk);
    if (!userPk || userPk < 1) {
      setErrorMessage("`user_pk` must be a positive integer.");
      return;
    }
    if (isEditMode && (loadingEditPost || loadedEditPostId !== requestedEditPostId)) {
      setErrorMessage("Post data is still loading for edit mode.");
      return;
    }
    const activeCoverTemplateConfig = COVER_DESIGNER_TEMPLATE_CONFIG[coverDesignerTemplateId];
    const missingRequiredCoverMediaSlot = activeCoverTemplateConfig.mediaSlots.find((mediaSlot) => {
      if (!mediaSlot.required) {
        return false;
      }
      return !hasCoverDesignerMediaSource(coverDesignerMediaBySlotId[mediaSlot.id]);
    });
    if (missingRequiredCoverMediaSlot) {
      setErrorMessage(`${missingRequiredCoverMediaSlot.label} is required for the selected cover template.`);
      return;
    }

    const resolvedPostContent = buildResolvedPostContent(form.pages, form.custom_content, form.show_page_content);
    const textDisplayContent = buildTextDisplayContent(coverDesignerDraft, resolvedPostContent);
    const postCaption = textDisplayContent || null;

    setSubmitting(true);

    try {
      const previousActivePageIndex = activePageIndex;
      const uploadedPreviewPages: Array<{
        sourcePageIndex: number;
        media_url: string;
        raw_media_url: string;
        original_raw_media_url: string | null;
        background_media_url: string | null;
        media_type: string;
        width: number;
        height: number;
      }> = [];

      try {
        for (let index = 0; index < form.pages.length; index += 1) {
          setUploadingPageIndex(index);
          setActivePageIndex(index);
          await waitForPreviewRender();

          const page = pagesRef.current[index] ?? form.pages[index];
          const visibleMediaElementKeys = getVisibleMediaElementKeys(page);
          const missingMediaElementKey = visibleMediaElementKeys.find((mediaElementKey) => {
            const mediaState = getMediaStateForElement(page, mediaElementKey);
            return !mediaState.image_file && !hasMediaSource(mediaState);
          });
          if (missingMediaElementKey) {
            const missingElementIndex = page.elements.indexOf(missingMediaElementKey);
            const missingLabel = missingElementIndex >= 0 ? getElementLabelForDisplay(page.elements, missingElementIndex) : PAGE_ELEMENT_LABEL.media;
            throw new Error(`${missingLabel} image is missing.`);
          }
          const primaryMediaElementKey = visibleMediaElementKeys[0] ?? getMediaElementKeys(page)[0] ?? null;
          const primaryMediaState = primaryMediaElementKey ? getMediaStateForElement(page, primaryMediaElementKey) : null;

          const previewNode = previewCaptureRef.current;
          if (!previewNode) {
            throw new Error("Preview is not ready yet.");
          }

          const previewBlob = await renderPreviewNodeToBlob(previewNode, selectedTemplate.pageBackgroundColor || "#ffffff");
          const previewFile = new File([previewBlob], `post-page-${index + 1}.png`, { type: "image/png" });
          const dimensions = await getImageDimensions(previewFile);
          const previewSlice = {
            file: previewFile,
            width: dimensions.width,
            height: dimensions.height,
          };

          const originalUploadPromise = primaryMediaState?.image_file ? resizeOriginalImageForUpload(primaryMediaState.image_file).then((resizedFile) => uploadPageImage(resizedFile)) : Promise.resolve(null);
          const shouldUploadBackground = hasVisibleElementType(page, "background");
          const backgroundUploadPromise = shouldUploadBackground
            ? (async () => {
                if (page.background_cropped_preview_url) {
                  const croppedBackgroundFile = await objectUrlToFile(page.background_cropped_preview_url, `post-page-${index + 1}-background-cropped.png`, "image/png");
                  return await uploadPageImage(croppedBackgroundFile);
                }

                if (page.background_image_file) {
                  return await uploadPageImage(page.background_image_file);
                }

                return null;
              })()
            : Promise.resolve(null);
          const [previewUploadResult, originalUploadResult, backgroundUploadResult] = await Promise.all([uploadPageImage(previewSlice.file), originalUploadPromise, backgroundUploadPromise]);

          uploadedPreviewPages.push({
            sourcePageIndex: index,
            media_url: previewUploadResult.media_url,
            raw_media_url: previewUploadResult.raw_media_url,
            original_raw_media_url: originalUploadResult?.raw_media_url ?? primaryMediaState?.raw_media_url ?? null,
            background_media_url: backgroundUploadResult?.raw_media_url ?? page.background_media_url ?? null,
            media_type: previewUploadResult.media_type,
            width: previewSlice.width,
            height: previewSlice.height,
          });
        }
      } finally {
        setActivePageIndex(previousActivePageIndex);
        setUploadingPageIndex(null);
      }

      const pagesPayload: Array<{
        media_url: string;
        media_type: string;
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
        raw_media_url: string | null;
        bg_media_url: string | null;
      }> = [];

      await waitForPreviewRender();
      const coverPreviewNode = coverPreviewCaptureRef.current;
      if (!coverPreviewNode) {
        throw new Error("Cover preview is not ready yet.");
      }
      const coverPreviewBlob = await renderPreviewNodeToBlob(coverPreviewNode, selectedTemplate.pageBackgroundColor || "#ffffff");
      const coverPreviewFile = new File([coverPreviewBlob], "post-cover-page.png", { type: "image/png" });
      const coverPreviewDimensions = await getImageDimensions(coverPreviewFile);
      const coverPreviewUploadResult = await uploadPageImage(coverPreviewFile);
      const coverDraftPayload = {
        eyebrow: coverDesignerDraft.eyebrow.trim(),
        title: coverDesignerDraft.title.trim(),
        subtitle: coverDesignerDraft.subtitle.trim(),
        meta: coverDesignerDraft.meta.trim(),
        hashtags: coverDesignerDraft.hashtags.trim(),
      };
      const coverCaptionLine = [coverDraftPayload.meta, coverDraftPayload.hashtags]
        .filter((value) => value.length > 0)
        .join(" · ");
      const coverLayoutJson = JSON.stringify({
        type: "cover",
        cover_template_id: coverDesignerTemplateId,
        page_scale: form.page_scale,
        cover_draft: coverDraftPayload,
        cover_media_slots: selectedCoverMediaSlots.map((slot) => {
          const mediaState = getCoverDesignerMediaSlotState(slot.id);
          return {
            slot_id: slot.id,
            media_url: mediaState.media_url,
            raw_media_url: mediaState.raw_media_url,
            width: mediaState.width,
            height: mediaState.height,
            crop_top_left_x: mediaState.crop_top_left_x,
            crop_top_left_y: mediaState.crop_top_left_y,
            crop_bottom_right_x: mediaState.crop_bottom_right_x,
            crop_bottom_right_y: mediaState.crop_bottom_right_y,
          };
        }),
      });

      pagesPayload.push({
        media_url: coverPreviewUploadResult.raw_media_url,
        media_type: coverPreviewUploadResult.media_type || "image",
        width: coverPreviewDimensions.width,
        height: coverPreviewDimensions.height,
        media_crop_top_left_x: null,
        media_crop_top_left_y: null,
        media_crop_bottom_right_x: null,
        media_crop_bottom_right_y: null,
        alt_text: null,
        title: form.title.trim() || null,
        h1: coverDraftPayload.title || null,
        h2: coverDraftPayload.subtitle || null,
        h3: null,
        h4: coverDraftPayload.eyebrow || null,
        caption: coverCaptionLine || null,
        layout_json: coverLayoutJson,
        raw_media_url: coverPreviewUploadResult.raw_media_url,
        bg_media_url: null,
      });

      for (const uploadedPreview of uploadedPreviewPages) {
        const page = form.pages[uploadedPreview.sourcePageIndex];
        if (!page) {
          throw new Error("Preview upload failed.");
        }
        const visibleMediaElementKeys = getVisibleMediaElementKeys(page);
        const primaryMediaElementKey = visibleMediaElementKeys[0] ?? getMediaElementKeys(page)[0] ?? null;
        const primaryMediaState = primaryMediaElementKey ? getMediaStateForElement(page, primaryMediaElementKey) : null;

        pagesPayload.push({
          media_url: uploadedPreview.raw_media_url,
          media_type: uploadedPreview.media_type,
          width: uploadedPreview.width,
          height: uploadedPreview.height,
          media_crop_top_left_x: primaryMediaState?.media_crop_top_left_x ?? null,
          media_crop_top_left_y: primaryMediaState?.media_crop_top_left_y ?? null,
          media_crop_bottom_right_x: primaryMediaState?.media_crop_bottom_right_x ?? null,
          media_crop_bottom_right_y: primaryMediaState?.media_crop_bottom_right_y ?? null,
          alt_text: null,
          title: null,
          h1: getFirstVisibleTextByStyle(page, "h1"),
          h2: getFirstVisibleTextByStyle(page, "h2"),
          h3: getFirstVisibleTextByStyle(page, "h3"),
          h4: getFirstVisibleTextByStyle(page, "h4"),
          caption: getFirstVisibleTextByStyle(page, "caption"),
          layout_json:
            page.elements.length > 0
              ? JSON.stringify({
                  order: page.elements.map((elementKey) => getElementTypeFromKey(elementKey)),
                  hidden: page.hiddenElements.map((elementKey) => getElementTypeFromKey(elementKey)),
                  media_fit_mode: primaryMediaState?.media_fit_mode ?? "width",
                  media_crop_top_left_x: primaryMediaState?.media_crop_top_left_x ?? null,
                  media_crop_top_left_y: primaryMediaState?.media_crop_top_left_y ?? null,
                  media_crop_bottom_right_x: primaryMediaState?.media_crop_bottom_right_x ?? null,
                  media_crop_bottom_right_y: primaryMediaState?.media_crop_bottom_right_y ?? null,
                  background_fit_mode: page.background_fit_mode,
                  background_effect_preset: page.background_effect_preset,
                  background_color: page.background_color,
                  background_gradient_color: page.background_gradient_color,
                  background_crop_top_left_x: page.background_crop_top_left_x,
                  background_crop_top_left_y: page.background_crop_top_left_y,
                  background_crop_bottom_right_x: page.background_crop_bottom_right_x,
                  background_crop_bottom_right_y: page.background_crop_bottom_right_y,
                  container_padding_px: page.container_padding_px,
                  page_scale: form.page_scale,
                  elements_v2: page.elements.map((elementKey) => {
                    const elementType = getElementTypeFromKey(elementKey);
                    const mediaState = elementType === "media" ? getMediaStateForElement(page, elementKey) : null;
                    const textStyle = elementType === "text" ? getTextStyleForElement(page, elementKey) : null;
                    const defaultTemplateTextColor = textStyle !== null ? normalizeHexColorToSix(selectedTemplate.elements[textStyle].color) : null;
                    const defaultTemplateTextBackground = textStyle !== null ? getTemplateTextBackgroundDefaults(selectedTemplate.elements[textStyle]) : null;
                    return {
                      key: elementKey,
                      type: elementType,
                      hidden: page.hiddenElements.includes(elementKey),
                      text: page.text_by_element[elementKey] ?? "",
                      text_style: textStyle,
                      is_heading: textStyle !== null ? getTextIsHeadingForElement(page, elementKey) : null,
                      text_color: textStyle !== null ? (toOptionalHexColor(page.text_color_by_element[elementKey]) ?? defaultTemplateTextColor) : null,
                      text_background_color: elementType === "text" ? toOptionalHexColor(page.text_background_color_by_element[elementKey]) : null,
                      text_background_translucency: textStyle !== null ? getTextBackgroundTranslucencyPercent(page, elementKey, defaultTemplateTextBackground?.translucencyPercent ?? 0) : null,
                      text_background_mode: getTextBackgroundMode(page, elementKey),
                      text_alignment: page.text_alignments[elementKey] ?? "left",
                      text_effect: page.text_effects[elementKey] ?? "none",
                      corner_radius_px: page.element_corner_radius_px[elementKey] ?? null,
                      padding_px: page.element_padding_px[elementKey] ?? DEFAULT_ELEMENT_PADDING_PX,
                      margin_px: page.element_margin_px[elementKey] ?? {
                        ...DEFAULT_ELEMENT_MARGIN_PX,
                      },
                      media_fit_mode: mediaState?.media_fit_mode ?? null,
                      media_url: mediaState?.media_url ?? null,
                      raw_media_url: mediaState?.raw_media_url ?? null,
                      width: mediaState?.width ?? null,
                      height: mediaState?.height ?? null,
                      media_crop_top_left_x: mediaState?.media_crop_top_left_x ?? null,
                      media_crop_top_left_y: mediaState?.media_crop_top_left_y ?? null,
                      media_crop_bottom_right_x: mediaState?.media_crop_bottom_right_x ?? null,
                      media_crop_bottom_right_y: mediaState?.media_crop_bottom_right_y ?? null,
                    };
                  }),
                  template_id: form.template_id,
                })
              : null,
          raw_media_url: uploadedPreview.original_raw_media_url ?? primaryMediaState?.raw_media_url ?? null,
          bg_media_url: uploadedPreview.background_media_url ?? page.background_media_url,
        });
      }

      const prepareContentPayload = buildPrepareContentJsonPayload();

      const requestBody: Record<string, unknown> = {
        user_pk: userPk,
        locale: form.locale || detectBrowserLocale(),
        caption: postCaption,
        show_page_content: form.show_page_content ? 1 : 0,
        custom_content: form.custom_content.trim() || null,
        title: form.title.trim() || null,
        template_id: form.template_id,
        page_scale: form.page_scale,
        visibility: form.visibility,
        prepare_content: prepareContentPayload,
        pages: pagesPayload,
      };
      const requestUrl = isEditMode ? "/api/posts" : `/api/posts/create?userPk=${encodeURIComponent(String(userPk))}`;
      if (isEditMode && requestedEditPostId) {
        requestBody.post_id = requestedEditPostId;
      }

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = (await response.json()) as {
        error?: string;
        message?: string;
        post_id?: number;
        post_slug?: string;
        postId?: number;
        postSlug?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? data.message ?? (isEditMode ? "Failed to update post." : "Failed to create post."));
      }

      const savedPostId = data.post_id ?? data.postId;
      const savedPostSlug = data.post_slug ?? data.postSlug;

      if (isEditMode) {
        setSuccessMessage(`Post updated successfully (post_id: ${savedPostId ?? requestedEditPostId ?? "n/a"}).`);
      } else {
        setSuccessMessage(`Post created successfully (post_id: ${savedPostId ?? "n/a"}, post_slug: ${savedPostSlug ?? "n/a"}).`);
        resetFormPreservingIdentity(form);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : isEditMode ? "Failed to update post." : "Failed to create post.");
    } finally {
      setSubmitting(false);
      setUploadingPageIndex(null);
    }
  }

  const selectedTemplate = getPostTemplate(form.template_id);
  const selectedTemplateTextBackground = selectedTemplate.textBackground;
  const selectedPageScaleDimensions = PAGE_SCALE_DIMENSIONS[form.page_scale];
  const selectedCoverTemplateConfig = COVER_DESIGNER_TEMPLATE_CONFIG[coverDesignerTemplateId];
  const selectedCoverMediaSlots = selectedCoverTemplateConfig.mediaSlots;
  const isDefaultCoverTemplate = coverDesignerTemplateId === "default";
  const isDualNewsCoverTemplate = coverDesignerTemplateId === "dual_news";
  const isWarningAlertCoverTemplate = coverDesignerTemplateId === "warning_alert";
  const isRoyalBoldCoverTemplate = coverDesignerTemplateId === "royal_bold";
  const isCryptoBulletinCoverTemplate = coverDesignerTemplateId === "crypto_bulletin";
  const hasMissingRequiredCoverMedia = selectedCoverMediaSlots.some((mediaSlot) => mediaSlot.required && !hasCoverDesignerMediaSource(getCoverDesignerMediaSlotState(mediaSlot.id)));
  const primaryCoverMediaSlotId = selectedCoverMediaSlots[0]?.id ?? null;
  const primaryCoverMediaState = primaryCoverMediaSlotId ? getCoverDesignerMediaSlotState(primaryCoverMediaSlotId) : null;
  const secondaryCoverMediaSlotId = selectedCoverMediaSlots[1]?.id ?? null;
  const secondaryCoverMediaState = secondaryCoverMediaSlotId ? getCoverDesignerMediaSlotState(secondaryCoverMediaSlotId) : null;
  const coverPreviewPrimaryImageSrc = primaryCoverMediaState?.cropped_preview_url ?? primaryCoverMediaState?.image_preview_url ?? primaryCoverMediaState?.raw_media_url ?? primaryCoverMediaState?.media_url ?? null;
  const coverPreviewSecondaryImageSrc = secondaryCoverMediaState?.cropped_preview_url ?? secondaryCoverMediaState?.image_preview_url ?? secondaryCoverMediaState?.raw_media_url ?? secondaryCoverMediaState?.media_url ?? null;
  const coverPreviewMeta = coverDesignerDraft.meta.trim() || "@your_handle  |  swipe for details";
  const coverPreviewHashtagsRaw = coverDesignerDraft.hashtags.trim() || "#tag_one  #tag_two  #tag_three";
  const coverPreviewHashtagTokens = coverPreviewHashtagsRaw
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => (token.startsWith("#") ? token : `#${token}`))
    .slice(0, 6);
  const coverPreviewHashtagsLine = coverPreviewHashtagTokens.length > 0 ? coverPreviewHashtagTokens.join("  ") : "#tag_one  #tag_two  #tag_three";
  const coverPreviewTitleSingleLine = (coverDesignerDraft.title.trim() || "BIG HEADLINE").replace(/\s+/g, " ");
  const coverPreviewSubtitleSingleLine = (coverDesignerDraft.subtitle.trim() || "SECOND LINE").replace(/\s+/g, " ");
  const royalBoldSubtitleTokens = coverPreviewSubtitleSingleLine.split(/\s+/).filter(Boolean);
  const royalBoldSubtitleAccentStart = Math.max(0, royalBoldSubtitleTokens.length - 2);
  const royalBoldSubtitleLead = royalBoldSubtitleTokens.slice(0, royalBoldSubtitleAccentStart).join(" ");
  const royalBoldSubtitleAccent = royalBoldSubtitleTokens.slice(royalBoldSubtitleAccentStart).join(" ");
  const royalBoldHashtagDisplayLine = coverPreviewHashtagTokens
    .slice(0, 4)
    .map((token) => token.toUpperCase())
    .join(" ");
  const cryptoBulletinChipSourceText = (coverDesignerDraft.eyebrow.trim() || "加密貨幣價格").replace(/\s+/g, " ");
  const cryptoBulletinChipDisplayTokens = Array.from(cryptoBulletinChipSourceText.length > 0 ? cryptoBulletinChipSourceText : "加密貨幣價格");
  const CRYPTO_BULLETIN_CHIP_MAX_CHARACTERS = 32;
  let cryptoBulletinChipCharacterCountAccumulator = 0;
  const cryptoBulletinChipTokensLimited = cryptoBulletinChipDisplayTokens.filter((token, tokenIndex) => {
    if (token === " ") {
      const hasLeadingCharacter = cryptoBulletinChipDisplayTokens.slice(0, tokenIndex).some((candidateToken) => candidateToken !== " ");
      const hasTrailingCharacter = cryptoBulletinChipDisplayTokens.slice(tokenIndex + 1).some((candidateToken) => candidateToken !== " ");
      return hasLeadingCharacter && hasTrailingCharacter && cryptoBulletinChipCharacterCountAccumulator > 0 && cryptoBulletinChipCharacterCountAccumulator < CRYPTO_BULLETIN_CHIP_MAX_CHARACTERS;
    }

    if (cryptoBulletinChipCharacterCountAccumulator >= CRYPTO_BULLETIN_CHIP_MAX_CHARACTERS) {
      return false;
    }

    cryptoBulletinChipCharacterCountAccumulator += 1;
    return true;
  });
  while (cryptoBulletinChipTokensLimited[cryptoBulletinChipTokensLimited.length - 1] === " ") {
    cryptoBulletinChipTokensLimited.pop();
  }
  while (cryptoBulletinChipTokensLimited[0] === " ") {
    cryptoBulletinChipTokensLimited.shift();
  }
  const cryptoBulletinChipCharacterCount = cryptoBulletinChipTokensLimited.filter((token) => token !== " ").length;
  const cryptoBulletinChipFirstRowTargetCount = Math.ceil(cryptoBulletinChipCharacterCount / 2);
  const cryptoBulletinChipRows = (() => {
    const rows: string[][] = [[], []];
    let rowIndex = 0;
    let firstRowCharacterCount = 0;

    for (const token of cryptoBulletinChipTokensLimited) {
      if (rowIndex === 0 && token !== " " && firstRowCharacterCount >= cryptoBulletinChipFirstRowTargetCount) {
        rowIndex = 1;
      }

      const activeRow = rows[rowIndex];
      if (token === " " && activeRow.length === 0) {
        continue;
      }

      activeRow.push(token);
      if (rowIndex === 0 && token !== " ") {
        firstRowCharacterCount += 1;
      }
    }

    for (const chipRow of rows) {
      while (chipRow[chipRow.length - 1] === " ") {
        chipRow.pop();
      }
    }

    return rows[1].length > 0 ? rows : [rows[0]];
  })();
  const cryptoBulletinChipMaxRowCharacterCount = Math.max(1, ...cryptoBulletinChipRows.map((rowTokens) => rowTokens.filter((token) => token !== " ").length));
  const cryptoBulletinChipHasTwoRows = cryptoBulletinChipRows.length > 1;
  const cryptoBulletinChipSizePx = clamp(Math.round(34 - Math.max(0, cryptoBulletinChipMaxRowCharacterCount - 4) * 1.9 - (cryptoBulletinChipHasTwoRows ? 1 : 0)), 12, 32);
  const cryptoBulletinChipFontSizePx = clamp(Math.round(cryptoBulletinChipSizePx * 0.53), 8, 16);
  const cryptoBulletinChipGapPx = clamp(Math.round(cryptoBulletinChipSizePx * 0.13), 1, 4);
  const cryptoBulletinChipSpaceWidthPx = clamp(Math.round(cryptoBulletinChipSizePx * 0.34), 3, 8);
  const cryptoBulletinChipContainerRadiusPx = clamp(Math.round(cryptoBulletinChipSizePx * 0.82), 18, 28);
  const cryptoBulletinChipContainerPaddingXPx = clamp(Math.round(cryptoBulletinChipSizePx * 0.2), 1, 4);
  const cryptoBulletinChipContainerPaddingYPx = clamp(Math.round(cryptoBulletinChipSizePx * 0.13), 1, 3);
  const cryptoBulletinTitleSingleLine = (coverDesignerDraft.title.trim() || "週末暴跌").replace(/\s+/g, " ");
  const cryptoBulletinSubtitleSingleLine = (coverDesignerDraft.subtitle.trim() || "比特幣爆倉").replace(/\s+/g, " ");
  const cryptoBulletinMetaSingleLine = (coverDesignerDraft.meta.trim() || "近200億").replace(/\s+/g, " ");
  const cryptoBulletinSubtitleWords = cryptoBulletinSubtitleSingleLine.split(/\s+/).filter(Boolean);
  const cryptoBulletinSubtitleLead = cryptoBulletinSubtitleWords.length > 1 ? cryptoBulletinSubtitleWords.slice(0, -1).join(" ") : cryptoBulletinSubtitleSingleLine.slice(0, Math.max(0, cryptoBulletinSubtitleSingleLine.length - 2));
  const cryptoBulletinSubtitleAccent = cryptoBulletinSubtitleWords.length > 1 ? (cryptoBulletinSubtitleWords[cryptoBulletinSubtitleWords.length - 1] ?? cryptoBulletinSubtitleSingleLine) : cryptoBulletinSubtitleSingleLine.slice(Math.max(0, cryptoBulletinSubtitleSingleLine.length - 2)) || cryptoBulletinSubtitleSingleLine;
  const coverEyebrowStyle = selectedTemplate.elements.h4;
  const coverTitleStyle = selectedTemplate.elements.h1;
  const coverSubtitleStyle = selectedTemplate.elements.caption;
  const dualNewsTitlePreferredFontPx = Math.max(34, Math.round(coverTitleStyle.fontSizePx * 1.95));
  const dualNewsSubtitlePreferredFontPx = Math.max(30, Math.round(coverTitleStyle.fontSizePx * 1.72));
  const dualNewsTitleRenderFontPx = dualNewsTitleFittedFontPx ?? dualNewsTitlePreferredFontPx;
  const dualNewsSubtitleRenderFontPx = dualNewsSubtitleFittedFontPx ?? dualNewsSubtitlePreferredFontPx;
  const warningAlertEyebrowPreferredFontPx = Math.max(11, Math.round(coverEyebrowStyle.fontSizePx * 0.7));
  const warningAlertTitlePreferredFontPx = Math.max(22, Math.round(coverTitleStyle.fontSizePx * 0.9));
  const warningAlertSubtitlePreferredFontPx = Math.max(16, Math.round(coverSubtitleStyle.fontSizePx * 1.02));
  const warningAlertMetaPreferredFontPx = 11;
  const warningAlertHashtagsPreferredFontPx = 12;
  const warningAlertEyebrowRenderFontPx = warningAlertEyebrowFittedFontPx ?? warningAlertEyebrowPreferredFontPx;
  const warningAlertTitleRenderFontPx = warningAlertTitleFittedFontPx ?? warningAlertTitlePreferredFontPx;
  const warningAlertSubtitleRenderFontPx = warningAlertSubtitleFittedFontPx ?? warningAlertSubtitlePreferredFontPx;
  const warningAlertMetaRenderFontPx = warningAlertMetaFittedFontPx ?? warningAlertMetaPreferredFontPx;
  const warningAlertHashtagsRenderFontPx = warningAlertHashtagsFittedFontPx ?? warningAlertHashtagsPreferredFontPx;
  const royalBoldEyebrowPreferredFontPx = Math.max(10, Math.round(coverEyebrowStyle.fontSizePx * 0.66));
  const royalBoldTitlePreferredFontPx = Math.max(34, Math.round(coverTitleStyle.fontSizePx * 1.52));
  const royalBoldSubtitlePreferredFontPx = Math.max(30, Math.round(coverTitleStyle.fontSizePx * 1.34));
  const royalBoldHashtagsPreferredFontPx = Math.max(12, Math.round(coverEyebrowStyle.fontSizePx * 0.9));
  const royalBoldEyebrowRenderFontPx = royalBoldEyebrowFittedFontPx ?? royalBoldEyebrowPreferredFontPx;
  const royalBoldTitleRenderFontPx = royalBoldTitleFittedFontPx ?? royalBoldTitlePreferredFontPx;
  const royalBoldSubtitleRenderFontPx = royalBoldSubtitleFittedFontPx ?? royalBoldSubtitlePreferredFontPx;
  const royalBoldHashtagsRenderFontPx = royalBoldHashtagsFittedFontPx ?? royalBoldHashtagsPreferredFontPx;
  const cryptoBulletinTitlePreferredFontPx = Math.max(48, Math.round(coverTitleStyle.fontSizePx * 1.92));
  const cryptoBulletinSubtitlePreferredFontPx = Math.max(42, Math.round(coverTitleStyle.fontSizePx * 1.58));
  const cryptoBulletinMetaPreferredFontPx = Math.max(44, Math.round(coverTitleStyle.fontSizePx * 1.42));
  const cryptoBulletinTitleRenderFontPx = cryptoBulletinTitleFittedFontPx ?? cryptoBulletinTitlePreferredFontPx;
  const cryptoBulletinSubtitleRenderFontPx = cryptoBulletinSubtitleFittedFontPx ?? cryptoBulletinSubtitlePreferredFontPx;
  const cryptoBulletinMetaRenderFontPx = cryptoBulletinMetaFittedFontPx ?? cryptoBulletinMetaPreferredFontPx;
  const resolvedPostContent = buildResolvedPostContent(form.pages, form.custom_content, form.show_page_content);
  const textDisplayContent = buildTextDisplayContent(coverDesignerDraft, resolvedPostContent);
  const hasTextDisplayContent = textDisplayContent.length > 0;
  const totalPages = form.pages.length;
  const normalizedActivePageIndex = Math.min(activePageIndex, Math.max(0, totalPages - 1));
  const currentPageNumber = normalizedActivePageIndex + 1;

  useEffect(() => {
    if (!isDualNewsCoverTemplate) {
      setDualNewsTitleFittedFontPx((current) => (current === null ? current : null));
      setDualNewsSubtitleFittedFontPx((current) => (current === null ? current : null));
      return;
    }

    let frameId = 0;
    const runMeasurement = () => {
      const titleNode = dualNewsTitlePreviewRef.current;
      const subtitleNode = dualNewsSubtitlePreviewRef.current;

      if (titleNode) {
        const nextTitleFont = getAutoFittedSingleLineFontSizePx(titleNode, dualNewsTitlePreferredFontPx, Math.max(9, Math.round(dualNewsTitlePreferredFontPx * 0.16)));
        setDualNewsTitleFittedFontPx((current) => (current !== null && Math.abs(current - nextTitleFont) < 0.1 ? current : nextTitleFont));
      }

      if (subtitleNode) {
        const nextSubtitleFont = getAutoFittedSingleLineFontSizePx(subtitleNode, dualNewsSubtitlePreferredFontPx, Math.max(9, Math.round(dualNewsSubtitlePreferredFontPx * 0.16)));
        setDualNewsSubtitleFittedFontPx((current) => (current !== null && Math.abs(current - nextSubtitleFont) < 0.1 ? current : nextSubtitleFont));
      }
    };

    const scheduleMeasurement = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(runMeasurement);
    };

    scheduleMeasurement();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        scheduleMeasurement();
      });
      if (dualNewsTitlePreviewRef.current) {
        resizeObserver.observe(dualNewsTitlePreviewRef.current);
      }
      if (dualNewsSubtitlePreviewRef.current) {
        resizeObserver.observe(dualNewsSubtitlePreviewRef.current);
      }
    }

    window.addEventListener("resize", scheduleMeasurement);

    return () => {
      window.removeEventListener("resize", scheduleMeasurement);
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isDualNewsCoverTemplate, coverPreviewTitleSingleLine, coverPreviewSubtitleSingleLine, dualNewsTitlePreferredFontPx, dualNewsSubtitlePreferredFontPx]);

  useEffect(() => {
    if (!isWarningAlertCoverTemplate) {
      setWarningAlertEyebrowFittedFontPx((current) => (current === null ? current : null));
      setWarningAlertTitleFittedFontPx((current) => (current === null ? current : null));
      setWarningAlertSubtitleFittedFontPx((current) => (current === null ? current : null));
      setWarningAlertMetaFittedFontPx((current) => (current === null ? current : null));
      setWarningAlertHashtagsFittedFontPx((current) => (current === null ? current : null));
      return;
    }

    let frameId = 0;
    const runMeasurement = () => {
      const eyebrowNode = warningAlertEyebrowPreviewRef.current;
      const titleNode = warningAlertTitlePreviewRef.current;
      const subtitleNode = warningAlertSubtitlePreviewRef.current;
      const metaNode = warningAlertMetaPreviewRef.current;
      const hashtagsNode = warningAlertHashtagsPreviewRef.current;

      if (eyebrowNode) {
        const nextEyebrowFont = getAutoFittedSingleLineFontSizePx(eyebrowNode, warningAlertEyebrowPreferredFontPx, Math.max(8, Math.round(warningAlertEyebrowPreferredFontPx * 0.62)));
        setWarningAlertEyebrowFittedFontPx((current) => (current !== null && Math.abs(current - nextEyebrowFont) < 0.1 ? current : nextEyebrowFont));
      }

      if (titleNode) {
        const nextTitleFont = getAutoFittedSingleLineFontSizePx(titleNode, warningAlertTitlePreferredFontPx, Math.max(10, Math.round(warningAlertTitlePreferredFontPx * 0.3)));
        setWarningAlertTitleFittedFontPx((current) => (current !== null && Math.abs(current - nextTitleFont) < 0.1 ? current : nextTitleFont));
      }

      if (subtitleNode) {
        const nextSubtitleFont = getAutoFittedSingleLineFontSizePx(subtitleNode, warningAlertSubtitlePreferredFontPx, Math.max(9, Math.round(warningAlertSubtitlePreferredFontPx * 0.5)));
        setWarningAlertSubtitleFittedFontPx((current) => (current !== null && Math.abs(current - nextSubtitleFont) < 0.1 ? current : nextSubtitleFont));
      }

      if (metaNode) {
        const nextMetaFont = getAutoFittedSingleLineFontSizePx(metaNode, warningAlertMetaPreferredFontPx, 8);
        setWarningAlertMetaFittedFontPx((current) => (current !== null && Math.abs(current - nextMetaFont) < 0.1 ? current : nextMetaFont));
      }

      if (hashtagsNode) {
        const nextHashtagsFont = getAutoFittedSingleLineFontSizePx(hashtagsNode, warningAlertHashtagsPreferredFontPx, 8);
        setWarningAlertHashtagsFittedFontPx((current) => (current !== null && Math.abs(current - nextHashtagsFont) < 0.1 ? current : nextHashtagsFont));
      }
    };

    const scheduleMeasurement = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(runMeasurement);
    };

    scheduleMeasurement();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        scheduleMeasurement();
      });
      if (warningAlertEyebrowPreviewRef.current) {
        resizeObserver.observe(warningAlertEyebrowPreviewRef.current);
      }
      if (warningAlertTitlePreviewRef.current) {
        resizeObserver.observe(warningAlertTitlePreviewRef.current);
      }
      if (warningAlertSubtitlePreviewRef.current) {
        resizeObserver.observe(warningAlertSubtitlePreviewRef.current);
      }
      if (warningAlertMetaPreviewRef.current) {
        resizeObserver.observe(warningAlertMetaPreviewRef.current);
      }
      if (warningAlertHashtagsPreviewRef.current) {
        resizeObserver.observe(warningAlertHashtagsPreviewRef.current);
      }
    }

    window.addEventListener("resize", scheduleMeasurement);

    return () => {
      window.removeEventListener("resize", scheduleMeasurement);
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isWarningAlertCoverTemplate, coverDesignerDraft.eyebrow, coverPreviewTitleSingleLine, coverPreviewSubtitleSingleLine, coverPreviewMeta, coverPreviewHashtagsLine, warningAlertEyebrowPreferredFontPx, warningAlertTitlePreferredFontPx, warningAlertSubtitlePreferredFontPx, warningAlertMetaPreferredFontPx, warningAlertHashtagsPreferredFontPx]);

  useEffect(() => {
    if (!isRoyalBoldCoverTemplate) {
      setRoyalBoldEyebrowFittedFontPx((current) => (current === null ? current : null));
      setRoyalBoldTitleFittedFontPx((current) => (current === null ? current : null));
      setRoyalBoldSubtitleFittedFontPx((current) => (current === null ? current : null));
      setRoyalBoldHashtagsFittedFontPx((current) => (current === null ? current : null));
      return;
    }

    let frameId = 0;
    const runMeasurement = () => {
      const eyebrowNode = royalBoldEyebrowPreviewRef.current;
      const titleNode = royalBoldTitlePreviewRef.current;
      const subtitleNode = royalBoldSubtitlePreviewRef.current;
      const hashtagsNode = royalBoldHashtagsPreviewRef.current;

      if (eyebrowNode) {
        const nextEyebrowFont = getAutoFittedSingleLineFontSizePx(eyebrowNode, royalBoldEyebrowPreferredFontPx, Math.max(8, Math.round(royalBoldEyebrowPreferredFontPx * 0.62)));
        setRoyalBoldEyebrowFittedFontPx((current) => (current !== null && Math.abs(current - nextEyebrowFont) < 0.1 ? current : nextEyebrowFont));
      }

      if (titleNode) {
        const nextTitleFont = getAutoFittedSingleLineFontSizePx(titleNode, royalBoldTitlePreferredFontPx, Math.max(10, Math.round(royalBoldTitlePreferredFontPx * 0.3)));
        setRoyalBoldTitleFittedFontPx((current) => (current !== null && Math.abs(current - nextTitleFont) < 0.1 ? current : nextTitleFont));
      }

      if (subtitleNode) {
        const nextSubtitleFont = getAutoFittedSingleLineFontSizePx(subtitleNode, royalBoldSubtitlePreferredFontPx, Math.max(10, Math.round(royalBoldSubtitlePreferredFontPx * 0.3)));
        setRoyalBoldSubtitleFittedFontPx((current) => (current !== null && Math.abs(current - nextSubtitleFont) < 0.1 ? current : nextSubtitleFont));
      }

      if (hashtagsNode) {
        const nextHashtagsFont = getAutoFittedSingleLineFontSizePx(hashtagsNode, royalBoldHashtagsPreferredFontPx, Math.max(10, Math.round(royalBoldHashtagsPreferredFontPx * 0.3)));
        setRoyalBoldHashtagsFittedFontPx((current) => (current !== null && Math.abs(current - nextHashtagsFont) < 0.1 ? current : nextHashtagsFont));
      }
    };

    const scheduleMeasurement = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(runMeasurement);
    };

    scheduleMeasurement();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        scheduleMeasurement();
      });
      if (royalBoldEyebrowPreviewRef.current) {
        resizeObserver.observe(royalBoldEyebrowPreviewRef.current);
      }
      if (royalBoldTitlePreviewRef.current) {
        resizeObserver.observe(royalBoldTitlePreviewRef.current);
      }
      if (royalBoldSubtitlePreviewRef.current) {
        resizeObserver.observe(royalBoldSubtitlePreviewRef.current);
      }
      if (royalBoldHashtagsPreviewRef.current) {
        resizeObserver.observe(royalBoldHashtagsPreviewRef.current);
      }
    }

    window.addEventListener("resize", scheduleMeasurement);

    return () => {
      window.removeEventListener("resize", scheduleMeasurement);
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isRoyalBoldCoverTemplate, coverDesignerDraft.eyebrow, coverPreviewTitleSingleLine, coverPreviewSubtitleSingleLine, royalBoldHashtagDisplayLine, royalBoldEyebrowPreferredFontPx, royalBoldTitlePreferredFontPx, royalBoldSubtitlePreferredFontPx, royalBoldHashtagsPreferredFontPx]);

  useEffect(() => {
    if (!isCryptoBulletinCoverTemplate) {
      setCryptoBulletinTitleFittedFontPx((current) => (current === null ? current : null));
      setCryptoBulletinSubtitleFittedFontPx((current) => (current === null ? current : null));
      setCryptoBulletinMetaFittedFontPx((current) => (current === null ? current : null));
      return;
    }

    let frameId = 0;
    const runMeasurement = () => {
      const titleNode = cryptoBulletinTitlePreviewRef.current;
      const subtitleNode = cryptoBulletinSubtitlePreviewRef.current;
      const metaNode = cryptoBulletinMetaPreviewRef.current;

      if (titleNode) {
        const nextTitleFont = getAutoFittedSingleLineFontSizePx(titleNode, cryptoBulletinTitlePreferredFontPx, Math.max(14, Math.round(cryptoBulletinTitlePreferredFontPx * 0.24)));
        setCryptoBulletinTitleFittedFontPx((current) => (current !== null && Math.abs(current - nextTitleFont) < 0.1 ? current : nextTitleFont));
      }

      if (subtitleNode) {
        const nextSubtitleFont = getAutoFittedSingleLineFontSizePx(subtitleNode, cryptoBulletinSubtitlePreferredFontPx, Math.max(14, Math.round(cryptoBulletinSubtitlePreferredFontPx * 0.26)));
        setCryptoBulletinSubtitleFittedFontPx((current) => (current !== null && Math.abs(current - nextSubtitleFont) < 0.1 ? current : nextSubtitleFont));
      }

      if (metaNode) {
        const nextMetaFont = getAutoFittedSingleLineFontSizePx(metaNode, cryptoBulletinMetaPreferredFontPx, Math.max(12, Math.round(cryptoBulletinMetaPreferredFontPx * 0.28)));
        setCryptoBulletinMetaFittedFontPx((current) => (current !== null && Math.abs(current - nextMetaFont) < 0.1 ? current : nextMetaFont));
      }
    };

    const scheduleMeasurement = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(runMeasurement);
    };

    scheduleMeasurement();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        scheduleMeasurement();
      });
      if (cryptoBulletinTitlePreviewRef.current) {
        resizeObserver.observe(cryptoBulletinTitlePreviewRef.current);
      }
      if (cryptoBulletinSubtitlePreviewRef.current) {
        resizeObserver.observe(cryptoBulletinSubtitlePreviewRef.current);
      }
      if (cryptoBulletinMetaPreviewRef.current) {
        resizeObserver.observe(cryptoBulletinMetaPreviewRef.current);
      }
    }

    window.addEventListener("resize", scheduleMeasurement);

    return () => {
      window.removeEventListener("resize", scheduleMeasurement);
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isCryptoBulletinCoverTemplate, cryptoBulletinTitleSingleLine, cryptoBulletinSubtitleSingleLine, cryptoBulletinMetaSingleLine, cryptoBulletinTitlePreferredFontPx, cryptoBulletinSubtitlePreferredFontPx, cryptoBulletinMetaPreferredFontPx]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="inline-flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <DocumentPlusIcon className="h-7 w-7" aria-hidden="true" />
          {isEditMode ? `Edit Post${requestedEditPostId ? ` #${requestedEditPostId}` : ""}` : "Add Post"}
        </h1>
        <Link href="/" className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          Back to Posts
        </Link>
      </div>
      {isEditMode && loadingEditPost ? <p className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">Loading post data for edit mode...</p> : null}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Post Fields</h2>
            <div className="inline-flex items-center gap-2">
              <input
                ref={importJsonInputRef}
                id="import-post-json-file"
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void importFromJsonFile(file);
                  }
                  event.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => importJsonInputRef.current?.click()}
                disabled={importingJsonFile}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CloudArrowUpIcon className="h-4 w-4" aria-hidden="true" />
                {importingJsonFile ? "Importing JSON..." : "Import JSON File"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="user_pk" className={labelClassName}>
                user_pk *
              </label>
              <input id="user_pk" className={inputClassName} value={form.user_pk} onChange={(event) => setField("user_pk", event.target.value)} placeholder="1" required />
            </div>

            <div>
              <label className={labelClassName}>locale (browser)</label>
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200">{form.locale || "Detecting..."}</div>
            </div>

            <div>
              <label htmlFor="title" className={labelClassName}>
                title
              </label>
              <input id="title" className={inputClassName} value={form.title} onChange={(event) => setField("title", event.target.value)} />
            </div>

            <div>
              <span className={labelClassName}>text display content</span>
              <label htmlFor="show_page_content" className="flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100">
                <input id="show_page_content" type="checkbox" checked={form.show_page_content} onChange={(event) => setField("show_page_content", event.target.checked)} className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600" />
                Show content in Text Display
              </label>
            </div>

            <div>
              <label htmlFor="page_scale" className={labelClassName}>
                page scale
              </label>
              <select id="page_scale" className={inputClassName} value={form.page_scale} onChange={(event) => setField("page_scale", event.target.value as PageScaleRatio)}>
                {PAGE_SCALE_OPTIONS.map((pageScaleOption) => (
                  <option key={pageScaleOption.value} value={pageScaleOption.value}>
                    {pageScaleOption.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="visibility" className={labelClassName}>
                visibility
              </label>
              <select id="visibility" className={inputClassName} value={form.visibility} onChange={(event) => setField("visibility", event.target.value as Visibility)}>
                <option value="public">public</option>
                <option value="followers">followers</option>
                <option value="private">private</option>
              </select>
            </div>
          </div>
        </section>

        <section ref={postPagesSectionRef} className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Post Layout</h2>
              {!isEditMode && totalPages > 1 ? <span className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300">{`Item ${currentPageNumber} / ${totalPages}`}</span> : null}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Cover Page Designer</h3>
                  <span className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 px-2 py-0.5 text-[11px] text-zinc-600 dark:text-zinc-300">{form.page_scale}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-zinc-600 dark:text-zinc-300 sm:col-span-2">
                    Cover template
                    <select value={coverDesignerTemplateId} onChange={(event) => setCoverDesignerTemplateId(event.target.value as CoverDesignerTemplateId)} className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs">
                      {COVER_DESIGNER_TEMPLATE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedCoverMediaSlots.map((mediaSlot) => {
                    const mediaSlotState = getCoverDesignerMediaSlotState(mediaSlot.id);
                    const mediaPreviewSrc = mediaSlotState.image_preview_url || mediaSlotState.raw_media_url || mediaSlotState.media_url;
                    const hasMissingRequiredMedia = mediaSlot.required && !hasCoverDesignerMediaSource(mediaSlotState);
                    const isDragOver = dragOverCoverMediaSlotId === mediaSlot.id;
                    const isInlineDraggingThisSlot = coverInlineCropDrag?.slotId === mediaSlot.id;
                    const cropRect = getCoverDesignerMediaCropRect(mediaSlotState);
                    const cropWidth = cropRect ? cropRect.x2 - cropRect.x1 : null;
                    const cropHeight = cropRect ? cropRect.y2 - cropRect.y1 : null;

                    return (
                      <div key={`cover-media-slot-${mediaSlot.id}`} className={`rounded-lg border p-2 sm:col-span-2 ${hasMissingRequiredMedia ? "border-rose-300 dark:border-rose-500/60" : "border-zinc-200 dark:border-zinc-700"}`}>
                        <input
                          id={`cover-media-slot-file-${mediaSlot.id}`}
                          type="file"
                          accept={mediaSlot.accept}
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void setCoverDesignerMediaFile(mediaSlot.id, file);
                            }
                            event.currentTarget.value = "";
                          }}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              void applyDefaultCoverDesignerMediaCrop(mediaSlot.id);
                            }}
                            disabled={!mediaPreviewSrc}
                            className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Crop
                          </button>
                          <button type="button" onClick={() => clearCoverDesignerMediaCrop(mediaSlot.id)} disabled={!cropRect} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
                            Clear Crop
                          </button>
                          {cropRect ? <span className="text-xs text-zinc-600 dark:text-zinc-300">{`x1:${cropRect.x1}, y1:${cropRect.y1}, x2:${cropRect.x2}, y2:${cropRect.y2}`}</span> : null}
                          <label htmlFor={`cover-media-slot-file-${mediaSlot.id}`} className="ml-auto inline-flex cursor-pointer items-center rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800">
                            Choose Image
                          </label>
                          <button type="button" onClick={() => clearCoverDesignerMediaFile(mediaSlot.id)} disabled={!mediaPreviewSrc} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
                            Remove
                          </button>
                        </div>
                        {mediaSlotState.width !== null && mediaSlotState.height !== null && mediaPreviewSrc ? (
                          <div className="mt-2 grid max-w-xs grid-cols-2 gap-2">
                            <label className="text-[11px] text-zinc-600 dark:text-zinc-300">
                              Crop W
                              <input
                                type="number"
                                min={1}
                                max={mediaSlotState.width}
                                value={cropWidth ?? mediaSlotState.width}
                                onChange={(event) => {
                                  void setCoverDesignerMediaCropDimension(mediaSlot.id, "width", event.target.value);
                                }}
                                className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                              />
                            </label>
                            <label className="text-[11px] text-zinc-600 dark:text-zinc-300">
                              Crop H
                              <input
                                type="number"
                                min={1}
                                max={mediaSlotState.height}
                                value={cropHeight ?? mediaSlotState.height}
                                onChange={(event) => {
                                  void setCoverDesignerMediaCropDimension(mediaSlot.id, "height", event.target.value);
                                }}
                                className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                              />
                            </label>
                          </div>
                        ) : null}
                        <div
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "copy";
                            if (!isDragOver) {
                              setDragOverCoverMediaSlotId(mediaSlot.id);
                            }
                          }}
                          onDragLeave={(event) => {
                            event.preventDefault();
                            setDragOverCoverMediaSlotId((current) => (current === mediaSlot.id ? null : current));
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            setDragOverCoverMediaSlotId((current) => (current === mediaSlot.id ? null : current));
                            const file = event.dataTransfer.files?.[0];
                            if (file) {
                              void setCoverDesignerMediaFile(mediaSlot.id, file);
                            }
                          }}
                          className={`relative mt-2 overflow-hidden rounded-xl border-2 border-dashed ${isDragOver ? "border-black bg-zinc-50 dark:bg-zinc-800/70" : "border-zinc-300 dark:border-zinc-600"}`}
                        >
                          {mediaPreviewSrc ? (
                            <>
                              <Image src={mediaPreviewSrc} alt={`${mediaSlot.label} preview`} width={mediaSlotState.width ?? 1200} height={mediaSlotState.height ?? 800} className="h-auto w-full object-contain" unoptimized />
                              {mediaSlotState.width !== null && mediaSlotState.height !== null && cropRect ? (
                                <div
                                  ref={isInlineDraggingThisSlot ? coverInlineCropOverlayRef : undefined}
                                  className={`absolute cursor-move touch-none select-none border-2 border-emerald-400 ${isInlineDraggingThisSlot ? "shadow-[0_0_0_9999px_rgba(16,185,129,0.25)]" : "shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"}`}
                                  onPointerDown={(event) => startCoverInlineCropDrag(mediaSlot.id, event)}
                                  onPointerEnter={(event) => updateInlineCropHoverCursor(event)}
                                  onPointerMove={(event) => moveCoverInlineCropDrag(mediaSlot.id, event)}
                                  onPointerUp={(event) => endCoverInlineCropDrag(mediaSlot.id, event)}
                                  onPointerCancel={(event) => endCoverInlineCropDrag(mediaSlot.id, event)}
                                  onPointerLeave={(event) => {
                                    event.currentTarget.style.cursor = "move";
                                  }}
                                  style={{
                                    left: `${(Math.min(cropRect.x1, cropRect.x2) / mediaSlotState.width) * 100}%`,
                                    top: `${(Math.min(cropRect.y1, cropRect.y2) / mediaSlotState.height) * 100}%`,
                                    width: `${((Math.max(cropRect.x1, cropRect.x2) - Math.min(cropRect.x1, cropRect.x2)) / mediaSlotState.width) * 100}%`,
                                    height: `${((Math.max(cropRect.y1, cropRect.y2) - Math.min(cropRect.y1, cropRect.y2)) / mediaSlotState.height) * 100}%`,
                                  }}
                                />
                              ) : null}
                              {isDragOver ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 text-white">
                                  <p className="text-sm font-medium">Drop image to replace</p>
                                </div>
                              ) : null}
                              <div className="absolute bottom-2 right-2 rounded-lg bg-black/55 px-2 py-1 text-xs text-white">{mediaSlotState.width && mediaSlotState.height ? `${mediaSlotState.width} x ${mediaSlotState.height}` : "Image selected"}</div>
                            </>
                          ) : (
                            <div className="px-4 py-8 text-center">
                              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Drag and drop image here</p>
                              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">or</p>
                              <label htmlFor={`cover-media-slot-file-${mediaSlot.id}`} className="mt-2 inline-flex cursor-pointer rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800">
                                Choose Image
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <label className="text-xs text-zinc-600 dark:text-zinc-300 sm:col-span-2">
                    Eyebrow
                    <input type="text" value={coverDesignerDraft.eyebrow} onChange={(event) => setCoverDesignerField("eyebrow", event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs" />
                  </label>
                  <label className="text-xs text-zinc-600 dark:text-zinc-300 sm:col-span-2">
                    Title
                    <textarea rows={2} value={coverDesignerDraft.title} onChange={(event) => setCoverDesignerField("title", event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs" />
                  </label>
                  <label className="text-xs text-zinc-600 dark:text-zinc-300 sm:col-span-2">
                    Subtitle
                    <textarea rows={2} value={coverDesignerDraft.subtitle} onChange={(event) => setCoverDesignerField("subtitle", event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs" />
                  </label>
                  <label className="text-xs text-zinc-600 dark:text-zinc-300 sm:col-span-2">
                    Footer line
                    <input type="text" value={coverDesignerDraft.meta} onChange={(event) => setCoverDesignerField("meta", event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs" placeholder="@your_handle  |  swipe for details" />
                  </label>
                  <label className="text-xs text-zinc-600 dark:text-zinc-300 sm:col-span-2">
                    Hashtags
                    <input type="text" value={coverDesignerDraft.hashtags} onChange={(event) => setCoverDesignerField("hashtags", event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs" placeholder="#tag_one #tag_two #tag_three" />
                  </label>
                </div>
              </div>
              {form.pages.map((page, index) =>
                isEditMode || index === normalizedActivePageIndex ? (
                  <div key={`page-${index + 1}`} className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-700 pb-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{`Page ${index + 1}`}</p>
                      <button type="button" onClick={() => addPageAfter(index)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800">
                        <PlusCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        Add Page
                      </button>
                    </div>
                    <div className="mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/60 px-2 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Add Elements To This Page</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {PAGE_ELEMENT_ORDER.filter((element) => element !== "background").map((element) => {
                          return (
                            <button key={`page-${index + 1}-${element}-add`} type="button" onClick={() => addElementToPage(index, element)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800">
                              <PlusCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                              {`Add ${PAGE_ELEMENT_LABEL[element]}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/60 px-2 py-2">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-300">padding</span>
                      {PAGE_CONTAINER_PADDING_SIDES.map(({ side, label }) => (
                        <label key={`page-${index}-padding-${side}`} className="inline-flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-1 py-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                          <span className="font-medium">{label.charAt(0)}</span>
                          <select id={`page-container-padding-${index}-${side}`} value={String(page.container_padding_px[side])} onChange={(event) => setPageContainerPadding(index, side, Number(event.target.value))} className="h-6 rounded border border-zinc-300 dark:border-zinc-600 px-1 text-xs">
                            {getPageContainerPaddingSelectOptions(page.container_padding_px[side]).map((paddingPx) => (
                              <option key={`page-${index}-padding-${side}-${paddingPx}`} value={paddingPx}>
                                {paddingPx}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>

                    <input
                      id={`page-background-image-file-${index}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void setPageBackgroundImageFile(index, file);
                        }
                        event.currentTarget.value = "";
                      }}
                    />

                    <div className="space-y-3">
                      {page.elements.map((elementKey, elementIndex) => {
                        const elementType = getElementTypeFromKey(elementKey);
                        const isBackgroundElement = elementType === "background";
                        const elementLabel = getElementLabelForDisplay(page.elements, elementIndex);
                        const isElementHidden = page.hiddenElements.includes(elementKey);
                        return (
                          <div key={`page-${index + 1}-${elementKey}`} className={`rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 ${isElementHidden ? "opacity-60" : ""}`}>
                            <div className="mb-2 grid gap-2 lg:grid-cols-[auto_1fr] lg:items-start">
                              <label className={`${labelClassName} mb-0`}>{elementLabel}</label>
                              <div className="min-w-0 flex flex-wrap items-center gap-1 lg:justify-end">
                                <button type="button" onClick={() => moveElementInPage(index, elementIndex, 0)} disabled={elementIndex === 0 || isBackgroundElement} className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
                                  <ChevronDoubleUpIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                  Top
                                </button>
                                <button type="button" onClick={() => moveElementInPage(index, elementIndex, elementIndex - 1)} disabled={elementIndex === 0 || isBackgroundElement} className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
                                  <ChevronUpIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                  Up
                                </button>
                                <button type="button" onClick={() => moveElementInPage(index, elementIndex, elementIndex + 1)} disabled={elementIndex === page.elements.length - 1 || isBackgroundElement} className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
                                  <ChevronDownIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                  Down
                                </button>
                                <button type="button" onClick={() => moveElementInPage(index, elementIndex, page.elements.length - 1)} disabled={elementIndex === page.elements.length - 1 || isBackgroundElement} className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
                                  <ChevronDoubleDownIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                  Bottom
                                </button>
                                <button type="button" onClick={() => toggleElementHidden(index, elementKey)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800">
                                  {isElementHidden ? <EyeIcon className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeSlashIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                                  {isElementHidden ? "Show" : "Hide"}
                                </button>
                                {isTextPageElement(elementType) ? (
                                  <>
                                    <select value={getTextStyleForElement(page, elementKey)} onChange={(event) => setTextElementStyle(index, elementKey, event.target.value as TextElementStyle)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs" aria-label={`${elementLabel} style`}>
                                      {TEXT_STYLE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300" aria-label={`${elementLabel} heading`}>
                                      <input type="checkbox" checked={getTextIsHeadingForElement(page, elementKey)} onChange={(event) => setTextIsHeading(index, elementKey, event.target.checked)} className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600" />
                                      <span>Heading</span>
                                    </label>
                                    <select value={getTextBackgroundMode(page, elementKey)} onChange={(event) => setTextBackgroundMode(index, elementKey, event.target.value as TextBackgroundMode)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs" aria-label={`${elementLabel} background mode`}>
                                      {TEXT_BACKGROUND_MODE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <select value={getTextEffectPreset(page, elementKey)} onChange={(event) => setTextEffect(index, elementKey, event.target.value as TextEffectPreset)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs" aria-label={`${elementLabel} text effect`}>
                                      {TEXT_EFFECT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <select value={page.text_alignments[elementKey] ?? "left"} onChange={(event) => setTextAlignment(index, elementKey, event.target.value as TextAlignment)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs" aria-label={`${elementLabel} alignment`}>
                                      {TEXT_ALIGNMENT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300" aria-label={`${elementLabel} text color`}>
                                      <span>Color</span>
                                      <input type="color" value={getColorInputValue(page.text_color_by_element[elementKey], selectedTemplate.elements[getTextStyleForElement(page, elementKey)].color)} onChange={(event) => setTextColor(index, elementKey, event.target.value)} className="h-6 w-8 cursor-pointer rounded border border-zinc-300 dark:border-zinc-600 bg-transparent p-0" />
                                    </label>
                                    <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300" aria-label={`${elementLabel} text background color`}>
                                      <span>BG</span>
                                      <input type="color" value={getColorInputValue(page.text_background_color_by_element[elementKey], selectedTemplate.elements[getTextStyleForElement(page, elementKey)].backgroundColor)} onChange={(event) => setTextBackgroundColor(index, elementKey, event.target.value)} className="h-6 w-8 cursor-pointer rounded border border-zinc-300 dark:border-zinc-600 bg-transparent p-0" />
                                    </label>
                                    {(() => {
                                      const textStyle = getTextStyleForElement(page, elementKey);
                                      const templateBackgroundDefaults = getTemplateTextBackgroundDefaults(selectedTemplate.elements[textStyle]);
                                      const translucencyValue = getTextBackgroundTranslucencyPercent(page, elementKey, templateBackgroundDefaults.translucencyPercent);

                                      return (
                                        <select value={String(translucencyValue)} onChange={(event) => setTextBackgroundTranslucency(index, elementKey, Number(event.target.value))} disabled={getTextBackgroundMode(page, elementKey) === "off"} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50" aria-label={`${elementLabel} background translucency`}>
                                          {getTextBackgroundTranslucencyOptions(translucencyValue).map((value) => (
                                            <option key={`page-${index}-${elementKey}-bg-translucency-${value}`} value={value}>
                                              {`Translucent: ${value}%`}
                                            </option>
                                          ))}
                                        </select>
                                      );
                                    })()}
                                  </>
                                ) : null}
                                <select value={page.element_corner_radius_px[elementKey] === null ? "default" : String(page.element_corner_radius_px[elementKey])} onChange={(event) => setElementCornerRadius(index, elementKey, event.target.value)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs" aria-label={`${elementLabel} corner radius`}>
                                  <option value="default">Corner: Default</option>
                                  {ELEMENT_CORNER_RADIUS_OPTIONS_PX.map((radiusPx) => (
                                    <option key={`page-${index}-${elementKey}-radius-${radiusPx}`} value={radiusPx}>
                                      {`Corner: ${radiusPx}px`}
                                    </option>
                                  ))}
                                </select>
                                <select value={String(page.element_padding_px[elementKey] ?? DEFAULT_ELEMENT_PADDING_PX)} onChange={(event) => setElementPadding(index, elementKey, Number(event.target.value))} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs" aria-label={`${elementLabel} padding`}>
                                  {ELEMENT_PADDING_OPTIONS_PX.map((paddingPx) => (
                                    <option key={`page-${index}-${elementKey}-padding-${paddingPx}`} value={paddingPx}>
                                      {`Padding: ${paddingPx}px`}
                                    </option>
                                  ))}
                                </select>
                                <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-600 px-1 py-1">
                                  <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Margin</span>
                                  {ELEMENT_MARGIN_SIDES.map(({ side, label }) => (
                                    <label key={`page-${index}-${elementKey}-margin-${side}`} className="inline-flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                                      <span className="font-medium">{label}</span>
                                      <select value={String(page.element_margin_px[elementKey]?.[side] ?? DEFAULT_ELEMENT_MARGIN_PX[side])} onChange={(event) => setElementMargin(index, elementKey, side, Number(event.target.value))} className="h-6 rounded border border-zinc-300 dark:border-zinc-600 px-1 text-xs" aria-label={`${elementLabel} margin ${side}`}>
                                        {getElementMarginSelectOptions(page.element_margin_px[elementKey]?.[side] ?? DEFAULT_ELEMENT_MARGIN_PX[side]).map((marginPx) => (
                                          <option key={`page-${index}-${elementKey}-margin-${side}-${marginPx}`} value={marginPx}>
                                            {marginPx}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  ))}
                                </div>
                                <button type="button" onClick={() => resetElementMargins(index, elementKey)} disabled={(page.element_margin_px[elementKey]?.top ?? DEFAULT_ELEMENT_MARGIN_PX.top) === DEFAULT_ELEMENT_MARGIN_PX.top && (page.element_margin_px[elementKey]?.right ?? DEFAULT_ELEMENT_MARGIN_PX.right) === DEFAULT_ELEMENT_MARGIN_PX.right && (page.element_margin_px[elementKey]?.bottom ?? DEFAULT_ELEMENT_MARGIN_PX.bottom) === DEFAULT_ELEMENT_MARGIN_PX.bottom && (page.element_margin_px[elementKey]?.left ?? DEFAULT_ELEMENT_MARGIN_PX.left) === DEFAULT_ELEMENT_MARGIN_PX.left} className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
                                  Reset Margin
                                </button>
                                <button type="button" onClick={() => removeElementFromPage(index, elementKey)} disabled={isBackgroundElement} className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
                                  <TrashIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                  Remove
                                </button>
                              </div>
                            </div>

                            {elementType === "background" ? (
                              <div className="space-y-2">
                                {(() => {
                                  const isInlineDraggingThisBackground = inlineCropDrag?.pageIndex === index && inlineCropDrag.target === "background";
                                  const backgroundCropRectForOverlay = getBackgroundCropRect(page);
                                  const backgroundEditSrc = page.background_image_preview_url || page.background_media_url;
                                  const hasBackgroundImage = !!page.background_image_file || !!page.background_image_preview_url || !!page.background_media_url || !!page.background_cropped_preview_url;
                                  const isRepeatPatternBackground = page.background_fit_mode === "repeat";
                                  const pageBackgroundSurfaceStyle = getPageBackgroundSurfaceStyle(page, selectedTemplate.pageBackgroundColor || "#ffffff");
                                  const baseBackgroundColorInputValue = getColorInputValue(page.background_color, selectedTemplate.pageBackgroundColor || "#ffffff");
                                  const isBackgroundGradientEnabled = typeof page.background_gradient_color === "string" && page.background_gradient_color.trim().length > 0;
                                  const gradientBackgroundColorInputValue = getColorInputValue(page.background_gradient_color, baseBackgroundColorInputValue);

                                  return (
                                    <>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            void applyDefaultBackgroundCrop(index);
                                          }}
                                          disabled={!backgroundEditSrc || isRepeatPatternBackground}
                                          className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          Crop
                                        </button>
                                        <button type="button" onClick={() => clearPageBackgroundCrop(index)} disabled={isRepeatPatternBackground || page.background_crop_top_left_x === null || page.background_crop_top_left_y === null || page.background_crop_bottom_right_x === null || page.background_crop_bottom_right_y === null} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
                                          Clear Crop
                                        </button>
                                        <button type="button" onClick={() => clearPageBackgroundImage(index)} disabled={!hasBackgroundImage} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
                                          Remove Image
                                        </button>
                                        {!isRepeatPatternBackground && page.background_crop_top_left_x !== null && page.background_crop_top_left_y !== null && page.background_crop_bottom_right_x !== null && page.background_crop_bottom_right_y !== null ? <span className="text-xs text-zinc-600 dark:text-zinc-300">{`x1:${page.background_crop_top_left_x}, y1:${page.background_crop_top_left_y}, x2:${page.background_crop_bottom_right_x}, y2:${page.background_crop_bottom_right_y}`}</span> : null}
                                        <div className="ml-auto flex flex-wrap items-center gap-2">
                                          <span className="text-xs text-zinc-600 dark:text-zinc-300">Fit</span>
                                          <select value={page.background_fit_mode} onChange={(event) => setPageBackgroundFitMode(index, event.target.value as MediaFitMode)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs">
                                            <option value="cover">Cover</option>
                                            <option value="width">Fit Width</option>
                                            <option value="repeat">Repeat Pattern</option>
                                          </select>
                                          <span className="text-xs text-zinc-600 dark:text-zinc-300">Effect</span>
                                          <select value={page.background_effect_preset} onChange={(event) => setPageBackgroundEffectPreset(index, event.target.value as BackgroundEffectPreset)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs">
                                            {BACKGROUND_EFFECT_OPTIONS.map((option) => (
                                              <option key={`background-effect-${option.value}`} value={option.value}>
                                                {option.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-3">
                                        <label className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                                          <span>Color</span>
                                          <input type="color" value={baseBackgroundColorInputValue} onChange={(event) => setPageBackgroundColor(index, event.target.value)} className="h-7 w-10 cursor-pointer rounded border border-zinc-300 dark:border-zinc-600 bg-transparent p-0" aria-label={`${elementLabel} background color`} />
                                        </label>
                                        <label className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                                          <input
                                            type="checkbox"
                                            checked={isBackgroundGradientEnabled}
                                            onChange={(event) => {
                                              if (event.target.checked) {
                                                setPageBackgroundGradientColor(index, gradientBackgroundColorInputValue);
                                              } else {
                                                setPageBackgroundGradientColor(index, null);
                                              }
                                            }}
                                            className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
                                          />
                                          <span>Gradient</span>
                                        </label>
                                        {isBackgroundGradientEnabled ? (
                                          <label className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                                            <span>To</span>
                                            <input type="color" value={gradientBackgroundColorInputValue} onChange={(event) => setPageBackgroundGradientColor(index, event.target.value)} className="h-7 w-10 cursor-pointer rounded border border-zinc-300 dark:border-zinc-600 bg-transparent p-0" aria-label={`${elementLabel} gradient color`} />
                                          </label>
                                        ) : null}
                                      </div>

                                      {!isRepeatPatternBackground && page.background_width !== null && page.background_height !== null && backgroundEditSrc ? (
                                        <div className="grid max-w-xs grid-cols-2 gap-2">
                                          <label className="text-xs text-zinc-600 dark:text-zinc-300">
                                            Crop W
                                            <input
                                              type="number"
                                              min={1}
                                              max={page.background_width}
                                              value={getBackgroundCropSize(page, "width") ?? page.background_width}
                                              onChange={(event) => {
                                                void setPageBackgroundCropDimension(index, "width", event.target.value);
                                              }}
                                              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs"
                                            />
                                          </label>
                                          <label className="text-xs text-zinc-600 dark:text-zinc-300">
                                            Crop H
                                            <input
                                              type="number"
                                              min={1}
                                              max={page.background_height}
                                              value={getBackgroundCropSize(page, "height") ?? page.background_height}
                                              onChange={(event) => {
                                                void setPageBackgroundCropDimension(index, "height", event.target.value);
                                              }}
                                              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs"
                                            />
                                          </label>
                                        </div>
                                      ) : null}

                                      <div
                                        onDragOver={(event) => {
                                          event.preventDefault();
                                          setDragOverBackgroundPageIndex(index);
                                        }}
                                        onDragLeave={(event) => {
                                          event.preventDefault();
                                          setDragOverBackgroundPageIndex((currentIndex) => (currentIndex === index ? null : currentIndex));
                                        }}
                                        onDrop={(event) => {
                                          event.preventDefault();
                                          setDragOverBackgroundPageIndex(null);
                                          const file = event.dataTransfer.files?.[0];
                                          if (file) {
                                            void setPageBackgroundImageFile(index, file);
                                          }
                                        }}
                                        className={`relative overflow-hidden rounded-xl border-2 border-dashed ${dragOverBackgroundPageIndex === index ? "border-black" : "border-zinc-300 dark:border-zinc-600"}`}
                                        style={pageBackgroundSurfaceStyle}
                                      >
                                        {backgroundEditSrc ? (
                                          <>
                                            {isRepeatPatternBackground ? (
                                              <div
                                                className="h-56 w-full"
                                                style={{
                                                  backgroundImage: toCssUrlValue(backgroundEditSrc),
                                                  backgroundRepeat: "repeat",
                                                  backgroundPosition: "left top",
                                                }}
                                              />
                                            ) : (
                                              <>
                                                <Image src={backgroundEditSrc} alt={isEditMode ? "Background preview" : `Background preview ${index + 1}`} width={page.background_width ?? 1200} height={page.background_height ?? 1500} className="h-auto w-full object-contain" unoptimized />
                                                {page.background_width !== null && page.background_height !== null && backgroundCropRectForOverlay ? (
                                                  <div
                                                    ref={isInlineDraggingThisBackground ? inlineCropOverlayRef : undefined}
                                                    className={`absolute cursor-move touch-none select-none border-2 border-sky-400 ${isInlineDraggingThisBackground ? "shadow-none" : "shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"}`}
                                                    onPointerDown={(event) => startInlineCropDrag(index, "background", null, event)}
                                                    onPointerEnter={(event) => updateInlineCropHoverCursor(event)}
                                                    onPointerMove={(event) => moveInlineCropDrag(index, "background", null, event)}
                                                    onPointerUp={(event) => endInlineCropDrag(index, "background", null, event)}
                                                    onPointerCancel={(event) => endInlineCropDrag(index, "background", null, event)}
                                                    onPointerLeave={(event) => {
                                                      event.currentTarget.style.cursor = "move";
                                                    }}
                                                    style={{
                                                      left: `${(Math.min(backgroundCropRectForOverlay.x1, backgroundCropRectForOverlay.x2) / page.background_width) * 100}%`,
                                                      top: `${(Math.min(backgroundCropRectForOverlay.y1, backgroundCropRectForOverlay.y2) / page.background_height) * 100}%`,
                                                      width: `${((Math.max(backgroundCropRectForOverlay.x1, backgroundCropRectForOverlay.x2) - Math.min(backgroundCropRectForOverlay.x1, backgroundCropRectForOverlay.x2)) / page.background_width) * 100}%`,
                                                      height: `${((Math.max(backgroundCropRectForOverlay.y1, backgroundCropRectForOverlay.y2) - Math.min(backgroundCropRectForOverlay.y1, backgroundCropRectForOverlay.y2)) / page.background_height) * 100}%`,
                                                    }}
                                                  />
                                                ) : null}
                                              </>
                                            )}
                                            {dragOverBackgroundPageIndex === index ? (
                                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 text-white">
                                                <p className="text-sm font-medium">Drop image to replace</p>
                                              </div>
                                            ) : null}
                                            <div className="absolute bottom-2 right-2 rounded-lg bg-black/55 px-2 py-1 text-xs text-white">{isRepeatPatternBackground ? "Pattern background" : page.background_width && page.background_height ? `${page.background_width} x ${page.background_height}` : "Background selected"}</div>
                                          </>
                                        ) : (
                                          <div className="px-4 py-8 text-center">
                                            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Drag and drop image here</p>
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">or</p>
                                            <label htmlFor={`page-background-image-file-${index}`} className="mt-2 inline-flex cursor-pointer rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800">
                                              Choose Image
                                            </label>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            ) : null}

                            {elementType === "media" ? (
                              <div className="space-y-2">
                                {(() => {
                                  const mediaState = getMediaStateForElement(page, elementKey);
                                  const mediaDropTarget = `${index}:${elementKey}`;
                                  const isInlineDraggingThisElement = inlineCropDrag?.pageIndex === index && inlineCropDrag.target === "media" && inlineCropDrag.mediaElementKey === elementKey;
                                  const cropRectForOverlay = getMediaCropRect(page, elementKey);

                                  return (
                                    <>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            void applyDefaultCrop(index, elementKey);
                                          }}
                                          disabled={!mediaState.image_preview_url && !mediaState.media_url}
                                          className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          Crop
                                        </button>
                                        <button type="button" onClick={() => clearPageCrop(index, elementKey)} disabled={mediaState.media_crop_top_left_x === null || mediaState.media_crop_top_left_y === null || mediaState.media_crop_bottom_right_x === null || mediaState.media_crop_bottom_right_y === null} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
                                          Clear Crop
                                        </button>
                                        {mediaState.media_crop_top_left_x !== null && mediaState.media_crop_top_left_y !== null && mediaState.media_crop_bottom_right_x !== null && mediaState.media_crop_bottom_right_y !== null ? <span className="text-xs text-zinc-600 dark:text-zinc-300">{`x1:${mediaState.media_crop_top_left_x}, y1:${mediaState.media_crop_top_left_y}, x2:${mediaState.media_crop_bottom_right_x}, y2:${mediaState.media_crop_bottom_right_y}`}</span> : null}
                                        <div className="ml-auto flex items-center gap-2">
                                          <span className="text-xs text-zinc-600 dark:text-zinc-300">Fit</span>
                                          <select value={mediaState.media_fit_mode} onChange={(event) => setPageMediaFitMode(index, elementKey, event.target.value as MediaFitMode)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs">
                                            <option value="width">Fit Width</option>
                                            <option value="cover">Cover</option>
                                          </select>
                                        </div>
                                      </div>

                                      {mediaState.width !== null && mediaState.height !== null && (mediaState.image_preview_url || mediaState.media_url) ? (
                                        <div className="grid max-w-xs grid-cols-2 gap-2">
                                          <label className="text-xs text-zinc-600 dark:text-zinc-300">
                                            Crop W
                                            <input
                                              type="number"
                                              min={1}
                                              max={mediaState.width}
                                              value={getMediaCropSize(page, elementKey, "width") ?? mediaState.width}
                                              onChange={(event) => {
                                                void setPageCropDimension(index, elementKey, "width", event.target.value);
                                              }}
                                              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs"
                                            />
                                          </label>
                                          <label className="text-xs text-zinc-600 dark:text-zinc-300">
                                            Crop H
                                            <input
                                              type="number"
                                              min={1}
                                              max={mediaState.height}
                                              value={getMediaCropSize(page, elementKey, "height") ?? mediaState.height}
                                              onChange={(event) => {
                                                void setPageCropDimension(index, elementKey, "height", event.target.value);
                                              }}
                                              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs"
                                            />
                                          </label>
                                        </div>
                                      ) : null}

                                      <input
                                        id={`page-image-file-${index}-${elementKey}`}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(event) => {
                                          const file = event.target.files?.[0];
                                          if (file) {
                                            void setPageImageFile(index, elementKey, file);
                                          }
                                          event.currentTarget.value = "";
                                        }}
                                      />

                                      <div
                                        onDragOver={(event) => {
                                          event.preventDefault();
                                          setDragOverMediaTarget(mediaDropTarget);
                                        }}
                                        onDragLeave={(event) => {
                                          event.preventDefault();
                                          setDragOverMediaTarget((currentTarget) => (currentTarget === mediaDropTarget ? null : currentTarget));
                                        }}
                                        onDrop={(event) => {
                                          event.preventDefault();
                                          setDragOverMediaTarget(null);
                                          const file = event.dataTransfer.files?.[0];
                                          if (file) {
                                            void setPageImageFile(index, elementKey, file);
                                          }
                                        }}
                                        className={`relative overflow-hidden rounded-xl border-2 border-dashed ${dragOverMediaTarget === mediaDropTarget ? "border-black bg-zinc-50 dark:bg-zinc-800/70" : "border-zinc-300 dark:border-zinc-600"}`}
                                      >
                                        {mediaState.image_preview_url ? (
                                          <>
                                            <Image src={mediaState.image_preview_url} alt={isEditMode ? "Media preview" : `Media preview ${index + 1}`} width={mediaState.width ?? 1200} height={mediaState.height ?? 800} className="h-auto w-full object-contain" unoptimized />
                                            {mediaState.width !== null && mediaState.height !== null && cropRectForOverlay ? (
                                              <div
                                                ref={isInlineDraggingThisElement ? inlineCropOverlayRef : undefined}
                                                className={`absolute cursor-move touch-none select-none border-2 border-emerald-400 ${isInlineDraggingThisElement ? "shadow-none" : "shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"}`}
                                                onPointerDown={(event) => startInlineCropDrag(index, "media", elementKey, event)}
                                                onPointerEnter={(event) => updateInlineCropHoverCursor(event)}
                                                onPointerMove={(event) => moveInlineCropDrag(index, "media", elementKey, event)}
                                                onPointerUp={(event) => endInlineCropDrag(index, "media", elementKey, event)}
                                                onPointerCancel={(event) => endInlineCropDrag(index, "media", elementKey, event)}
                                                onPointerLeave={(event) => {
                                                  event.currentTarget.style.cursor = "move";
                                                }}
                                                style={{
                                                  left: `${(Math.min(cropRectForOverlay.x1, cropRectForOverlay.x2) / mediaState.width) * 100}%`,
                                                  top: `${(Math.min(cropRectForOverlay.y1, cropRectForOverlay.y2) / mediaState.height) * 100}%`,
                                                  width: `${((Math.max(cropRectForOverlay.x1, cropRectForOverlay.x2) - Math.min(cropRectForOverlay.x1, cropRectForOverlay.x2)) / mediaState.width) * 100}%`,
                                                  height: `${((Math.max(cropRectForOverlay.y1, cropRectForOverlay.y2) - Math.min(cropRectForOverlay.y1, cropRectForOverlay.y2)) / mediaState.height) * 100}%`,
                                                }}
                                              />
                                            ) : null}
                                            {dragOverMediaTarget === mediaDropTarget ? (
                                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 text-white">
                                                <p className="text-sm font-medium">Drop image to replace</p>
                                              </div>
                                            ) : null}
                                            <div className="absolute bottom-2 right-2 rounded-lg bg-black/55 px-2 py-1 text-xs text-white">{mediaState.width && mediaState.height ? `${mediaState.width} x ${mediaState.height}` : "Image selected"}</div>
                                          </>
                                        ) : (
                                          <div className="px-4 py-8 text-center">
                                            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Drag and drop image here</p>
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">or</p>
                                            <label htmlFor={`page-image-file-${index}-${elementKey}`} className="mt-2 inline-flex cursor-pointer rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800">
                                              Choose Image
                                            </label>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            ) : null}

                            {elementType === "text" ? (
                              <textarea
                                className={inputClassName}
                                rows={1}
                                style={{ overflow: "hidden", resize: "none" }}
                                ref={(element) => {
                                  if (element) {
                                    resizeTextareaToContent(element);
                                  }
                                }}
                                onInput={(event) => resizeTextareaToContent(event.currentTarget)}
                                value={page.text_by_element[elementKey] ?? ""}
                                onChange={(event) => updatePageText(index, elementKey, event.target.value)}
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null,
              )}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
                <label htmlFor="custom_content" className={labelClassName}>
                  custom content
                </label>
                <p className="mb-2 text-xs text-zinc-600 dark:text-zinc-300">Appends after generated content when that option is enabled.</p>
                <textarea
                  id="custom_content"
                  className={inputClassName}
                  rows={3}
                  style={{ overflow: "hidden", resize: "vertical" }}
                  ref={(element) => {
                    if (element) {
                      resizeTextareaToContent(element);
                    }
                  }}
                  onInput={(event) => resizeTextareaToContent(event.currentTarget)}
                  value={form.custom_content}
                  onChange={(event) => setField("custom_content", event.target.value)}
                  placeholder="Write custom IG text content..."
                />
              </div>
            </div>

            <div className="lg:sticky lg:top-6 lg:self-start">
              <div className="mb-4 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                <div className="mb-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Cover Preview</p>
                </div>
                <div ref={coverPreviewCaptureRef}>
                  <CoverPreviewCanvas
                  isDefaultCoverTemplate={isDefaultCoverTemplate}
                  isDualNewsCoverTemplate={isDualNewsCoverTemplate}
                  isRoyalBoldCoverTemplate={isRoyalBoldCoverTemplate}
                  isCryptoBulletinCoverTemplate={isCryptoBulletinCoverTemplate}
                  isWarningAlertCoverTemplate={isWarningAlertCoverTemplate}
                  selectedPageScaleDimensions={selectedPageScaleDimensions}
                  selectedTemplate={selectedTemplate}
                  hasMissingRequiredCoverMedia={hasMissingRequiredCoverMedia}
                  coverPreviewPrimaryImageSrc={coverPreviewPrimaryImageSrc}
                  coverPreviewSecondaryImageSrc={coverPreviewSecondaryImageSrc}
                  coverEyebrowStyle={coverEyebrowStyle}
                  coverTitleStyle={coverTitleStyle}
                  coverSubtitleStyle={coverSubtitleStyle}
                  coverDesignerDraft={coverDesignerDraft}
                  coverPreviewMeta={coverPreviewMeta}
                  coverPreviewHashtagTokens={coverPreviewHashtagTokens}
                  coverPreviewHashtagsLine={coverPreviewHashtagsLine}
                  coverPreviewTitleSingleLine={coverPreviewTitleSingleLine}
                  coverPreviewSubtitleSingleLine={coverPreviewSubtitleSingleLine}
                  dualNewsTitlePreviewRef={dualNewsTitlePreviewRef}
                  dualNewsTitleRenderFontPx={dualNewsTitleRenderFontPx}
                  dualNewsSubtitlePreviewRef={dualNewsSubtitlePreviewRef}
                  dualNewsSubtitleRenderFontPx={dualNewsSubtitleRenderFontPx}
                  royalBoldHashtagsPreviewRef={royalBoldHashtagsPreviewRef}
                  royalBoldHashtagsRenderFontPx={royalBoldHashtagsRenderFontPx}
                  royalBoldHashtagDisplayLine={royalBoldHashtagDisplayLine}
                  royalBoldEyebrowPreviewRef={royalBoldEyebrowPreviewRef}
                  royalBoldEyebrowRenderFontPx={royalBoldEyebrowRenderFontPx}
                  royalBoldTitlePreviewRef={royalBoldTitlePreviewRef}
                  royalBoldTitleRenderFontPx={royalBoldTitleRenderFontPx}
                  royalBoldSubtitlePreviewRef={royalBoldSubtitlePreviewRef}
                  royalBoldSubtitleRenderFontPx={royalBoldSubtitleRenderFontPx}
                  royalBoldSubtitleLead={royalBoldSubtitleLead}
                  royalBoldSubtitleAccent={royalBoldSubtitleAccent}
                  cryptoBulletinChipContainerRadiusPx={cryptoBulletinChipContainerRadiusPx}
                  cryptoBulletinChipContainerPaddingXPx={cryptoBulletinChipContainerPaddingXPx}
                  cryptoBulletinChipContainerPaddingYPx={cryptoBulletinChipContainerPaddingYPx}
                  cryptoBulletinChipRows={cryptoBulletinChipRows}
                  cryptoBulletinChipGapPx={cryptoBulletinChipGapPx}
                  cryptoBulletinChipSpaceWidthPx={cryptoBulletinChipSpaceWidthPx}
                  cryptoBulletinChipCharacterCount={cryptoBulletinChipCharacterCount}
                  cryptoBulletinChipSizePx={cryptoBulletinChipSizePx}
                  cryptoBulletinChipFontSizePx={cryptoBulletinChipFontSizePx}
                  cryptoBulletinTitlePreviewRef={cryptoBulletinTitlePreviewRef}
                  cryptoBulletinTitleRenderFontPx={cryptoBulletinTitleRenderFontPx}
                  cryptoBulletinTitleSingleLine={cryptoBulletinTitleSingleLine}
                  cryptoBulletinSubtitlePreviewRef={cryptoBulletinSubtitlePreviewRef}
                  cryptoBulletinSubtitleRenderFontPx={cryptoBulletinSubtitleRenderFontPx}
                  cryptoBulletinSubtitleLead={cryptoBulletinSubtitleLead}
                  cryptoBulletinSubtitleAccent={cryptoBulletinSubtitleAccent}
                  cryptoBulletinSubtitleSingleLine={cryptoBulletinSubtitleSingleLine}
                  cryptoBulletinMetaPreviewRef={cryptoBulletinMetaPreviewRef}
                  cryptoBulletinMetaRenderFontPx={cryptoBulletinMetaRenderFontPx}
                  cryptoBulletinMetaSingleLine={cryptoBulletinMetaSingleLine}
                  warningAlertEyebrowPreviewRef={warningAlertEyebrowPreviewRef}
                  warningAlertEyebrowRenderFontPx={warningAlertEyebrowRenderFontPx}
                  warningAlertTitlePreviewRef={warningAlertTitlePreviewRef}
                  warningAlertTitleRenderFontPx={warningAlertTitleRenderFontPx}
                  warningAlertSubtitlePreviewRef={warningAlertSubtitlePreviewRef}
                  warningAlertSubtitleRenderFontPx={warningAlertSubtitleRenderFontPx}
                  warningAlertMetaPreviewRef={warningAlertMetaPreviewRef}
                  warningAlertMetaRenderFontPx={warningAlertMetaRenderFontPx}
                  warningAlertHashtagsPreviewRef={warningAlertHashtagsPreviewRef}
                  warningAlertHashtagsRenderFontPx={warningAlertHashtagsRenderFontPx}
                  />
                </div>
                <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">Cover fields, hashtags, and media are editable in the left column.</p>
              </div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-300">IG Preview</p>
                <button
                  type="button"
                  onClick={() => {
                    void saveCurrentPreviewAsImage();
                  }}
                  disabled={savingPreviewImage}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {savingPreviewImage ? "Saving..." : "Save PNG"}
                </button>
              </div>
              <p className="mb-2 text-[11px] text-zinc-500 dark:text-zinc-400">{isEditMode ? `Fixed page preview (${form.page_scale}). Each page exports as one image.` : "Fixed page preview."}</p>
              <div
                ref={previewContinuousAreaRef}
                className="relative"
                style={{
                  backgroundColor: selectedTemplate.pageBackgroundColor || "#ffffff",
                }}
              >
                <div className="space-y-0">
                  {form.pages.map((page, pageIndex) => {
                    const hasVisibleBackgroundElement = hasVisibleElementType(page, "background");
                    const backgroundElementKey = page.elements.find((elementKey) => getElementTypeFromKey(elementKey) === "background" && !page.hiddenElements.includes(elementKey)) ?? null;
                    const visibleElements = page.elements.filter((elementKey) => {
                      return getElementTypeFromKey(elementKey) !== "background" && !page.hiddenElements.includes(elementKey);
                    });
                    const shouldCenterHashtagPageContent = (() => {
                      if (visibleElements.length !== 1) {
                        return false;
                      }

                      const onlyVisibleElementKey = visibleElements[0];
                      if (getElementTypeFromKey(onlyVisibleElementKey) !== "text") {
                        return false;
                      }

                      const textValue = (page.text_by_element[onlyVisibleElementKey] ?? "").trim();
                      return textValue.startsWith("#");
                    })();
                    const shouldCenterSingleImagePageContent = (() => {
                      if (!page.center_single_media || visibleElements.length !== 1) {
                        return false;
                      }

                      const onlyVisibleElementKey = visibleElements[0];
                      return getElementTypeFromKey(onlyVisibleElementKey) === "media";
                    })();
                    const backgroundPreviewSrc = page.background_cropped_preview_url || page.background_image_preview_url || page.background_media_url;
                    const isRepeatPatternBackground = page.background_fit_mode === "repeat";
                    const backgroundPreviewCropRect = getBackgroundCropRect(page);
                    const backgroundEffectStyle = BACKGROUND_EFFECT_PRESET_STYLES[page.background_effect_preset] ?? BACKGROUND_EFFECT_PRESET_STYLES.none;
                    const pageBackgroundSurfaceStyle = getPageBackgroundSurfaceStyle(page, selectedTemplate.pageBackgroundColor || "#ffffff");

                    return (
                      <div key={`preview-page-${pageIndex + 1}`} className="relative">
                        <div
                          ref={(element) => {
                            if (pageIndex === normalizedActivePageIndex) {
                              previewCaptureRef.current = element;
                            }
                          }}
                          data-page-index={pageIndex}
                          onClick={
                            isEditMode
                              ? undefined
                              : () => {
                                  runWithoutScrollJump(() => {
                                    setActivePageIndex(pageIndex);
                                  });
                                }
                          }
                          className="relative w-full overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm"
                          style={{
                            ...pageBackgroundSurfaceStyle,
                            aspectRatio: `${selectedPageScaleDimensions.width} / ${selectedPageScaleDimensions.height}`,
                          }}
                        >
                          {hasVisibleBackgroundElement ? (
                            <div
                              className="absolute inset-0 z-0 overflow-hidden"
                              style={{
                                ...pageBackgroundSurfaceStyle,
                                borderRadius: `${backgroundElementKey ? (page.element_corner_radius_px[backgroundElementKey] ?? 0) : 0}px`,
                              }}
                            >
                              {backgroundPreviewSrc ? (
                                isRepeatPatternBackground ? (
                                  <>
                                    <div
                                      className="h-full w-full"
                                      style={{
                                        backgroundImage: toCssUrlValue(backgroundPreviewSrc),
                                        backgroundRepeat: "repeat",
                                        backgroundPosition: "left top",
                                        filter: backgroundEffectStyle.filter === "none" ? undefined : backgroundEffectStyle.filter,
                                        transform: backgroundEffectStyle.scale === 1 ? undefined : `scale(${backgroundEffectStyle.scale})`,
                                        transformOrigin: backgroundEffectStyle.scale === 1 ? undefined : "center center",
                                      }}
                                    />
                                    {backgroundEffectStyle.overlayColor ? (
                                      <div
                                        className="pointer-events-none absolute inset-0"
                                        style={{
                                          backgroundColor: backgroundEffectStyle.overlayColor,
                                        }}
                                      />
                                    ) : null}
                                  </>
                                ) : (
                                  <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={backgroundPreviewSrc}
                                      alt={isEditMode ? "Background" : `Background ${pageIndex + 1}`}
                                      width={backgroundPreviewCropRect ? Math.max(1, Math.abs(backgroundPreviewCropRect.x2 - backgroundPreviewCropRect.x1)) : (page.background_width ?? 1200)}
                                      height={backgroundPreviewCropRect ? Math.max(1, Math.abs(backgroundPreviewCropRect.y2 - backgroundPreviewCropRect.y1)) : (page.background_height ?? 1500)}
                                      loading="eager"
                                      decoding="sync"
                                      className={page.background_fit_mode === "cover" ? "h-full w-full object-cover" : "h-full w-full object-contain"}
                                      style={{
                                        filter: backgroundEffectStyle.filter === "none" ? undefined : backgroundEffectStyle.filter,
                                        transform: backgroundEffectStyle.scale === 1 ? undefined : `scale(${backgroundEffectStyle.scale})`,
                                        transformOrigin: backgroundEffectStyle.scale === 1 ? undefined : "center center",
                                      }}
                                    />
                                    {backgroundEffectStyle.overlayColor ? (
                                      <div
                                        className="pointer-events-none absolute inset-0"
                                        style={{
                                          backgroundColor: backgroundEffectStyle.overlayColor,
                                        }}
                                      />
                                    ) : null}
                                  </>
                                )
                              ) : (
                                <div className="h-full w-full" />
                              )}
                            </div>
                          ) : null}
                          <div
                            ref={(element) => {
                              previewPageContentRefs.current[pageIndex] = element;
                            }}
                            className={`relative z-10 flex h-full flex-col overflow-hidden ${shouldCenterHashtagPageContent || shouldCenterSingleImagePageContent ? "justify-center" : ""}`}
                            style={{
                              paddingTop: page.container_padding_px.top,
                              paddingRight: page.container_padding_px.right,
                              paddingBottom: page.container_padding_px.bottom,
                              paddingLeft: page.container_padding_px.left,
                            }}
                          >
                            {visibleElements.map((elementKey, visibleElementIndex) => {
                              const elementType = getElementTypeFromKey(elementKey);
                              const elementPaddingPx = page.element_padding_px[elementKey] ?? DEFAULT_ELEMENT_PADDING_PX;
                              const elementMarginPx = page.element_margin_px[elementKey] ?? DEFAULT_ELEMENT_MARGIN_PX;
                              const elementOuterMarginStyle = {
                                marginTop: elementMarginPx.top > 0 ? `${elementMarginPx.top}px` : undefined,
                                marginRight: elementMarginPx.right > 0 ? `${elementMarginPx.right}px` : undefined,
                                marginBottom: elementMarginPx.bottom > 0 ? `${elementMarginPx.bottom}px` : undefined,
                                marginLeft: elementMarginPx.left > 0 ? `${elementMarginPx.left}px` : undefined,
                              };
                              const elementSpacingStyle = {
                                ...elementOuterMarginStyle,
                                padding: elementPaddingPx > 0 ? `${elementPaddingPx}px` : undefined,
                              };
                              const draggableElement = elementKey as PreviewDraggableElement;
                              const isDraggingThisElement = previewMarginDrag?.pageIndex === pageIndex && previewMarginDrag.element === draggableElement;
                              const draggableClassName = `cursor-move touch-none select-none ${isDraggingThisElement ? "ring-2 ring-sky-400/80 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900" : ""}`;

                              if (elementType === "media") {
                                const mediaState = getMediaStateForElement(page, elementKey);
                                const previewSrc = mediaState.cropped_preview_url || mediaState.media_url || mediaState.image_preview_url;
                                const isCoverMode = mediaState.media_fit_mode === "cover";
                                const cornerRadiusPx = page.element_corner_radius_px[elementKey] ?? DEFAULT_MEDIA_ELEMENT_CORNER_RADIUS_PX;
                                const useCropDimensions = Boolean(mediaState.cropped_preview_url) && hasMediaCropRect(page, elementKey);
                                const previewWidth = useCropDimensions ? Math.max(1, Math.abs(mediaState.media_crop_bottom_right_x! - mediaState.media_crop_top_left_x!)) : (mediaState.width ?? 1200);
                                const previewHeight = useCropDimensions ? Math.max(1, Math.abs(mediaState.media_crop_bottom_right_y! - mediaState.media_crop_top_left_y!)) : (mediaState.height ?? 800);

                                return (
                                  <div key={`preview-${pageIndex}-${elementKey}-${visibleElementIndex}`} data-preview-element={elementKey} className={`${isCoverMode ? "min-h-0 flex-1" : "shrink-0"} ${draggableClassName}`} style={elementSpacingStyle} onPointerDown={(event) => startPreviewMarginDrag(pageIndex, draggableElement, visibleElementIndex, event)} onPointerMove={(event) => movePreviewMarginDrag(pageIndex, draggableElement, event)} onPointerUp={(event) => endPreviewMarginDrag(pageIndex, draggableElement, event)} onPointerCancel={(event) => endPreviewMarginDrag(pageIndex, draggableElement, event)}>
                                    <div
                                      className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${isCoverMode ? "h-full" : ""}`}
                                      style={{
                                        borderRadius: `${cornerRadiusPx}px`,
                                      }}
                                    >
                                      {previewSrc ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={previewSrc} alt={isEditMode ? "Media" : `Media ${pageIndex + 1}`} width={previewWidth} height={previewHeight} loading="eager" decoding="sync" className={isCoverMode ? "h-full w-full object-cover" : "h-auto w-full"} />
                                      ) : (
                                        <div className={`flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400 ${isCoverMode ? "h-full" : "min-h-24 py-4"}`}>Media</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }

                              if (isTextPageElement(elementType)) {
                                const textStyle = getTextStyleForElement(page, elementKey);
                                const textIsHeading = getTextIsHeadingForElement(page, elementKey);
                                const TextPreviewTag = textIsHeading ? "h2" : "p";
                                const textBackgroundMode = getTextBackgroundMode(page, elementKey);
                                const hasTextBackground = textBackgroundMode !== "off";
                                const isFullWidthTextBackground = textBackgroundMode === "full-width";
                                const textAlignment = page.text_alignments[elementKey] ?? "left";
                                const textEffectStyle = TEXT_EFFECT_STYLES[getTextEffectPreset(page, elementKey)] ?? TEXT_EFFECT_STYLES.none;
                                const templateStyle = selectedTemplate.elements[textStyle];
                                const templateTextBackgroundDefaults = getTemplateTextBackgroundDefaults(templateStyle);
                                const textColor = toOptionalHexColor(page.text_color_by_element[elementKey]) ?? templateStyle.color;
                                const textBackgroundColor = toOptionalHexColor(page.text_background_color_by_element[elementKey]) ?? templateTextBackgroundDefaults.color;
                                const textBackgroundTranslucencyPercent = getTextBackgroundTranslucencyPercent(page, elementKey, templateTextBackgroundDefaults.translucencyPercent);
                                const previewTextBackgroundColor = getColorWithTranslucency(textBackgroundColor, textBackgroundTranslucencyPercent);
                                const cornerRadiusPx = page.element_corner_radius_px[elementKey] ?? selectedTemplateTextBackground.borderRadiusPx;
                                const textPaddingY = (hasTextBackground ? selectedTemplateTextBackground.paddingYpx : 0) + elementPaddingPx;
                                const textPaddingX = (hasTextBackground ? selectedTemplateTextBackground.paddingXpx : 0) + elementPaddingPx;
                                const textBackgroundEffectStyle = getTemplateTextBackgroundEffectStyle(selectedTemplate.id, hasTextBackground, cornerRadiusPx);
                                const textElementContainerStyle = {
                                  ...elementOuterMarginStyle,
                                  textAlign: textAlignment,
                                  alignSelf: isFullWidthTextBackground ? "stretch" : getTextAlignmentSelfValue(textAlignment),
                                  width: isFullWidthTextBackground ? "100%" : "fit-content",
                                  maxWidth: "100%",
                                };
                                const textValue = (page.text_by_element[elementKey] ?? "").trim();

                                return (
                                  <div key={`preview-${pageIndex}-${elementKey}-${visibleElementIndex}`} data-preview-element={elementKey} className={`shrink-0 ${draggableClassName}`} style={textElementContainerStyle} onPointerDown={(event) => startPreviewMarginDrag(pageIndex, draggableElement, visibleElementIndex, event)} onPointerMove={(event) => movePreviewMarginDrag(pageIndex, draggableElement, event)} onPointerUp={(event) => endPreviewMarginDrag(pageIndex, draggableElement, event)} onPointerCancel={(event) => endPreviewMarginDrag(pageIndex, draggableElement, event)}>
                                    <TextPreviewTag
                                      className={`${textStyle === "caption" ? "leading-6" : PREVIEW_HEADING_CLASS[textStyle]} whitespace-pre-line`}
                                      style={{
                                        fontFamily: templateStyle.fontFamily,
                                        fontSize: `${templateStyle.fontSizePx}px`,
                                        fontWeight: templateStyle.fontWeight,
                                        color: textColor,
                                        textAlign: textAlignment,
                                        backgroundColor: hasTextBackground ? previewTextBackgroundColor : "transparent",
                                        ...textBackgroundEffectStyle,
                                        ...textEffectStyle,
                                        padding: textPaddingY > 0 || textPaddingX > 0 ? `${textPaddingY}px ${textPaddingX}px` : undefined,
                                        borderRadius: hasTextBackground ? `${cornerRadiusPx}px` : undefined,
                                        display: isFullWidthTextBackground ? "block" : "inline-block",
                                        width: isFullWidthTextBackground ? "100%" : undefined,
                                        maxWidth: "100%",
                                      }}
                                    >
                                      {renderTextWithHashtags(textValue || TEXT_ELEMENT_STYLE_LABEL[textStyle], selectedTemplate.hashtag)}
                                    </TextPreviewTag>
                                  </div>
                                );
                              }

                              return null;
                            })}
                            {visibleElements.length === 0 && !hasVisibleBackgroundElement ? <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">All elements are hidden</div> : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {!isEditMode && totalPages > 1 ? (
                <div className="flex items-center justify-center gap-2 pt-1">
                  {form.pages.map((_, pageIndex) => {
                    const isActive = pageIndex === normalizedActivePageIndex;
                    return (
                      <button
                        key={`preview-dot-${pageIndex + 1}`}
                        type="button"
                        onClick={() =>
                          runWithoutScrollJump(() => {
                            setActivePageIndex(pageIndex);
                          })
                        }
                        aria-label={`Go to item ${pageIndex + 1}`}
                        aria-current={isActive ? "true" : undefined}
                        className={`rounded-full transition-all ${isActive ? "h-2.5 w-5 bg-zinc-900 dark:bg-zinc-100" : "h-2.5 w-2.5 bg-zinc-300 hover:bg-zinc-400 dark:bg-zinc-600 dark:hover:bg-zinc-500"}`}
                      />
                    );
                  })}
                </div>
              ) : null}

              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 shadow-sm">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Text Display</p>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                  <div className="min-w-0">
                    <p className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">you</p>
                    <p className="whitespace-pre-line break-words text-sm leading-6 text-zinc-800 dark:text-zinc-200">{hasTextDisplayContent ? renderTextWithHashtags(textDisplayContent, selectedTemplate.hashtag) : "No content yet."}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {errorMessage ? <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{errorMessage}</p> : null}
        {successMessage ? <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{successMessage}</p> : null}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={submitting || loadingEditPost} className="inline-flex items-center gap-1 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
            <CloudArrowUpIcon className="h-4 w-4" aria-hidden="true" />
            {submitting ? (uploadingPageIndex !== null ? (isEditMode ? "Uploading preview..." : `Uploading ${uploadingPageIndex + 1}...`) : "Saving...") : loadingEditPost ? "Loading..." : isEditMode ? "Update Post" : "Save Post"}
          </button>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">This saves one row to `posts` and one saved preview image per page.</span>
        </div>
      </form>
    </main>
  );
}
