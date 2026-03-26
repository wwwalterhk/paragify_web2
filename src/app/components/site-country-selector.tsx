"use client";

import { CheckIcon } from "@heroicons/react/20/solid";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
	DEFAULT_POST_COUNTRY_CODE,
	getPostCountryFlag,
	getPostCountryLabel,
	POST_COUNTRY_FILTER_OPTIONS,
	readPostCountryParam,
	type PostCountryCode,
} from "@/lib/post-country-filter";

function buildCountrySelectorHref(
	pathname: string | null,
	searchParams: URLSearchParams,
	countryCode: PostCountryCode,
): string {
	const nextParams = pathname === "/" ? new URLSearchParams(searchParams.toString()) : new URLSearchParams();
	if (pathname !== "/") {
		const locale = searchParams.get("locale");
		if (locale) {
			nextParams.set("locale", locale);
		}
	}

	nextParams.delete("page");
	if (countryCode === DEFAULT_POST_COUNTRY_CODE) {
		nextParams.delete("country");
	} else {
		nextParams.set("country", countryCode);
	}

	const query = nextParams.toString();
	return query ? `/?${query}` : "/";
}

export function SiteCountrySelector() {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const menuId = useId();
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [isPending, startTransition] = useTransition();
	const [isOpen, setIsOpen] = useState(false);
	const selectedCountry = readPostCountryParam(searchParams.get("country") ?? undefined);
	const selectedFlag = getPostCountryFlag(selectedCountry);
	const selectedLabel = getPostCountryLabel(selectedCountry);

	useEffect(() => {
		if (!isOpen) {
			return undefined;
		}

		function handlePointerDown(event: MouseEvent) {
			if (!containerRef.current?.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		}

		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				aria-label={`Selected country: ${selectedLabel}`}
				aria-haspopup="menu"
				aria-expanded={isOpen}
				aria-controls={menuId}
				disabled={isPending}
				onClick={() => {
					setIsOpen((currentValue) => !currentValue);
				}}
				className="flex h-9 w-9 items-center justify-center rounded-full border text-sm transition-colors hover:bg-[color:var(--cell-3)]"
				style={{
					backgroundColor: "color-mix(in srgb, var(--cell-2) 92%, transparent)",
					borderColor: "color-mix(in srgb, var(--surface-border) 82%, transparent)",
					color: "var(--txt-1)",
					opacity: isPending ? 0.8 : 1,
				}}
				title={selectedLabel}
			>
				<span className="text-base leading-none" aria-hidden="true">
					{selectedFlag}
				</span>
			</button>

			{isOpen ? (
				<div
					id={menuId}
					role="menu"
					aria-label="Select post country filter"
					className="absolute right-0 top-[calc(100%+0.65rem)] z-20 min-w-[15rem] overflow-hidden rounded-[1.1rem] border p-2 shadow-lg"
					style={{
						backgroundColor: "color-mix(in srgb, var(--cell-1) 98%, transparent)",
						borderColor: "color-mix(in srgb, var(--surface-border) 88%, transparent)",
						boxShadow: "var(--shadow-elev-2)",
					}}
				>
					<div className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--txt-3)]">
						Country
					</div>
					<div className="flex flex-col gap-1">
						{POST_COUNTRY_FILTER_OPTIONS.map((option) => {
							const isSelected = option.code === selectedCountry;
							return (
								<button
									key={option.code}
									type="button"
									role="menuitemradio"
									aria-checked={isSelected}
									onClick={() => {
										const nextHref = buildCountrySelectorHref(pathname, new URLSearchParams(searchParams.toString()), option.code);
										setIsOpen(false);
										startTransition(() => {
											router.push(nextHref);
										});
									}}
									className="flex items-center justify-between gap-3 rounded-[0.95rem] px-3 py-2.5 text-left transition-colors hover:bg-[color:var(--cell-3)]"
									style={{
										backgroundColor: isSelected
											? "color-mix(in srgb, var(--accent-1) 10%, transparent)"
											: "transparent",
										color: isSelected ? "var(--accent-1)" : "var(--txt-1)",
									}}
								>
									<span className="flex items-center gap-3">
										<span className="text-base leading-none" aria-hidden="true">
											{option.flag}
										</span>
										<span className="text-sm font-medium">{option.label}</span>
									</span>
									{isSelected ? <CheckIcon className="h-4 w-4" aria-hidden="true" /> : null}
								</button>
							);
						})}
					</div>
				</div>
			) : null}
		</div>
	);
}
