import {
	ChatBubbleOvalLeftEllipsisIcon,
	PlusIcon,
	UserCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getFeedAvatarInitials } from "@/lib/feed-posts";

export async function SiteHeader() {
	const session = await getServerSession(authOptions);
	const sessionUser = session?.user as
		| {
				name?: string | null;
				email?: string | null;
				image?: string | null;
				avatar_url?: string | null;
		  }
		| undefined;

	const signedInName = sessionUser?.name?.trim() || sessionUser?.email?.trim() || "You";
	const signedInAvatar = sessionUser?.image || sessionUser?.avatar_url || null;
	const signedInInitials = getFeedAvatarInitials(signedInName);
	const profileHref = "/en/profile";
	const chatHref = "/chat/zh";
	const signInHref = "/auth/signin";

	return (
		<header
			className="sticky top-0 z-10 border-b backdrop-blur"
			style={{
				borderColor: "color-mix(in srgb, var(--surface-border) 85%, transparent)",
				backgroundColor: "color-mix(in srgb, var(--cell-1) 90%, transparent)",
			}}
		>
			<div className="mx-auto flex w-full max-w-xl items-center justify-between px-4 py-3">
				<Link href="/" className="rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-1)]">
					<h1 className="text-xl font-semibold tracking-tight text-[color:var(--txt-1)]">Paragify</h1>
					<p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--txt-3)]">
						Public Feed
					</p>
				</Link>
				<div className="flex items-center gap-3">
					{sessionUser ? (
						<>
							<Link
								href={profileHref}
								className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-2)] text-[11px] font-semibold text-[color:var(--txt-2)]"
								title={signedInName}
								aria-label={`${signedInName} avatar`}
							>
								{signedInAvatar ? (
									<img
										src={signedInAvatar}
										alt={`${signedInName} avatar`}
										className="h-full w-full object-cover"
										referrerPolicy="no-referrer"
									/>
								) : (
									signedInInitials
								)}
							</Link>
							<Link
								href={chatHref}
								className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-2)] text-[color:var(--txt-2)] hover:bg-[color:var(--cell-3)]"
								title="Chat"
								aria-label="Chat rooms"
							>
								<ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5" aria-hidden="true" />
							</Link>
						</>
					) : (
						<Link
							href={signInHref}
							className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-2)] text-[color:var(--txt-2)] hover:bg-[color:var(--cell-3)]"
							title="Sign in"
							aria-label="Sign in"
						>
							<UserCircleIcon className="h-5 w-5" aria-hidden="true" />
						</Link>
					)}
					<Link
						href="/add-post"
						className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-2)] text-[color:var(--txt-2)] hover:bg-[color:var(--cell-3)]"
						title="Create post"
						aria-label="Create post"
					>
						<PlusIcon className="h-5 w-5" aria-hidden="true" />
					</Link>
				</div>
			</div>
		</header>
	);
}
