"use client";

import { useEffect, useRef, useState } from "react";
import { safeSearchReturn } from "@/lib/search-verification";

type Turnstile = {
	render: (element: HTMLElement, options: Record<string, unknown>) => string;
	remove: (id: string) => void;
};

export default function VerifySearchPage() {
	const container = useRef<HTMLDivElement>(null);
	const [message, setMessage] = useState("Please verify to continue browsing. / 請完成驗證以繼續瀏覽。");

	useEffect(() => {
		let disposed = false;
		let widget: string | undefined;
		const getTurnstile = () => (window as unknown as { turnstile?: Turnstile }).turnstile;
		const render = () => {
			if (disposed || !container.current || !getTurnstile() || widget) return;
			widget = getTurnstile()!.render(container.current, {
				sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAACi4crFSvjiYhWN_",
				action: "public-search",
				callback: async (token: string) => {
					try {
						const returnTo = safeSearchReturn(new URLSearchParams(window.location.search).get("returnTo"));
						const response = await fetch("/api/search-verification", {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ token, returnTo }),
						});
						const result = await response.json() as { error?: string; returnTo?: string };
						if (!response.ok) throw new Error(result.error || "Verification failed. Please reload and retry.");
						window.location.replace(safeSearchReturn(result.returnTo ?? null));
					} catch (error) {
						setMessage(error instanceof Error ? error.message : "Please reload and retry.");
					}
				},
				"error-callback": () => setMessage("Verification could not load. Please reload and retry."),
				"expired-callback": () => setMessage("Verification expired. Please complete it again."),
			});
		};
		const script = document.createElement("script");
		script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
		script.async = true;
		script.onload = render;
		script.onerror = () => setMessage("Verification could not load. Please reload and retry.");
		if (getTurnstile()) render(); else document.head.appendChild(script);
		return () => {
			disposed = true;
			if (widget) getTurnstile()?.remove(widget);
			script.remove();
		};
	}, []);

	return <main className="mx-auto max-w-xl p-8">
		<h1 className="text-2xl font-bold">Continue browsing / 繼續瀏覽</h1>
		<p role="status" className="my-4">{message}</p>
		<div ref={container} />
		<a className="mt-6 block underline" href="/">Return to homepage / 返回主頁</a>
	</main>;
}
