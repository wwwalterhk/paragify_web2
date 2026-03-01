import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
	"image/avif": "avif",
	"image/gif": "gif",
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/svg+xml": "svg",
	"image/webp": "webp",
};

function resolveImageExtension(contentType: string): string {
	return IMAGE_EXTENSION_BY_MIME[contentType] ?? "img";
}

function createStorageKey(contentType: string): string {
	const extension = resolveImageExtension(contentType);
	const dateSegment = new Date().toISOString().slice(0, 10);
	return `post-pages/${dateSegment}/${crypto.randomUUID()}.${extension}`;
}

export async function POST(request: Request) {
	try {
		const formData = await request.formData();
		const file = formData.get("file");

		if (!(file instanceof File)) {
			return NextResponse.json({ error: "A `file` field is required." }, { status: 400 });
		}

		if (!file.type.startsWith("image/")) {
			return NextResponse.json({ error: "Only image uploads are supported." }, { status: 400 });
		}

		if (file.size <= 0) {
			return NextResponse.json({ error: "Uploaded image is empty." }, { status: 400 });
		}

		if (file.size > MAX_IMAGE_BYTES) {
			return NextResponse.json(
				{ error: `Image is too large. Max size is ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.` },
				{ status: 400 },
			);
		}

		const { env } = await getCloudflareContext({ async: true });
		const r2 = (env as CloudflareEnv & { R2?: R2Bucket }).R2;

		if (!r2) {
			return NextResponse.json({ error: "R2 binding `R2` is not configured." }, { status: 500 });
		}

		const key = createStorageKey(file.type);
		const buffer = await file.arrayBuffer();

		await r2.put(key, buffer, {
			httpMetadata: {
				contentType: file.type,
				cacheControl: "public, max-age=31536000, immutable",
			},
		});

		return NextResponse.json({
			ok: true,
			media_type: "image",
			raw_media_url: key,
			media_url: `/api/media?key=${encodeURIComponent(key)}`,
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Failed to upload image.",
			},
			{ status: 500 },
		);
	}
}
