import type { ImageLoaderProps } from "next/image";

const PRIMARY_CDN_ORIGIN = "https://cdn.paragify.com";
const CDN_HOST_RE = /^https?:\/\/cdn(?:2|3)?\.paragify\.com\/?/i;

/**
 * Cloudflare image loader.
 * Next computes width from `sizes`; this loader maps source to Cloudflare CDN transforms.
 */
export default function cfImageLoader({ src, width, quality }: ImageLoaderProps): string {
	const absolute = src.startsWith("http")
		? src
		: `${PRIMARY_CDN_ORIGIN}${src.startsWith("/") ? "" : "/"}${src}`;
	const stripped = absolute.replace(CDN_HOST_RE, "");
	const q = quality ?? 75;
	return `${PRIMARY_CDN_ORIGIN}/cdn-cgi/image/width=${width},quality=${q},format=auto/${stripped}`;
}
