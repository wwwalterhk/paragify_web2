import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: Request) {
	try {
		const key = new URL(request.url).searchParams.get("key");
		if (!key) {
			return new Response("Missing `key` query parameter.", { status: 400 });
		}

		const { env } = await getCloudflareContext({ async: true });
		const r2 = (env as CloudflareEnv & { R2?: R2Bucket }).R2;

		if (!r2) {
			return new Response("R2 binding `R2` is not configured.", { status: 500 });
		}

		const object = await r2.get(key);
		if (!object) {
			return new Response("Not found.", { status: 404 });
		}

		const headers = new Headers();
		headers.set("content-type", object.httpMetadata?.contentType ?? "application/octet-stream");
		headers.set(
			"cache-control",
			object.httpMetadata?.cacheControl ?? "public, max-age=31536000, immutable",
		);

		return new Response(object.body, { headers });
	} catch (error) {
		return new Response(
			error instanceof Error ? error.message : "Failed to fetch media object.",
			{ status: 500 },
		);
	}
}
