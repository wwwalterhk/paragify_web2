import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { DEFAULT_FEED_PAGE_SIZE, loadFeedPosts } from "@/lib/feed-posts";

function toOptionalInteger(value: string | null): number | null {
	if (!value) {
		return null;
	}
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return null;
	}
	return Math.floor(parsed);
}

async function resolveViewerUserPk(db: D1Database): Promise<number | null> {
	try {
		const session = await getServerSession(authOptions);
		const email = session?.user?.email?.trim().toLowerCase();
		if (!email) return null;

		const row = await db
			.prepare("SELECT user_pk FROM users WHERE lower(email) = ? LIMIT 1")
			.bind(email)
			.first<{ user_pk: number }>();
		return row?.user_pk ?? null;
	} catch {
		return null;
	}
}

export async function GET(request: Request) {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const db = (env as CloudflareEnv & { DB?: D1Database }).DB;
		if (!db) {
			return NextResponse.json(
				{
					ok: false,
					error: "D1 binding `DB` is not available in this environment.",
				},
				{ status: 500 },
			);
		}

		const requestUrl = new URL(request.url);
		const limit = toOptionalInteger(requestUrl.searchParams.get("limit")) ?? DEFAULT_FEED_PAGE_SIZE;
		const cursorCreatedAt = requestUrl.searchParams.get("cursor_created_at");
		const cursorPostId = toOptionalInteger(requestUrl.searchParams.get("cursor_post_id"));
		const tag = requestUrl.searchParams.get("tag") ?? requestUrl.searchParams.get("hashtag");
		const authorUserId =
			requestUrl.searchParams.get("user") ??
			requestUrl.searchParams.get("user_id") ??
			requestUrl.searchParams.get("userId");
		const hasPartialCursor = Boolean(cursorCreatedAt) !== Boolean(cursorPostId && cursorPostId > 0);
		if (hasPartialCursor) {
			return NextResponse.json(
				{
					ok: false,
					error: "Both cursor_created_at and cursor_post_id are required when paginating.",
				},
				{ status: 400 },
			);
		}

		const viewerUserPk = await resolveViewerUserPk(db);

		const result = await loadFeedPosts(db, {
			limit,
			cursorCreatedAt,
			cursorPostId,
			viewerUserPk,
			tag,
			authorUserId,
		});

		return NextResponse.json({
			ok: true,
			posts: result.posts,
			has_more: result.hasMore,
			next_cursor: result.nextCursor,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error: error instanceof Error ? error.message : "Failed to load feed posts.",
			},
			{ status: 500 },
		);
	}
}
