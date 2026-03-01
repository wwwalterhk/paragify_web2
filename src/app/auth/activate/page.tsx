"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

export const dynamic = "force-dynamic";

type ActivationState = "idle" | "success" | "error";

function ActivationLayout(props: { state: ActivationState; message: string; signInHref: string }) {
	const { state, message, signInHref } = props;
	const t = useTranslations("authActivate");

	const title = state === "success" ? t("titleSuccess") : state === "error" ? t("titleError") : t("titleIdle");

	return (
		<main className="min-h-screen text-[color:var(--txt-1)]">
			<div className="mx-auto max-w-5xl px-6 py-12 sm:px-10 sm:py-14 lg:px-16">
				<div className="mx-auto w-full max-w-md">
					<section className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-6 sm:p-8">
						<div className="space-y-4 text-center">
							<div className="inline-flex items-center justify-center">
								<span className="inline-flex items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--txt-3)]">
									{t("pill")}
								</span>
							</div>

							<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>

							<p className="text-sm leading-relaxed text-[color:var(--txt-2)]" aria-live="polite">
								{message}
							</p>

							<div className="pt-2 space-y-3">
								{state === "success" ? (
									<Link
										href={signInHref}
										className={[
											"inline-flex w-full items-center justify-center gap-2 rounded-full",
											"bg-[color:var(--accent-1)] px-5 py-3",
											"text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--on-accent-1)]",
											"transition hover:opacity-90",
											"focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-1)]/35",
										].join(" ")}
									>
										{t("ctaContinue")}
										<span aria-hidden>→</span>
									</Link>
								) : (
									<Link
										href={signInHref}
										className={[
											"inline-flex w-full items-center justify-center gap-2 rounded-full",
											"border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-5 py-3",
											"text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--txt-1)]",
											"transition hover:bg-[color:var(--cell-2)]",
											"focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-1)]/35",
										].join(" ")}
									>
										{t("ctaBack")}
									</Link>
								)}

								<Link
									href="/"
									className={[
										"inline-flex w-full items-center justify-center gap-2 rounded-full",
										"border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-5 py-3",
										"text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--txt-2)]",
										"transition hover:bg-[color:var(--cell-2)]",
										"focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-1)]/35",
									].join(" ")}
								>
									{t("ctaHome")}
								</Link>
							</div>

							{state === "error" ? (
								<div className="pt-3">
									<p className="text-xs leading-relaxed text-[color:var(--txt-3)]">
										{t("errorHint")}
									</p>
								</div>
							) : null}
						</div>
					</section>

					{state === "idle" ? (
						<p className="mt-5 text-center text-xs text-[color:var(--txt-3)]">
							{t("idleHint")}
						</p>
					) : null}
				</div>
			</div>
		</main>
	);
}

function ActivationInner() {
	const searchParams = useSearchParams();
	const locale = (searchParams.get("locale") || "").toLowerCase() === "en" ? "en" : "zh";
	const signInHref = `/auth/${locale}/signin`;
	const t = useTranslations("authActivate");

	const token = useMemo(() => searchParams.get("token"), [searchParams]);
	const email = useMemo(() => searchParams.get("email"), [searchParams]);

	const [state, setState] = useState<ActivationState>("idle");
	const [message, setMessage] = useState<string>(t("confirming"));

	useEffect(() => {
		if (!token || !email) {
			setState("error");
			setMessage(t("invalid"));
			return;
		}

		const run = async () => {
			try {
				const res = await fetch(
					`/api/auth/activate?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
					{
						method: "POST",
						cache: "no-store",
					}
				);

				const contentType = res.headers.get("content-type") || "";
				const data =
					contentType.includes("application/json")
						? ((await res.json()) as { ok?: boolean; message?: string } | null)
						: null;

				if (res.ok && data?.ok) {
					setState("success");
					setMessage(t("successBody"));
				} else {
					setState("error");
					setMessage(data?.message || t("failed"));
				}
			} catch {
				setState("error");
				setMessage(t("networkError"));
			}
		};

		void run();
	}, [token, email, t]);

	return <ActivationLayout state={state} message={message} signInHref={signInHref} />;
}

export default function ActivationPage() {
	return (
		<Suspense fallback={<ActivationLayout state="idle" message="Confirming your activation…" signInHref="/auth/zh/signin" />}>
			<ActivationInner />
		</Suspense>
	);
}
