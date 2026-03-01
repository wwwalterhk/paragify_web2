"use client";

import AppleSignInButton from "@/app/components/apple-signin-button";
import GoogleSignInButton from "@/app/components/google-signin-button";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useTranslations } from "next-intl";

type TurnstileApi = {
	render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; "error-callback": () => void; "expired-callback": () => void }) => string;
	reset: (id: string) => void;
};

export const dynamic = "force-dynamic";

export default function SignInPage() {
	return (
		<Suspense
			fallback={<SignInFallback />}
		>
			<SignInPageContent />
		</Suspense>
	);
}

function SignInFallback() {
	const t = useTranslations("authSign");
	return (
		<main className="min-h-screen text-[color:var(--txt-1)]">
			<div
				className="pointer-events-none fixed inset-0 -z-10"
				style={{
					backgroundColor: "var(--bg-1)",
					backgroundImage: "var(--page-bg-gradient)",
				}}
			/>
			<div className="mx-auto max-w-5xl px-6 py-16 sm:px-10 sm:py-20 lg:px-16">
				<div className="mx-auto max-w-md text-sm text-[color:var(--txt-2)]">{t("loading")}</div>
			</div>
		</main>
	);
}

function SignInPageContent() {
	const t = useTranslations("authSign");
	const [mode, setMode] = useState<"signin" | "register">("signin");
	const [loading, setLoading] = useState(false);

	const [formError, setFormError] = useState<string | null>(null);
	const [activationNotice, setActivationNotice] = useState<boolean>(false);
	const [emailInput, setEmailInput] = useState("");
	const [passwordInput, setPasswordInput] = useState("");
	const [resendMessage, setResendMessage] = useState<string | null>(null);
	const [resendLoading, setResendLoading] = useState(false);
	const [resendPopup, setResendPopup] = useState<{ text: string; tone: "success" | "error" } | null>(null);

	const [showForgot, setShowForgot] = useState(false);
	const [forgotEmail, setForgotEmail] = useState("");
	const [forgotCaptcha, setForgotCaptcha] = useState<string | null>(null);
	const [forgotMessage, setForgotMessage] = useState<string | null>(null);
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const [showChallenge, setShowChallenge] = useState(false);
	const [showForgotChallenge, setShowForgotChallenge] = useState(false);
	const [pendingForgot, setPendingForgot] = useState(false);
	const pendingRegisterRef = useRef<{ email: string; password: string } | null>(null);
	const bypassTurnstile = shouldBypassTurnstileClient();

	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const langFromPath = pathname?.includes("/auth/en") ? "en" : "zh";
	const legalPathPrefix = langFromPath === "en" ? "/en" : "/zh";
	const pathPrefix = langFromPath === "en" ? "/hk/en" : "/hk/zh";

	const errorParam = searchParams.get("error");
	const pageError = friendlyError(errorParam, t);
	const justRegisteredQuery = searchParams.get("activation") === "1";
	const pageActivation = isActivationMessage(errorParam);

	const noticeText = useMemo(() => {
		if (activationNotice || justRegisteredQuery || pageActivation) {
			return t("activationNotice");
		}
		return null;
	}, [activationNotice, justRegisteredQuery, pageActivation, t]);

	const alertText = useMemo(() => {
		return pageError || formError || null;
	}, [pageError, formError]);
	const callbackUrlParam = searchParams.get("callbackUrl");
	const callbackUrl = callbackUrlParam && callbackUrlParam.trim() ? callbackUrlParam : "/";
	const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);

	async function runAuth(email: string, password: string, tokenOverride?: string | null) {
		setLoading(true);
		setFormError(null);
		setActivationNotice(false);
		setForgotMessage(null);
		try {
			const result = await signIn("credentials", {
				redirect: false,
				email,
				password,
				callbackUrl: "/?activation=1",
				mode,
				captcha: "",
				turnstile_token: tokenOverride ?? turnstileToken ?? undefined,
				locale: langFromPath,
			});

			if (result?.error) {
				const friendly = friendlyError(result.error, t);
				const activation = isActivationMessage(result.error);
				const alreadyRegistered = isAlreadyRegisteredMessage(result.error);

				if (activation) {
					setActivationNotice(true);
					setFormError(null);
				} else if (mode === "register" && alreadyRegistered) {
					setFormError(t("errorAlreadyRegistered"));
				} else {
					setFormError(friendly);
				}

				setLoading(false);
				return;
			}

			const nextUrl = result?.url || "/";
			router.replace(nextUrl);
			router.refresh();
		} catch (err) {
			setFormError(typeof err === "string" ? err : t("errorSignInFailed"));
			setLoading(false);
		} finally {
			pendingRegisterRef.current = null;
			setShowChallenge(false);
			if (mode === "register") setTurnstileToken(null);
		}
	}

	useEffect(() => {
		// If user switches mode, keep the experience calm and avoid stale states.
		setFormError(null);
		setActivationNotice(false);
	}, [mode]);

	useEffect(() => {
		if (!turnstileToken || !pendingRegisterRef.current || bypassTurnstile) return;
		const { email, password } = pendingRegisterRef.current;
		pendingRegisterRef.current = null;
		void runAuth(email, password, turnstileToken);
	}, [turnstileToken, bypassTurnstile]);

	useEffect(() => {
		if (!pendingForgot || !forgotCaptcha || bypassTurnstile) return;
		setPendingForgot(false);
		void runForgot(forgotCaptcha);
	}, [pendingForgot, forgotCaptcha, bypassTurnstile]);

	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setFormError(null);
		setActivationNotice(false);
		setForgotMessage(null);

		const form = e.currentTarget;
		const email = emailInput || (form.elements.namedItem("email") as HTMLInputElement | null)?.value || "";
		const password = passwordInput || (form.elements.namedItem("password") as HTMLInputElement | null)?.value || "";

		if (mode === "register" && !bypassTurnstile && !turnstileToken) {
			pendingRegisterRef.current = { email, password };
			setShowChallenge(true);
			return;
		}

		try {
			await runAuth(email, password, turnstileToken);
		} catch {
			// errors handled in runAuth
		}
	}

	async function runForgot(tokenOverride?: string | null) {
		setForgotMessage(null);
		setFormError(null);
		setActivationNotice(false);
		setLoading(true);
		try {
			const res = await fetch("/api/auth/reset/request", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: forgotEmail,
					captcha: tokenOverride ?? forgotCaptcha ?? "",
				}),
			});

			const data = (await res.json()) as { ok?: boolean; message?: string } | null;
			if (res.ok && data?.ok) {
				setForgotMessage(t("resetSent"));
			} else {
				setFormError(data?.message || t("resetFailed"));
			}
		} catch (err) {
			setFormError(typeof err === "string" ? err : t("resetFailed"));
		} finally {
			setLoading(false);
			setShowForgotChallenge(false);
			setPendingForgot(false);
			setForgotCaptcha(null); 
		}
	}

	return (
		<main className="min-h-screen text-[color:var(--txt-1)]">
			{resendPopup ? (
				<div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-4 py-3 shadow-md">
					<div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--txt-3)]">
						{resendPopup.tone === "success" ? t("popupSuccess") : t("popupNotice")}
					</div>
					<div className="mt-1 text-sm text-[color:var(--txt-1)]">{resendPopup.text}</div>
				</div>
			) : null}
			<div
				className="pointer-events-none fixed inset-0 -z-10"
				style={{
					backgroundColor: "var(--bg-1)",
					backgroundImage: "var(--page-bg-gradient)",
				}}
			/>

			<div className="mx-auto max-w-5xl px-6 py-16 sm:px-10 sm:py-20 lg:px-16">
				<div className="mx-auto w-full max-w-md space-y-6">
					<header className="space-y-3 text-center">
							<div className="inline-flex items-center justify-center">
								<span className="inline-flex items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--txt-3)]">
								{t("accountPill")}
								</span>
							</div>

						<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
							{mode === "signin" ? t("titleSignIn") : t("titleRegister")}
						</h1>

						<p className="text-sm leading-relaxed text-[color:var(--txt-2)]">
							{t("subtitle")}
						</p>
					</header>

					{mode === "register" && noticeText ? (
						<Callout title={t("activationTitle")} tone="notice">
							<div className="space-y-2">
								<div>{noticeText}</div>
								<div className="flex flex-wrap items-center gap-2 text-[12px] text-[color:var(--txt-2)]">
									<button
										type="button"
										disabled={resendLoading}
										onClick={async () => {
											if (!emailInput) {
												setFormError(t("resendEmailMissing"));
												return;
											}
											setResendMessage(null);
											setFormError(null);
											setResendLoading(true);
											try {
											const res = await fetch("/api/auth/resend-activation", {
												method: "POST",
												headers: { "Content-Type": "application/json" },
												body: JSON.stringify({ email: emailInput }),
											});
											const data = (await res.json()) as { ok?: boolean; message?: string } | null;
											const msg = data?.message || (res.ok ? t("resendSuccessFallback") : t("resendFailedFallback"));
											if (res.ok && data?.ok) {
												setResendMessage(msg);
											} else {
												setFormError(msg);
											}
											if (msg) {
												setResendPopup({ text: msg, tone: res.ok && data?.ok ? "success" : "error" });
												setTimeout(() => setResendPopup(null), 4000);
											}
										} catch (err) {
											setFormError(String(err));
											setResendPopup({ text: String(err), tone: "error" });
											setTimeout(() => setResendPopup(null), 4000);
										} finally {
											setResendLoading(false);
										}
									}}
										className="inline-flex items-center gap-1 rounded-full border border-[color:var(--accent-1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-1)] transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-70"
									>
										{resendLoading ? t("resendSending") : t("resendAction")}
									</button>
									{resendMessage ? <span className="text-emerald-700">{resendMessage}</span> : null}
								</div>
								<p className="text-[11px] text-[color:var(--txt-3)]">{t("resendHint")}</p>
							</div>
						</Callout>
					) : null}

					{!noticeText && alertText ? (
						<Callout title={t("signinIssueTitle")} tone="error">
							{alertText}
						</Callout>
					) : null}

					<section className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-6 sm:p-8">
						{/* Social */}
						<div className="space-y-3 text-center">
							<div className="inline-flex flex-col items-center gap-3">
								<GoogleSignInButton
									callbackUrl={callbackUrl}
									loading={socialLoading === "google"}
									label={t("googleLabel")}
									loadingLabel={t("googleLoading")}
									onClick={() => setSocialLoading("google")}
								/>
								<AppleSignInButton
									label={t("appleLabel")}
									loading={socialLoading === "apple"}
									loadingLabel={t("appleLoading")}
									onClick={() => setSocialLoading("apple")}
								/>
							</div>
						</div>

						{/* Divider */}
						<div className="my-6 flex items-center gap-3">
							<div className="h-px flex-1 bg-[color:var(--surface-border)]" />
							<div className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--txt-3)]">
								{t("dividerEmail")}
							</div>
							<div className="h-px flex-1 bg-[color:var(--surface-border)]" />
						</div>

						{/* Mode switch */}
						<div className="mb-5">
							<div className="relative inline-flex w-full rounded-full border border-[color:var(--surface-border)] bg-[color:var(--bg-2)] p-1 sign-type-selector">
								<div
									aria-hidden
									className="pointer-events-none absolute inset-y-1 rounded-full bg-[color:var(--accent-1)] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.55)] transition-all duration-200 ease-out"
									style={{
										left: mode === "signin" ? "0.25rem" : "calc(50% + 0.25rem)",
										width: "calc(50% - 0.25rem)",
									}}
								/>
								<button
									type="button"
									aria-pressed={mode === "signin"}
									onClick={() => setMode("signin")}
									className={[
										"relative z-10 flex-1 rounded-full px-4 py-2",
										"text-[11px] font-semibold uppercase tracking-[0.22em]",
										"transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-1)]/35",
										mode === "signin"
											? "text-[color:var(--on-accent-1)]"
											: "text-[color:var(--txt-3)] hover:bg-[color:var(--cell-2)]",
									].join(" ")}
									disabled={loading}
								>
									{t("modeSignIn")}
								</button>
								<button
									type="button"
									aria-pressed={mode === "register"}
									onClick={() => setMode("register")}
									className={[
										"relative z-10 flex-1 rounded-full px-4 py-2",
										"text-[11px] font-semibold uppercase tracking-[0.22em]",
										"transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-1)]/35",
										mode === "register"
											? "text-[color:var(--on-accent-1)]"
											: "text-[color:var(--txt-3)] hover:bg-[color:var(--cell-2)]",
									].join(" ")}
									disabled={loading}
								>
									{t("modeRegister")}
								</button>
							</div>

							{mode === "register" ? (
								<p className="mt-3 text-xs leading-relaxed text-[color:var(--txt-3)]">
									{t("registerNote")}
								</p>
							) : null}
						</div>

						{/* Email form */}
						<form className="space-y-4" onSubmit={handleSubmit}>
							<Field label={t("fieldEmail")}>
								<input
								type="email"
								name="email"
								required
								autoComplete="email"
								value={emailInput}
								onChange={(e) => setEmailInput(e.target.value)}
								className={[
									"mt-1 w-full rounded-2xl border border-[color:var(--surface-border)]",
									"bg-[color:var(--cell-1)] px-4 py-3",
									"text-sm text-[color:var(--txt-1)] outline-none",
									"transition focus:border-[color:var(--accent-1)] focus:ring-2 focus:ring-[color:var(--accent-1)]/25",
									].join(" ")}
									placeholder={t("placeholderEmail")}
									disabled={loading}
								/>
							</Field>

							<Field label={t("fieldPassword")}>
								<input
								type="password"
								name="password"
								required
								autoComplete={mode === "signin" ? "current-password" : "new-password"}
								value={passwordInput}
								onChange={(e) => setPasswordInput(e.target.value)}
								className={[
									"mt-1 w-full rounded-2xl border border-[color:var(--surface-border)]",
									"bg-[color:var(--cell-1)] px-4 py-3",
									"text-sm text-[color:var(--txt-1)] outline-none",
									"transition focus:border-[color:var(--accent-1)] focus:ring-2 focus:ring-[color:var(--accent-1)]/25",
									].join(" ")}
									placeholder={mode === "signin" ? t("placeholderPassword") : t("placeholderPasswordNew")}
									disabled={loading}
								/>
							</Field>

							<button
								type="submit"
								disabled={loading}
								className={[
									"mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full",
									"bg-[color:var(--accent-1)] px-5 py-3",
									"text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--on-accent-1)]",
									"transition hover:opacity-90",
								"focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-1)]/35",
								"disabled:cursor-not-allowed disabled:opacity-60",
							].join(" ")}
							>
								{loading
									? mode === "signin"
										? t("submitSigningIn")
										: t("submitCreating")
									: mode === "signin"
										? t("submitSignIn")
										: t("submitRegister")}
							</button>
						</form>

						{/* Forgot password */}
						{mode === "signin" ? (
						<div className="mt-6">
							<button
								type="button"
								onClick={() => {
									setShowForgot((v) => !v);
									setForgotMessage(null);
									setFormError(null);
								}}
								className="w-full text-center text-sm font-semibold text-[color:var(--txt-2)] underline-offset-4 hover:underline"
								disabled={loading}
							>
								{t("forgotToggle")}
							</button>

							{showForgot ? (
								<form
									className="mt-4 space-y-3 rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--bg-2)] p-4"
									onSubmit={async (e) => {
										e.preventDefault();
										setForgotMessage(null);
										setFormError(null);
										setActivationNotice(false);

										if (!bypassTurnstile && !forgotCaptcha) {
											setPendingForgot(true);
											setShowForgotChallenge(true);
											return;
										}

										await runForgot(forgotCaptcha);
									}}
								>
									<Field label={t("resetEmailLabel")}>
										<input
											type="email"
											required
											value={forgotEmail}
											onChange={(e) => setForgotEmail(e.target.value)}
											className={[
												"mt-1 w-full rounded-2xl border border-[color:var(--surface-border)]",
												"bg-[color:var(--cell-1)] px-4 py-3",
												"text-sm text-[color:var(--txt-1)] outline-none",
												"transition focus:border-[color:var(--accent-1)] focus:ring-2 focus:ring-[color:var(--accent-1)]/25",
											].join(" ")}
											placeholder={t("placeholderEmail")}
											disabled={loading}
										/>
									</Field>

									<button
										type="submit"
										disabled={loading}
										className={[
											"inline-flex w-full items-center justify-center gap-2 rounded-full",
											"border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-5 py-3",
											"text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--txt-1)]",
											"transition hover:bg-[color:var(--cell-2)]",
											"focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-1)]/35",
											"disabled:cursor-not-allowed disabled:opacity-60",
										].join(" ")}
									>
										{loading ? t("resendSending") : t("resetSend")}
									</button>

									{forgotMessage ? (
										<div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-4 py-3 text-sm text-[color:var(--txt-2)]">
											{forgotMessage}
										</div>
									) : null}
								</form>
							) : null}
						</div>
						) : null}

						{/* Legal */}
						<div className="mt-6 border-t border-[color:var(--surface-border)] pt-5">
							<p className="text-xs leading-relaxed text-[color:var(--txt-3)]">
								{t("legalPrefix")}{" "}
								<Link href={`${legalPathPrefix}/privacy-policy`} className="font-semibold text-[color:var(--txt-2)] underline-offset-2 hover:underline">
									{t("legalPrivacy")}
								</Link>{" "}
								{t("legalAnd")}{" "}
								<Link href={`${legalPathPrefix}/terms`} className="font-semibold text-[color:var(--txt-2)] underline-offset-2 hover:underline">
									{t("legalTerms")}
								</Link>
								.
							</p>

							<div className="mt-4 text-xs text-[color:var(--txt-3)]">
								{t("helpPrompt")}{" "}
								<Link href={`${pathPrefix}/about`} className="font-semibold text-[color:var(--txt-2)] underline-offset-2 hover:underline">
									{t("helpContact")}
								</Link>
								.
							</div>
						</div>
					</section>

					<div className="text-center">
						<Link
							href="/"
							className={[
								"inline-flex items-center gap-2 rounded-full",
								"border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-5 py-2.5",
								"text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--txt-2)]",
								"transition hover:bg-[color:var(--cell-2)]",
								"focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-1)]/35",
							].join(" ")}
						>
							<span aria-hidden>←</span> {t("backHome")}
						</Link>
					</div>

					<p className="text-center text-xs leading-relaxed text-[color:var(--txt-3)]">
						{t("footerNote")}
					</p>
				</div>
			</div>

			{showChallenge ? (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
					<div className="w-full max-w-xs rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-4 shadow-[var(--shadow-elev-3)]">
						<div className="text-sm font-semibold text-[color:var(--txt-1)]">{t("challengeTitle")}</div>
						<div className="mt-2 text-xs text-[color:var(--txt-3)]">{t("challengeDesc")}</div>
						<div className="mt-3">
							<TurnstileWidget onToken={setTurnstileToken} variant="inline" />
						</div>
						<div className="mt-4 flex justify-end gap-2">
							<button
								type="button"
								className="rounded-full border border-[color:var(--surface-border)] px-3 py-1 text-xs font-semibold text-[color:var(--txt-2)] hover:bg-[color:var(--cell-2)]"
								onClick={() => {
									setShowChallenge(false);
									pendingRegisterRef.current = null;
									setTurnstileToken(null);
								}}
							>
								{t("challengeCancel")}
							</button>
						</div>
					</div>
				</div>
			) : null}

			{showForgotChallenge ? (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
					<div className="w-full max-w-xs rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-4 shadow-[var(--shadow-elev-3)]">
						<div className="text-sm font-semibold text-[color:var(--txt-1)]">{t("challengeTitle")}</div>
						<div className="mt-2 text-xs text-[color:var(--txt-3)]">{t("challengeDesc")}</div>
						<div className="mt-3">
							<TurnstileWidget onToken={setForgotCaptcha} variant="inline" />
						</div>
						<div className="mt-4 flex justify-end gap-2">
							<button
								type="button"
								className="rounded-full border border-[color:var(--surface-border)] px-3 py-1 text-xs font-semibold text-[color:var(--txt-2)] hover:bg-[color:var(--cell-2)]"
								onClick={() => {
									setShowForgotChallenge(false);
									setPendingForgot(false);
									setForgotCaptcha(null);
								}}
							>
								{t("challengeCancel")}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</main>
	);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<label className="block text-left">
			<div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--txt-3)]">{label}</div>
			{children}
		</label>
	);
}

function Callout({
	title,
	children,
	tone,
}: {
	title: string;
	children: React.ReactNode;
	tone: "notice" | "error";
}) {
	const bg = tone === "notice" ? "var(--accent-3)" : "var(--bg-2)";
	return (
		<div
			className="rounded-2xl border border-[color:var(--surface-border)] px-4 py-3 text-sm text-[color:var(--txt-2)]"
			style={{ backgroundColor: bg }}
		>
			<div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--txt-3)]">{title}</div>
			<div className="mt-1">{children}</div>
		</div>
	);
}

function TurnstileWidget({ onToken, label, variant = "card" }: { onToken: (token: string | null) => void; label?: string; variant?: "card" | "inline" }) {
	const [scriptLoaded, setScriptLoaded] = useState(false);
	const widgetRef = useRef<HTMLDivElement | null>(null);
	const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAACi4crFSvjiYhWN_";

	useEffect(() => {
		if (typeof window === "undefined") return;
		const win = window as unknown as { turnstile?: TurnstileApi };
		if (win.turnstile) {
			setScriptLoaded(true);
			return;
		}
		const script = document.createElement("script");
		script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
		script.async = true;
		script.onload = () => setScriptLoaded(true);
		document.head.appendChild(script);
	}, []);

	useEffect(() => {
		const ts = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
		if (!scriptLoaded || !ts || !widgetRef.current) return;
		const id = ts.render(widgetRef.current, {
			sitekey: siteKey,
			callback: (token: string) => onToken(token),
			"error-callback": () => onToken(null),
			"expired-callback": () => onToken(null),
		});
		return () => {
			try {
				ts.reset(id);
			} catch {
				// ignore
			}
		};
	}, [scriptLoaded, siteKey, onToken]);

	if (variant === "inline") {
		return (
			<div className="flex justify-center">
				<div ref={widgetRef} />
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--bg-2)] p-4">
			<div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--txt-3)]">{label || "Security check"}</div>
			<div className="mt-3 flex justify-center">
				<div ref={widgetRef} />
			</div>
		</div>
	);
}

function shouldBypassTurnstileClient(): boolean {
	if (typeof window !== "undefined") {
		const hostname = window.location.hostname.toLowerCase();
		const isLocalHost =
			hostname === "localhost" ||
			hostname === "127.0.0.1" ||
			hostname === "::1" ||
			hostname.endsWith(".localhost");
		if (!isLocalHost) {
			return false;
		}
	}

	const bypassFlag = process.env.NEXT_PUBLIC_BYPASS_TURNSTILE;
	if (bypassFlag === "1") {
		return true;
	}
	if (bypassFlag === "0") {
		return false;
	}

	if (process.env.NODE_ENV !== "production") {
		return true;
	}

	return false;
}

function friendlyError(code?: string | null, t?: (key: string) => string): string | null {
	if (!code) return null;
	const normalized = code.toLowerCase();
	if (normalized.includes("activation")) return t ? t("errorActivation") : "Activation required. Check your email for the activation link.";
	if (normalized.includes("credentials")) return t ? t("errorCredentials") : "Email or password is incorrect.";
	if (normalized.includes("captcha")) return t ? t("errorCaptcha") : "Security check failed. Please enter the correct value.";
	if (
		normalized.includes("unique constraint") ||
		normalized.includes("conflict") ||
		normalized.includes("already registered")
	)
		return t ? t("errorRegistered") : "Email is already registered.";
	if (normalized.includes("accessdenied")) return t ? t("errorCancelled") : "Sign-in was cancelled.";
	if (normalized.includes("configuration")) return t ? t("errorUnavailable") : "Sign-in is temporarily unavailable. Please try again later.";
	return code;
}

function isActivationMessage(message?: string | null): boolean {
	return typeof message === "string" && message.toLowerCase().includes("activation");
}

function isAlreadyRegisteredMessage(message?: string | null): boolean {
	if (typeof message !== "string") return false;
	const normalized = message.toLowerCase();
	return normalized.includes("already registered") || normalized.includes("unique constraint") || normalized.includes("conflict");
}
