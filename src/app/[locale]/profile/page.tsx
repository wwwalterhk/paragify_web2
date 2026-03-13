import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { authOptions } from "@/lib/auth-options";
import ProfileSignOutButton from "@/app/components/profile-signout-button";

type DbBindings = CloudflareEnv & { DB?: D1Database };

type PageProps = {
	params: Promise<{ locale: string }>;
};

type UserRow = {
	user_pk: number;
	user_id: string | null;
	email: string;
	name: string | null;
	avatar_url: string | null;
	role: string | null;
};

type PostRow = {
	post_id: number;
	post_slug: string | null;
	title: string | null;
	caption: string | null;
	created_at: string | null;
	like_count: number | null;
	comment_count: number | null;
	cover_media_url: string | null;
};

type ProfileCopy = {
	metaTitle: string;
	metaDescription: string;
	pill: string;
	title: string;
	subtitle: string;
	backHome: string;
	createPost: string;
	email: string;
	handle: string;
	name: string;
	noName: string;
	noAvatar: string;
	yourPosts: string;
	noPosts: string;
	likes: string;
	comments: string;
	signOut: string;
	adminPostPreparation: string;
	dangerZone: string;
	updateUserIdIntro: string;
	updateUserId: string;
	deleteIntro: string;
	deleteHelpLink: string;
	deleteAccount: string;
	userNotFound: string;
	dbUnavailable: string;
};

const IMAGE_CDN_PRIMARY = "https://cdn.paragify.com";
const IMAGE_CDN_HOSTNAMES = new Set(["cdn.paragify.com", "cdn2.paragify.com"]);
const PROFILE_COVER_TRANSFORM_OPTIONS = "width=640,height=800,fit=cover,quality=82,format=auto";

const copy: Record<"en" | "zh", ProfileCopy> = {
	en: {
		metaTitle: "Profile | Paragify",
		metaDescription: "Manage your Paragify profile and view your posts.",
		pill: "Profile",
		title: "Your Account",
		subtitle: "Manage account details and review your recent posts.",
		backHome: "Back to home",
		createPost: "Create post",
		email: "Email",
		handle: "Handle",
		name: "Display name",
		noName: "No name set",
		noAvatar: "No avatar",
		yourPosts: "Your posts",
		noPosts: "No posts yet.",
		likes: "likes",
		comments: "comments",
		signOut: "Sign out",
		adminPostPreparation: "Post preparation",
		dangerZone: "Danger zone",
		updateUserIdIntro: "Change your public user ID. This updates your public profile URL.",
		updateUserId: "Update public ID",
		deleteIntro: "Permanently delete your 328car account. This cannot be undone and you will be signed out.",
		deleteHelpLink: "Account deletion help",
		deleteAccount: "Delete account",
		userNotFound: "User not found.",
		dbUnavailable: "DB unavailable",
	},
	zh: {
		metaTitle: "個人檔案 | Paragify",
		metaDescription: "管理你的 Paragify 帳戶並查看你的帖文。",
		pill: "個人檔案",
		title: "你的帳戶",
		subtitle: "管理帳戶資料，查看最近帖文。",
		backHome: "返回首頁",
		createPost: "新增帖文",
		email: "電郵",
		handle: "帳號",
		name: "顯示名稱",
		noName: "未設定名稱",
		noAvatar: "未設定頭像",
		yourPosts: "你的帖文",
		noPosts: "暫時未有帖文。",
		likes: "讚好",
		comments: "留言",
		signOut: "登出",
		adminPostPreparation: "帖文準備管理",
		dangerZone: "危險區域",
		updateUserIdIntro: "更改你的公開帳號 ID。這會更新你的公開個人檔案連結。",
		updateUserId: "更改公開帳號 ID",
		deleteIntro: "永久刪除你的 328car 帳戶。此操作無法還原，完成後你會被登出。",
		deleteHelpLink: "帳戶刪除說明",
		deleteAccount: "刪除帳戶",
		userNotFound: "找不到使用者。",
		dbUnavailable: "資料庫未連線",
	},
};

function mapLocale(rawLocale: string): {
	lang: "en" | "zh";
	profilePath: string;
	accountDeletionPath: string;
	signInPath: string;
} {
	const lang = rawLocale.toLowerCase() === "en" ? "en" : "zh";
	return {
		lang,
		profilePath: `/${lang}/profile`,
		accountDeletionPath: `/${lang}/account-deletion`,
		signInPath: `/auth/${lang}/signin`,
	};
}

function formatDate(value: string | null, lang: "en" | "zh"): string {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleDateString(lang === "en" ? "en-US" : "zh-HK", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function normalizeMediaKey(source: string): string {
	return source.replace(/^\/+/, "");
}

function extractMediaKey(mediaUrl: string): string | null {
	if (mediaUrl.startsWith("/api/media?")) {
		try {
			const url = new URL(mediaUrl, IMAGE_CDN_PRIMARY);
			const key = url.searchParams.get("key");
			return key ? normalizeMediaKey(decodeURIComponent(key)) : null;
		} catch {
			return null;
		}
	}

	if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
		try {
			const url = new URL(mediaUrl);
			if (IMAGE_CDN_HOSTNAMES.has(url.hostname)) {
				return normalizeMediaKey(url.pathname);
			}
			return null;
		} catch {
			return null;
		}
	}

	if (mediaUrl.startsWith("data:") || mediaUrl.startsWith("blob:")) {
		return null;
	}

	return normalizeMediaKey(mediaUrl);
}

function toProfileCoverUrl(mediaUrl: string | null): string | null {
	if (!mediaUrl) return null;
	const key = extractMediaKey(mediaUrl);
	if (!key) return mediaUrl;
	return `${IMAGE_CDN_PRIMARY}/cdn-cgi/image/${PROFILE_COVER_TRANSFORM_OPTIONS}/${key}`;
}

function getInitials(value: string): string {
	const normalized = value.trim();
	if (!normalized) return "U";
	const parts = normalized.replace(/[_\-.]+/g, " ").split(/\s+/).filter(Boolean);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
	notation: "compact",
	maximumFractionDigits: 1,
});

function formatCount(value: number | null): string {
	return compactNumberFormatter.format(Math.max(0, value ?? 0));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { locale } = await params;
	const { lang } = mapLocale(locale);
	const t = copy[lang];
	return {
		title: t.metaTitle,
		description: t.metaDescription,
		robots: { index: false, follow: false },
	};
}

export default async function ProfilePage({ params }: PageProps) {
	const { locale } = await params;
	const { lang, profilePath, signInPath, accountDeletionPath } = mapLocale(locale);
	const t = copy[lang];

	const session = await getServerSession(authOptions);
	if (!session?.user?.email) {
		redirect(`${signInPath}?callbackUrl=${encodeURIComponent(profilePath)}`);
	}

	const { env } = await getCloudflareContext({ async: true });
	const db = (env as DbBindings).DB;
	if (!db) {
		return (
			<main className="min-h-screen text-[color:var(--txt-1)]">
				<div
					className="pointer-events-none fixed inset-0 -z-10"
					style={{ backgroundColor: "var(--bg-1)", backgroundImage: "var(--page-bg-gradient)" }}
				/>
				<div className="mx-auto max-w-4xl px-6 py-12 sm:px-10 lg:px-16">
					<div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-5 text-sm text-[color:var(--txt-2)]">
						{t.dbUnavailable}
					</div>
				</div>
			</main>
		);
	}

	const email = session.user.email.toLowerCase();
	const user = await db
		.prepare("SELECT user_pk, user_id, email, name, avatar_url, role FROM users WHERE lower(email) = ? LIMIT 1")
		.bind(email)
		.first<UserRow>();

	if (!user?.user_pk) {
		return (
			<main className="min-h-screen text-[color:var(--txt-1)]">
				<div
					className="pointer-events-none fixed inset-0 -z-10"
					style={{ backgroundColor: "var(--bg-1)", backgroundImage: "var(--page-bg-gradient)" }}
				/>
				<div className="mx-auto max-w-4xl px-6 py-12 sm:px-10 lg:px-16">
					<div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-5 text-sm text-[color:var(--txt-2)]">
						{t.userNotFound}
					</div>
				</div>
			</main>
		);
	}

	const postsRows = await db
		.prepare(
			`SELECT
        p.post_id,
        p.post_slug,
        p.title,
        p.caption,
        p.created_at,
        p.like_count,
        p.comment_count,
        COALESCE(
          (
            SELECT pp.media_url
            FROM post_pages pp
            WHERE pp.post_id = p.post_id
              AND pp.page_num = CASE WHEN p.cover_page IS NOT NULL AND p.cover_page > 0 THEN p.cover_page ELSE 1 END
            LIMIT 1
          ),
          (
            SELECT pp.media_url
            FROM post_pages pp
            WHERE pp.post_id = p.post_id
            ORDER BY pp.page_num ASC
            LIMIT 1
          )
        ) AS cover_media_url
      FROM posts p
      WHERE p.user_pk = ?
      ORDER BY p.created_at DESC`
		)
		.bind(user.user_pk)
		.all<PostRow>();

	const posts = (postsRows.results || []).map((post) => ({
		...post,
		cover_media_url: toProfileCoverUrl(post.cover_media_url),
	}));

	const avatar = user.avatar_url || (session.user as { avatar_url?: string | null }).avatar_url || session.user.image || null;
	const displayName = user.name || session.user.name || user.user_id || user.email;
	const initials = getInitials(displayName);

	return (
		<main className="min-h-screen text-[color:var(--txt-1)]">
			<div
				className="pointer-events-none fixed inset-0 -z-10"
				style={{ backgroundColor: "var(--bg-1)", backgroundImage: "var(--page-bg-gradient)" }}
			/>

			<div className="mx-auto max-w-5xl px-6 py-12 sm:px-10 lg:px-16">
				<div className="mb-8">
					<div className="inline-flex items-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--txt-3)]">
						{t.pill}
					</div>
					<h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--txt-1)] sm:text-4xl">{t.title}</h1>
					<p className="mt-2 text-sm text-[color:var(--txt-2)] sm:text-base">{t.subtitle}</p>
				</div>

					<div className="grid gap-6 lg:grid-cols-[320px_1fr]">
					<section className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-6 shadow-sm">
						<div className="flex flex-col items-center gap-4 text-center">
							<div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-2)] text-lg font-semibold text-[color:var(--txt-2)]">
								{avatar ? (
									<img src={avatar} alt={`${displayName} avatar`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
								) : (
									initials
								)}
							</div>
							<div className="space-y-1">
								<div className="text-lg font-semibold text-[color:var(--txt-1)]">{displayName || t.noName}</div>
								<div className="text-sm text-[color:var(--txt-3)]">{avatar ? null : t.noAvatar}</div>
							</div>
						</div>

						<div className="mt-6 space-y-4 text-sm">
							<div>
								<div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--txt-3)]">{t.handle}</div>
								<div className="mt-1 text-[color:var(--txt-1)]">{user.user_id ? `@${user.user_id}` : "-"}</div>
							</div>
							<div>
								<div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--txt-3)]">{t.email}</div>
								<div className="mt-1 break-all text-[color:var(--txt-1)]">{user.email}</div>
							</div>
							<div>
								<div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--txt-3)]">{t.name}</div>
								<div className="mt-1 text-[color:var(--txt-1)]">{user.name || t.noName}</div>
							</div>
						</div>

						<div className="mt-6 flex flex-col gap-2">
							<Link
								href="/"
								className="inline-flex items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--txt-2)] transition hover:-translate-y-0.5 hover:bg-[color:var(--cell-2)]"
							>
								{t.backHome}
							</Link>
							<Link
								href="/add-post"
								className="inline-flex items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--txt-2)] transition hover:-translate-y-0.5 hover:bg-[color:var(--cell-2)]"
							>
								{t.createPost}
							</Link>
							{(user.role ?? "").toLowerCase() === "admin" ? (
								<Link
									href="/admin/post-preparation"
									className="inline-flex items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--txt-2)] transition hover:-translate-y-0.5 hover:bg-[color:var(--cell-2)]"
								>
									{t.adminPostPreparation}
								</Link>
							) : null}
							<ProfileSignOutButton
								callbackUrl="/"
								label={t.signOut}
								className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent-1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--on-accent-1)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
							/>
						</div>
					</section>

					<section className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-6 shadow-sm">
						<div className="mb-4 text-sm font-semibold text-[color:var(--txt-1)]">{t.yourPosts}</div>
						{posts.length === 0 ? (
							<div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-2)] p-4 text-sm text-[color:var(--txt-3)]">
								{t.noPosts}
							</div>
						) : (
							<div className="grid gap-5 sm:grid-cols-2">
								{posts.map((post) => {
									const title = (post.title || post.caption || "").trim() || `#${post.post_id}`;
									const caption = (post.caption || "").trim();
									const createdAt = formatDate(post.created_at, lang);
									return (
										<article
											key={post.post_id}
											className="overflow-hidden rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)]"
										>
											<div className="relative aspect-[4/5] bg-[color:var(--cell-2)]">
												{post.cover_media_url ? (
													<img
														src={post.cover_media_url}
														alt={title}
														className="h-full w-full object-cover"
														referrerPolicy="no-referrer"
													/>
												) : (
													<div className="flex h-full w-full items-center justify-center text-sm text-[color:var(--txt-3)]">
														No image
													</div>
												)}
											</div>
											<div className="space-y-2 p-4">
												<div className="line-clamp-2 text-sm font-semibold text-[color:var(--txt-1)]">{title}</div>
												{caption ? (
													<div className="line-clamp-3 text-sm text-[color:var(--txt-2)]">{caption}</div>
												) : null}
												<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-wide text-[color:var(--txt-3)]">
													{createdAt ? <span>{createdAt}</span> : null}
													<span>
														{formatCount(post.like_count)} {t.likes}
													</span>
													<span>
														{formatCount(post.comment_count)} {t.comments}
													</span>
												</div>
											</div>
										</article>
									);
								})}
							</div>
						)}
						</section>
					</div>

					<div className="mt-6 rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-4 text-sm text-[color:var(--txt-1)] shadow-sm">
						<div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600">
							{t.dangerZone}
						</div>
						<p className="text-[color:var(--txt-3)]">{t.updateUserIdIntro}</p>
						<div className="mt-3 flex flex-wrap items-center gap-3">
							<Link
								href="mailto:admin@paragify.com?subject=Change%20my%20public%20user%20ID"
								className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--txt-2)] transition hover:-translate-y-0.5 hover:bg-[color:var(--cell-2)]"
							>
								{t.updateUserId}
							</Link>
						</div>
						<p className="text-[color:var(--txt-3)]">
							{t.deleteIntro}{" "}
							<Link
								href={accountDeletionPath}
								className="font-semibold text-[color:var(--txt-2)] underline decoration-[color:var(--accent-1)]/60 decoration-2 underline-offset-4 hover:text-[color:var(--accent-1)]"
							>
								{t.deleteHelpLink}
							</Link>
						</p>
						<div className="mt-3 flex flex-wrap items-center gap-3">
							<Link
								href={accountDeletionPath}
								className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--txt-2)] transition hover:-translate-y-0.5 hover:bg-[color:var(--cell-2)]"
							>
								{t.deleteAccount}
							</Link>
						</div>
					</div>
				</div>
			</main>
		);
}
