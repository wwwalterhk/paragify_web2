/** Route browser feed clients to an interactive challenge, never to a server-provided URL. */
export function handleVerificationRequired(response: Response, data: { code?: string } | null): boolean {
  if (response.status !== 429 || data?.code !== "verification_required") return false;
  const returnTo = window.location.pathname + window.location.search;
  window.location.assign("/verify-search?returnTo=" + encodeURIComponent(returnTo));
  return true;
}
