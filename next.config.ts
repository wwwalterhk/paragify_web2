import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
	images: {
		loader: "custom",
		loaderFile: "./src/lib/cf-image-loader.ts",
		deviceSizes: [200, 320, 768, 1200, 1600, 1920],
		imageSizes: [128, 384],
		remotePatterns: [
			{ protocol: "https", hostname: "lh3.googleusercontent.com" },
			{ protocol: "https", hostname: "*.googleusercontent.com" },
			{ protocol: "https", hostname: "cdn.paragify.com" },
			{ protocol: "https", hostname: "cdn2.paragify.com" },
			{ protocol: "https", hostname: "cdn3.paragify.com" },
			{ protocol: "https", hostname: "*.paragify.com" },
		],
	},
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
if (process.env.NODE_ENV === "development") {
	void initOpenNextCloudflareForDev();
}
