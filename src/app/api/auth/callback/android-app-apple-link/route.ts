function escapeHtmlAttribute(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const buttonUrl = new URL("/api/auth/callback/android-app-apple-link", requestUrl.origin);
	for (const [key, value] of requestUrl.searchParams.entries()) {
		buttonUrl.searchParams.set(key, value);
	}
	const buttonUrlHref = escapeHtmlAttribute(buttonUrl.toString());

	const html = `<!doctype html>
	<html lang="en">
	  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Continue in Paragify</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0b0c10; color: #e5e7eb; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
      .card { background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 24px 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.35); max-width: 420px; text-align: center; }
      h1 { font-size: 20px; margin: 0 0 10px; }
      p { margin: 0; color: #9ca3af; font-size: 14px; line-height: 1.5; }
    </style>
  </head>
  <body>
	    <div class="card">
	      <h1>Open the Paragify app to continue</h1>
	      <p>If the app doesn't open automatically, return to the Paragify app and retry sign in.</p>
	      <a href="${buttonUrlHref}"
	         style="display:inline-block;margin-top:16px;padding:10px 16px;border-radius:10px;background:#e5e7eb;color:#111827;text-decoration:none;">
	        Open Paragify app
	      </a>
    </div>
    <script>
      setTimeout(() => {
        window.location.href = window.location.href;
      }, 200);
    </script>
  </body>
</html>`;

	return new Response(html, {
		status: 200,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"cache-control": "no-store, no-cache, must-revalidate",
		},
	});
}
