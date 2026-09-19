"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { safeSearchReturn } from "@/lib/search-verification";

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
const getTurnstile = () => (window as unknown as { turnstile?: Turnstile }).turnstile;

export default function VerifySearchPage() {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [message, setMessage] = useState("Please verify to continue browsing. / 請完成驗證以繼續瀏覽。");
  const [canRetry, setCanRetry] = useState(false);
  const [retrySeconds, setRetrySeconds] = useState(0);
  useEffect(() => {
    if (retrySeconds <= 0) return;
    const timer = window.setTimeout(() => setRetrySeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [retrySeconds]);
  useEffect(() => {
    let disposed = false, submitting = false;
    const fail = (text: string) => {
      if (!disposed) { setMessage(text); setCanRetry(true); }
    };
    const render = () => {
      if (disposed || !container.current || !getTurnstile() || widget.current !== null) return;
      widget.current = getTurnstile()!.render(container.current, {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAACi4crFSvjiYhWN_",
        action: "public-search",
        callback: async (token: string) => {
          if (disposed || submitting) return;
          submitting = true;
          setCanRetry(false);
          setMessage("Checking verification… / 正在驗證…");
          try {
            const returnTo = safeSearchReturn(new URLSearchParams(window.location.search).get("returnTo"));
            const response = await fetch("/api/search-verification", {
              method: "POST", headers: { "content-type": "application/json" },
              body: JSON.stringify({ token, returnTo }), signal: AbortSignal.timeout(15000),
            });
            const result = await response.json() as { error?: string; returnTo?: string };
            if (disposed) return;
            if (response.status === 429) {
              const seconds = Number(response.headers.get("retry-after") || "60");
              setRetrySeconds(Number.isFinite(seconds) ? Math.min(300, Math.max(1, Math.ceil(seconds))) : 60);
            }
            if (!response.ok) throw new Error(result.error || "Verification failed. Please retry.");
            window.location.replace(safeSearchReturn(result.returnTo ?? null));
          } catch (error) {
            fail(error instanceof Error ? error.message : "Please retry verification.");
          } finally { submitting = false; }
        },
        "error-callback": () => { fail("Verification could not load. Please retry."); return true; },
        "expired-callback": () => fail("Verification expired. Please start a fresh challenge."),
      });
    };
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true; script.onload = render;
    script.onerror = () => fail("Verification could not load. Please retry.");
    if (getTurnstile()) render(); else document.head.appendChild(script);
    return () => {
      disposed = true;
      if (widget.current !== null) getTurnstile()?.remove(widget.current);
      widget.current = null;
      script.remove();
    };
  }, []);
  const retry = () => {
    if (retrySeconds > 0) return;
    setCanRetry(false);
    setMessage("Please complete the fresh challenge. / 請重新完成驗證。");
    if (widget.current !== null && getTurnstile()) getTurnstile()!.reset(widget.current);
    else window.location.reload();
  };
  return <main className="mx-auto max-w-xl p-8">
    <h1 className="text-2xl font-bold">Continue browsing / 繼續瀏覽</h1>
    <p role="status" className="my-4">{message}</p>
    <div ref={container} />
    {canRetry ? <button type="button" onClick={retry} disabled={retrySeconds > 0}
      className="mt-4 rounded border px-4 py-2 disabled:opacity-50">
      {retrySeconds > 0 ? "Retry in " + retrySeconds + "s" : "Retry verification / 重新驗證"}
    </button> : null}
    <Link className="mt-6 block underline" href="/">Return to homepage / 返回主頁</Link>
  </main>;
}
