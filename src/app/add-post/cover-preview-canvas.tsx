import Image from "next/image";

export function CoverPreviewCanvas(props: any) {
  const {
    isDefaultCoverTemplate,
    isDualNewsCoverTemplate,
    isRoyalBoldCoverTemplate,
    isCryptoBulletinCoverTemplate,
    isWarningAlertCoverTemplate,
    selectedPageScaleDimensions,
    selectedTemplate,
    hasMissingRequiredCoverMedia,
    coverPreviewPrimaryImageSrc,
    coverPreviewSecondaryImageSrc,
    coverEyebrowStyle,
    coverTitleStyle,
    coverSubtitleStyle,
    coverDesignerDraft,
    coverPreviewMeta,
    coverPreviewHashtagTokens,
    coverPreviewHashtagsLine,
    coverPreviewTitleSingleLine,
    coverPreviewSubtitleSingleLine,
    dualNewsTitlePreviewRef,
    dualNewsTitleRenderFontPx,
    dualNewsSubtitlePreviewRef,
    dualNewsSubtitleRenderFontPx,
    royalBoldHashtagsPreviewRef,
    royalBoldHashtagsRenderFontPx,
    royalBoldHashtagDisplayLine,
    royalBoldEyebrowPreviewRef,
    royalBoldEyebrowRenderFontPx,
    royalBoldTitlePreviewRef,
    royalBoldTitleRenderFontPx,
    royalBoldSubtitlePreviewRef,
    royalBoldSubtitleRenderFontPx,
    royalBoldSubtitleLead,
    royalBoldSubtitleAccent,
    cryptoBulletinChipContainerRadiusPx,
    cryptoBulletinChipContainerPaddingXPx,
    cryptoBulletinChipContainerPaddingYPx,
    cryptoBulletinChipRows,
    cryptoBulletinChipGapPx,
    cryptoBulletinChipSpaceWidthPx,
    cryptoBulletinChipCharacterCount,
    cryptoBulletinChipSizePx,
    cryptoBulletinChipFontSizePx,
    cryptoBulletinTitlePreviewRef,
    cryptoBulletinTitleRenderFontPx,
    cryptoBulletinTitleSingleLine,
    cryptoBulletinSubtitlePreviewRef,
    cryptoBulletinSubtitleRenderFontPx,
    cryptoBulletinSubtitleLead,
    cryptoBulletinSubtitleAccent,
    cryptoBulletinSubtitleSingleLine,
    cryptoBulletinMetaPreviewRef,
    cryptoBulletinMetaRenderFontPx,
    cryptoBulletinMetaSingleLine,
    warningAlertEyebrowPreviewRef,
    warningAlertEyebrowRenderFontPx,
    warningAlertTitlePreviewRef,
    warningAlertTitleRenderFontPx,
    warningAlertSubtitlePreviewRef,
    warningAlertSubtitleRenderFontPx,
    warningAlertMetaPreviewRef,
    warningAlertMetaRenderFontPx,
    warningAlertHashtagsPreviewRef,
    warningAlertHashtagsRenderFontPx,
  } = props;

  return (
    <div className="overflow-hidden">
      {isDefaultCoverTemplate ? (
        <div
          className="relative overflow-hidden p-4"
          style={{
            aspectRatio: `${selectedPageScaleDimensions.width} / ${selectedPageScaleDimensions.height}`,
            backgroundColor: selectedTemplate.pageBackgroundColor || "#ffffff",
            backgroundImage: "radial-gradient(125% 90% at 100% 0%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 62%), radial-gradient(110% 90% at 0% 100%, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0) 68%)",
          }}
        >
          <div className="pointer-events-none absolute -right-12 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-14 bottom-10 h-44 w-44 rounded-full bg-black/25 blur-2xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 55%), linear-gradient(320deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 58%)",
            }}
          />
          {hasMissingRequiredCoverMedia ? <p className="absolute right-3 top-3 z-10 rounded-md bg-rose-500/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">Add required image</p> : null}
          <div className="relative z-10 flex h-full flex-col gap-3">
            <div className="relative h-[44%] overflow-hidden rounded-[20px] border border-white/30 bg-black/20 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
              {coverPreviewPrimaryImageSrc ? <Image src={coverPreviewPrimaryImageSrc} alt="Cover image preview" fill className="object-cover" unoptimized /> : <div className="flex h-full items-center justify-center px-3 text-center text-xs font-medium uppercase tracking-[0.08em] text-white/75">Add a cover image</div>}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/5" />
              <span className="absolute left-2 top-2 rounded-full border border-white/35 bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">Cover</span>
            </div>
            <div className="rounded-[18px] border border-white/20 bg-black/35 px-3 py-3 backdrop-blur-md">
              <p
                className="mb-1 uppercase tracking-[0.14em]"
                style={{
                  fontFamily: coverEyebrowStyle.fontFamily,
                  fontSize: `${Math.max(10, Math.round(coverEyebrowStyle.fontSizePx * 0.64))}px`,
                  fontWeight: coverEyebrowStyle.fontWeight,
                  color: coverEyebrowStyle.color,
                }}
              >
                {coverDesignerDraft.eyebrow.trim() || "COVER STORY"}
              </p>
              <h3
                className="whitespace-pre-line break-words leading-tight"
                style={{
                  fontFamily: coverTitleStyle.fontFamily,
                  fontSize: `${Math.max(20, Math.round(coverTitleStyle.fontSizePx * 0.74))}px`,
                  fontWeight: coverTitleStyle.fontWeight,
                  color: coverTitleStyle.color,
                }}
              >
                {coverDesignerDraft.title.trim() || "Your Cover Title"}
              </h3>
              <p
                className="mt-2 whitespace-pre-line break-words"
                style={{
                  fontFamily: coverSubtitleStyle.fontFamily,
                  fontSize: `${Math.max(12, Math.round(coverSubtitleStyle.fontSizePx * 0.88))}px`,
                  fontWeight: coverSubtitleStyle.fontWeight,
                  color: coverSubtitleStyle.color,
                }}
              >
                {coverDesignerDraft.subtitle.trim() || "Draft a short hook for the first impression."}
              </p>
            </div>
            <div className="mt-auto space-y-2 rounded-[14px] border border-white/20 bg-black/45 px-3 py-2.5 shadow-[0_8px_26px_rgba(0,0,0,0.32)] backdrop-blur-md">
              <p
                className="whitespace-pre-line break-words"
                style={{
                  fontFamily: coverSubtitleStyle.fontFamily,
                  fontSize: "11px",
                  fontWeight: 600,
                  color: coverSubtitleStyle.color,
                  opacity: 0.95,
                }}
              >
                {coverPreviewMeta}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {coverPreviewHashtagTokens.map((hashtag: string, hashtagIndex: number) => (
                  <span key={`default-cover-footer-hashtag-${hashtagIndex}`} className="rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[10px] font-semibold tracking-[0.01em] text-white/95">
                    {hashtag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : isDualNewsCoverTemplate ? (
        <div
          className="relative overflow-hidden"
          style={{
            aspectRatio: `${selectedPageScaleDimensions.width} / ${selectedPageScaleDimensions.height}`,
            backgroundColor: "#06080f",
            backgroundImage: "linear-gradient(180deg, #0f172a 0%, #090d18 56%, #070a12 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "radial-gradient(130% 90% at 50% -24%, rgba(250,204,21,0.16) 0%, rgba(250,204,21,0) 58%), linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.08) 54%, rgba(0,0,0,0.24) 100%)",
            }}
          />
          <div className="absolute inset-x-0 top-0 h-[56%] overflow-hidden">
            {coverPreviewPrimaryImageSrc ? <Image src={coverPreviewPrimaryImageSrc} alt="Main cover image preview" fill className="object-cover object-center" unoptimized /> : <div className="flex h-full items-center justify-center bg-zinc-900 text-xs font-medium uppercase tracking-wide text-zinc-300">Add main image</div>}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-black/0 to-black/20" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-black/62 via-black/34 to-transparent" />
          <div className="absolute inset-x-0 top-[56%] z-20 h-[5%] border-y border-white/20 bg-black/62 px-3">
            <p
              className="flex h-full items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap text-center"
              style={{
                fontFamily: coverSubtitleStyle.fontFamily,
                fontSize: `${Math.max(9, Math.round(coverSubtitleStyle.fontSizePx * 0.66))}px`,
                fontWeight: Math.max(500, coverSubtitleStyle.fontWeight),
                color: "#f8fafc",
                opacity: 0.96,
                textShadow: "0 2px 6px rgba(0,0,0,0.62)",
              }}
            >
              {coverPreviewMeta}
            </p>
          </div>
          <div className="absolute inset-x-0 top-[61%] h-[39%] overflow-hidden border-t border-white/20">
            {coverPreviewSecondaryImageSrc ? <Image src={coverPreviewSecondaryImageSrc} alt="Secondary cover image preview" fill className="object-cover object-center" unoptimized /> : <div className="flex h-full items-center justify-center bg-zinc-900 text-xs font-medium uppercase tracking-wide text-zinc-300">Add secondary image</div>}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/52 via-black/10 to-black/62" />
            <div className="pointer-events-none absolute -bottom-10 -right-8 h-36 w-44 rounded-full bg-amber-400/35 blur-3xl" />
          </div>
          {hasMissingRequiredCoverMedia ? <p className="absolute right-3 top-3 z-20 rounded-md bg-rose-500/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">Add 2 required images</p> : null}
          <div className="relative z-10 h-full px-4 pt-4 pb-3">
            <div className="max-w-[94%]">
              <h3
                ref={dualNewsTitlePreviewRef}
                className="overflow-hidden text-ellipsis whitespace-nowrap"
                style={{
                  fontFamily: coverTitleStyle.fontFamily,
                  fontSize: `${dualNewsTitleRenderFontPx}px`,
                  lineHeight: 1.06,
                  fontWeight: 900,
                  color: "#facc15",
                  textShadow: "0 1px 0 rgba(0,0,0,0.45), 0 2px 0 rgba(0,0,0,0.45), 0 8px 20px rgba(0,0,0,0.6)",
                }}
              >
                {coverPreviewTitleSingleLine}
              </h3>
              <p
                ref={dualNewsSubtitlePreviewRef}
                className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap"
                style={{
                  fontFamily: coverTitleStyle.fontFamily,
                  fontSize: `${dualNewsSubtitleRenderFontPx}px`,
                  lineHeight: 1.06,
                  fontWeight: 900,
                  color: "#f8fafc",
                  textShadow: "0 1px 0 rgba(0,0,0,0.5), 0 2px 0 rgba(0,0,0,0.5), 0 8px 18px rgba(0,0,0,0.62)",
                }}
              >
                {coverPreviewSubtitleSingleLine}
              </p>
              <p className="mt-2 inline-flex w-fit rounded-sm border border-white/20 bg-black/58 px-2 py-1 text-[11px] font-semibold text-zinc-100">{coverDesignerDraft.eyebrow.trim() || "SUBHEAD STRIP"}</p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 border-t border-white/20 bg-gradient-to-b from-black/10 via-black/80 to-black/95 px-4 pb-3 pt-4">
            <p
              className="whitespace-pre-line break-words text-center"
              style={{
                fontFamily: coverEyebrowStyle.fontFamily,
                fontSize: "17px",
                fontWeight: 900,
                letterSpacing: "0.01em",
                color: "#facc15",
                textShadow: "0 4px 12px rgba(0,0,0,0.65)",
              }}
            >
              {coverPreviewHashtagsLine}
            </p>
          </div>
        </div>
      ) : isRoyalBoldCoverTemplate ? (
        <div
          className="relative overflow-hidden"
          style={{
            aspectRatio: `${selectedPageScaleDimensions.width} / ${selectedPageScaleDimensions.height}`,
            backgroundColor: "#02040a",
          }}
        >
          {coverPreviewPrimaryImageSrc ? <Image src={coverPreviewPrimaryImageSrc} alt="Royal bold cover image preview" fill className="object-cover object-center" unoptimized /> : <div className="flex h-full items-center justify-center bg-zinc-900 px-4 text-center text-xs font-semibold uppercase tracking-wide text-zinc-300">Add a cover image</div>}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/0 via-black/8 to-black/22" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-black/82 via-black/56 to-transparent" />
          {hasMissingRequiredCoverMedia ? <p className="absolute right-3 top-3 z-20 rounded-md bg-rose-500/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">Add required image</p> : null}
          <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-px flex-1 bg-white/40" />
              <div className="w-[68%] min-w-0">
                <p
                  ref={royalBoldHashtagsPreviewRef}
                  className="w-full overflow-hidden whitespace-nowrap text-center uppercase tracking-[0.02em] text-yellow-300"
                  style={{
                    fontFamily: coverTitleStyle.fontFamily,
                    fontSize: `${royalBoldHashtagsRenderFontPx}px`,
                    fontWeight: 900,
                    textShadow: "0 2px 12px rgba(0,0,0,0.65)",
                  }}
                >
                  {royalBoldHashtagDisplayLine || "#LIVE #LIKE #ROYALTY"}
                </p>
              </div>
              <div className="h-px flex-1 bg-white/40" />
            </div>
            <p
              ref={royalBoldEyebrowPreviewRef}
              className="overflow-hidden whitespace-nowrap text-center uppercase tracking-[0.08em]"
              style={{
                fontFamily: coverEyebrowStyle.fontFamily,
                fontSize: `${royalBoldEyebrowRenderFontPx}px`,
                fontWeight: Math.max(700, coverEyebrowStyle.fontWeight),
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {coverDesignerDraft.eyebrow.trim() || "TOP STORY"}
            </p>
            <h3
              ref={royalBoldTitlePreviewRef}
              className="mt-1 overflow-hidden whitespace-nowrap uppercase leading-[0.9] text-white"
              style={{
                fontFamily: coverTitleStyle.fontFamily,
                fontSize: `${royalBoldTitleRenderFontPx}px`,
                fontWeight: 900,
                textShadow: "0 2px 12px rgba(0,0,0,0.65)",
              }}
            >
              {coverPreviewTitleSingleLine}
            </h3>
            <p
              ref={royalBoldSubtitlePreviewRef}
              className="mt-1 overflow-hidden whitespace-nowrap uppercase leading-[0.9]"
              style={{
                fontFamily: coverTitleStyle.fontFamily,
                fontSize: `${royalBoldSubtitleRenderFontPx}px`,
                fontWeight: 900,
                textShadow: "0 2px 12px rgba(0,0,0,0.65)",
              }}
            >
              {royalBoldSubtitleLead ? <span className="text-white">{`${royalBoldSubtitleLead} `}</span> : null}
              <span className="text-yellow-300">{royalBoldSubtitleAccent || coverPreviewSubtitleSingleLine}</span>
            </p>
          </div>
        </div>
      ) : isCryptoBulletinCoverTemplate ? (
        <div
          className="relative overflow-hidden"
          style={{
            aspectRatio: `${selectedPageScaleDimensions.width} / ${selectedPageScaleDimensions.height}`,
            backgroundColor: "#0a0807",
          }}
        >
          {coverPreviewPrimaryImageSrc ? <Image src={coverPreviewPrimaryImageSrc} alt="Crypto bulletin cover image preview" fill className="object-cover object-center" unoptimized /> : <div className="flex h-full items-center justify-center bg-zinc-900 px-4 text-center text-xs font-semibold uppercase tracking-wide text-zinc-300">Add a cover image</div>}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/74 via-black/24 to-black/72" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[56%] bg-gradient-to-t from-[#2f1a0f]/95 via-[#2f1a0f]/68 to-transparent" />
          {hasMissingRequiredCoverMedia ? <p className="absolute right-3 top-3 z-20 rounded-md bg-rose-500/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">Add required image</p> : null}
          <div className="relative z-10 flex h-full flex-col px-3 pb-4 pt-3">
            <p
              className="text-left tracking-[0.03em]"
              style={{
                fontFamily: coverEyebrowStyle.fontFamily,
                fontSize: `${Math.max(10, Math.round(coverEyebrowStyle.fontSizePx * 0.64))}px`,
                fontWeight: 700,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {coverPreviewHashtagsLine || "#crypto #market"}
            </p>
            <div
              className="mt-2 border border-amber-300/40 bg-amber-800/30 backdrop-blur-[1px]"
              style={{
                borderRadius: `${cryptoBulletinChipContainerRadiusPx}px`,
                paddingInline: `${cryptoBulletinChipContainerPaddingXPx}px`,
                paddingBlock: `${cryptoBulletinChipContainerPaddingYPx}px`,
              }}
            >
              <div
                className="flex flex-col items-center"
                style={{
                  gap: `${cryptoBulletinChipGapPx}px`,
                }}
              >
                {cryptoBulletinChipRows.map((rowTokens: string[], rowIndex: number) => {
                  const rowStartCharacterIndex = cryptoBulletinChipRows
                    .slice(0, rowIndex)
                    .flat()
                    .filter((token: string) => token !== " ").length;
                  return (
                    <div
                      key={`crypto-bulletin-chip-row-${rowIndex}`}
                      className="flex items-center justify-center"
                      style={{
                        gap: `${cryptoBulletinChipGapPx}px`,
                      }}
                    >
                      {rowTokens.map((token: string, tokenIndex: number) => {
                        if (token === " ") {
                          return (
                            <span
                              key={`crypto-bulletin-chip-space-${rowIndex}-${tokenIndex}`}
                              className="inline-block shrink-0"
                              style={{
                                width: `${cryptoBulletinChipSpaceWidthPx}px`,
                              }}
                              aria-hidden="true"
                            />
                          );
                        }

                        const rowCharacterIndex = rowTokens.slice(0, tokenIndex + 1).filter((candidateToken: string) => candidateToken !== " ").length - 1;
                        const globalCharacterIndex = rowStartCharacterIndex + rowCharacterIndex;
                        const isLightToken = globalCharacterIndex >= Math.max(0, cryptoBulletinChipCharacterCount - 2);
                        return (
                          <span
                            key={`crypto-bulletin-chip-${rowIndex}-${tokenIndex}`}
                            className={`inline-flex shrink-0 items-center justify-center rounded-full border text-center font-semibold ${isLightToken ? "border-white/75 bg-white text-zinc-950" : "border-zinc-200/40 bg-zinc-950/78 text-zinc-50"}`}
                            style={{
                              width: `${cryptoBulletinChipSizePx}px`,
                              height: `${cryptoBulletinChipSizePx}px`,
                              fontSize: `${cryptoBulletinChipFontSizePx}px`,
                              lineHeight: 1,
                            }}
                          >
                            {token}
                          </span>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
            <h3
              ref={cryptoBulletinTitlePreviewRef}
              className="mt-3 overflow-hidden whitespace-nowrap text-center text-white"
              style={{
                fontFamily: coverTitleStyle.fontFamily,
                fontSize: `${cryptoBulletinTitleRenderFontPx}px`,
                fontWeight: 900,
                lineHeight: 1.03,
                textShadow: "0 2px 12px rgba(0,0,0,0.72)",
              }}
            >
              {cryptoBulletinTitleSingleLine}
            </h3>
            <div className="mt-auto pb-1">
              <p
                ref={cryptoBulletinSubtitlePreviewRef}
                className="overflow-hidden whitespace-nowrap text-center"
                style={{
                  fontFamily: coverTitleStyle.fontFamily,
                  fontSize: `${cryptoBulletinSubtitleRenderFontPx}px`,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  textShadow: "0 2px 12px rgba(0,0,0,0.72)",
                }}
              >
                {cryptoBulletinSubtitleLead ? <span className="text-white">{cryptoBulletinSubtitleLead}</span> : null}
                <span className="mx-1 rounded-[3px] bg-amber-300 px-1 text-zinc-950">{cryptoBulletinSubtitleAccent || cryptoBulletinSubtitleSingleLine}</span>
              </p>
              <div className="mx-auto mt-1 h-px w-[84%] bg-white/55" />
              <p
                ref={cryptoBulletinMetaPreviewRef}
                className="mt-0.5 overflow-hidden whitespace-nowrap text-center text-amber-300"
                style={{
                  fontFamily: coverTitleStyle.fontFamily,
                  fontSize: `${cryptoBulletinMetaRenderFontPx}px`,
                  fontWeight: 900,
                  lineHeight: 1.12,
                  textShadow: "0 2px 14px rgba(0,0,0,0.75)",
                }}
              >
                {cryptoBulletinMetaSingleLine}
              </p>
            </div>
          </div>
        </div>
      ) : isWarningAlertCoverTemplate ? (
        <div
          className="relative overflow-hidden p-3"
          style={{
            aspectRatio: `${selectedPageScaleDimensions.width} / ${selectedPageScaleDimensions.height}`,
            backgroundColor: "#8ac641",
            backgroundImage: "linear-gradient(145deg, #a7d64c 0%, #8ac641 58%, #75af30 100%)",
          }}
        >
          {hasMissingRequiredCoverMedia ? <p className="absolute right-4 top-4 z-20 rounded-md bg-rose-500/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">Add required image</p> : null}
          <div className="relative h-full overflow-hidden rounded-[6px] border-[5px] border-white bg-zinc-100 shadow-[0_14px_34px_rgba(0,0,0,0.3)]">
            <div className="absolute inset-x-0 top-0 h-[66%] overflow-hidden bg-zinc-200">
              {coverPreviewPrimaryImageSrc ? <Image src={coverPreviewPrimaryImageSrc} alt="Warning alert cover image preview" fill className="object-cover" unoptimized /> : <div className="flex h-full items-center justify-center px-3 text-center text-xs font-medium uppercase tracking-wide text-zinc-700">Add a cover image</div>}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/16" />
            </div>
            <div className="absolute inset-x-0 bottom-0 z-10">
              <div className="absolute inset-y-0 right-0 w-3 bg-lime-400/95" />
              <div className="mr-3">
                <div className="border-y border-white/30 bg-red-600 px-3 py-1.5 shadow-[0_3px_10px_rgba(0,0,0,0.28)]">
                  <p
                    ref={warningAlertEyebrowPreviewRef}
                    className="overflow-hidden text-ellipsis whitespace-nowrap text-right uppercase"
                    style={{
                      fontFamily: coverEyebrowStyle.fontFamily,
                      fontSize: `${warningAlertEyebrowRenderFontPx}px`,
                      fontWeight: Math.max(700, coverEyebrowStyle.fontWeight),
                      color: "#ffffff",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {coverDesignerDraft.eyebrow.trim() || "THIS IS A WARNING"}
                  </p>
                </div>
                <div className="border-b border-white/12 bg-zinc-800/95 px-3 py-2 shadow-[0_3px_10px_rgba(0,0,0,0.32)]">
                  <h3
                    ref={warningAlertTitlePreviewRef}
                    className="overflow-hidden text-ellipsis whitespace-nowrap text-right"
                    style={{
                      fontFamily: coverTitleStyle.fontFamily,
                      fontSize: `${warningAlertTitleRenderFontPx}px`,
                      fontWeight: 900,
                      lineHeight: 1.05,
                      color: "#ffffff",
                    }}
                  >
                    {coverPreviewTitleSingleLine}
                  </h3>
                </div>
                <div className="border-b border-white/12 bg-zinc-900/95 px-3 py-2 shadow-[0_3px_10px_rgba(0,0,0,0.34)]">
                  <p
                    ref={warningAlertSubtitlePreviewRef}
                    className="overflow-hidden text-ellipsis whitespace-nowrap text-right"
                    style={{
                      fontFamily: coverSubtitleStyle.fontFamily,
                      fontSize: `${warningAlertSubtitleRenderFontPx}px`,
                      fontWeight: Math.max(700, coverSubtitleStyle.fontWeight),
                      lineHeight: 1.05,
                      color: "#ffffff",
                    }}
                  >
                    {coverPreviewSubtitleSingleLine}
                  </p>
                </div>
                <div className="flex h-[56px] flex-col justify-center border-t border-white/15 bg-zinc-950/96 px-3 py-1.5">
                  <p
                    ref={warningAlertMetaPreviewRef}
                    className="overflow-hidden text-ellipsis whitespace-nowrap text-right"
                    style={{
                      fontFamily: coverSubtitleStyle.fontFamily,
                      fontSize: `${warningAlertMetaRenderFontPx}px`,
                      fontWeight: 600,
                      color: "#d4d4d8",
                      opacity: 0.96,
                    }}
                  >
                    {coverPreviewMeta}
                  </p>
                  <p
                    ref={warningAlertHashtagsPreviewRef}
                    className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-right uppercase tracking-[0.02em]"
                    style={{
                      fontFamily: coverEyebrowStyle.fontFamily,
                      fontSize: `${warningAlertHashtagsRenderFontPx}px`,
                      fontWeight: 800,
                      color: "#ffffff",
                    }}
                  >
                    {coverPreviewHashtagsLine}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="relative flex h-full flex-col justify-between overflow-hidden p-4"
          style={{
            aspectRatio: `${selectedPageScaleDimensions.width} / ${selectedPageScaleDimensions.height}`,
            backgroundColor: selectedTemplate.pageBackgroundColor || "#ffffff",
            backgroundImage: coverPreviewPrimaryImageSrc ? undefined : "radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 60%), radial-gradient(100% 70% at 0% 100%, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 70%)",
          }}
        >
          {coverPreviewPrimaryImageSrc ? <Image src={coverPreviewPrimaryImageSrc} alt="Cover image preview" fill className="object-cover" unoptimized /> : null}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.06) 35%, rgba(0,0,0,0.45) 100%)",
            }}
          />
          {hasMissingRequiredCoverMedia ? <p className="absolute right-3 top-3 z-10 rounded-md bg-rose-500/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">Add required image</p> : null}
          <div className="relative z-10">
            <p
              className="mb-2 uppercase tracking-[0.14em]"
              style={{
                fontFamily: coverEyebrowStyle.fontFamily,
                fontSize: `${Math.max(11, Math.round(coverEyebrowStyle.fontSizePx * 0.7))}px`,
                fontWeight: coverEyebrowStyle.fontWeight,
                color: coverEyebrowStyle.color,
              }}
            >
              {coverDesignerDraft.eyebrow.trim() || "COVER STORY"}
            </p>
            <h3
              className="whitespace-pre-line break-words leading-tight"
              style={{
                fontFamily: coverTitleStyle.fontFamily,
                fontSize: `${Math.max(22, Math.round(coverTitleStyle.fontSizePx * 0.82))}px`,
                fontWeight: coverTitleStyle.fontWeight,
                color: coverTitleStyle.color,
              }}
            >
              {coverDesignerDraft.title.trim() || "Your Cover Title"}
            </h3>
            <p
              className="mt-3 whitespace-pre-line break-words"
              style={{
                fontFamily: coverSubtitleStyle.fontFamily,
                fontSize: `${Math.max(13, Math.round(coverSubtitleStyle.fontSizePx * 0.92))}px`,
                fontWeight: coverSubtitleStyle.fontWeight,
                color: coverSubtitleStyle.color,
              }}
            >
              {coverDesignerDraft.subtitle.trim() || "Draft a short hook for the first impression."}
            </p>
          </div>
          <div className="relative z-10 mt-auto rounded-xl border border-white/20 bg-black/40 px-3 py-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.3)] backdrop-blur-sm">
            <p
              className="whitespace-pre-line break-words"
              style={{
                fontFamily: coverSubtitleStyle.fontFamily,
                fontSize: "12px",
                fontWeight: 500,
                color: coverSubtitleStyle.color,
                opacity: 0.9,
              }}
            >
              {coverPreviewMeta}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {coverPreviewHashtagTokens.map((hashtag: string, hashtagIndex: number) => (
                <span key={`fallback-cover-footer-hashtag-${hashtagIndex}`} className="rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[10px] font-semibold tracking-[0.01em] text-white/95">
                  {hashtag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
