import { NextResponse } from "next/server";

function buildRedirectUrl(request: Request, params: Record<string, string | null>) {
	const url = new URL(request.url);
	url.pathname = "/api/auth/callback/android-app-apple-link";
	url.search = "";
	for (const [key, value] of Object.entries(params)) {
		if (value) {
			url.searchParams.set(key, value);
		}
	}
	return url.toString();
}

export async function POST(request: Request) {
	const contentType = request.headers.get("content-type") || "";
	let code: string | null = null;
	let state: string | null = null;
	let error: string | null = null;
	let errorDescription: string | null = null;

	if (contentType.includes("application/x-www-form-urlencoded")) {
		const form = await request.formData().catch(() => null);
		if (form) {
			code = (form.get("code") as string | null) ?? null;
			state = (form.get("state") as string | null) ?? null;
			error = (form.get("error") as string | null) ?? null;
			errorDescription = (form.get("error_description") as string | null) ?? null;
		}
	} else {
		const body = (await request.json().catch(() => null)) as
			| { code?: unknown; state?: unknown; error?: unknown; error_description?: unknown }
			| null;
		if (body) {
			code = typeof body.code === "string" ? body.code : null;
			state = typeof body.state === "string" ? body.state : null;
			error = typeof body.error === "string" ? body.error : null;
			errorDescription = typeof body.error_description === "string" ? body.error_description : null;
		}
	}

	// Never log auth code/token values.
	if (error) {
		console.warn("apple-android callback error", { hasError: true });
	} else {
		console.info("apple-android callback received", {
			hasCode: Boolean(code),
			hasState: Boolean(state),
		});
	}

	const redirectUrl = buildRedirectUrl(request, {
		code,
		state,
		error,
		error_description: errorDescription,
	});

	return NextResponse.redirect(redirectUrl, { status: 302 });
}

export const GET = POST;
