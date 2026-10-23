import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import type { FeedItem } from "@/components/confession/confession-feed";

export const CONFESSION_PAGE_SIZE = 10;

/** Một trang confession đã duyệt (mới nhất trước) kèm số like, trạng thái đã thích của người xem và bình luận. */
export async function listApprovedConfessions(skip: number): Promise<{ items: FeedItem[]; hasMore: boolean }> {
  const [user, jar] = await Promise.all([getCurrentUser(), cookies()]);
  const anonKey = jar.get("confession_anon")?.value;
  const rows = await db.confession.findMany({
    where: { status: "APPROVED" }, orderBy: [{ reviewedAt: "desc" }, { id: "desc" }], skip, take: CONFESSION_PAGE_SIZE + 1,
    select: {
      id: true, content: true, nickname: true, reviewedAt: true, createdAt: true,
      _count: { select: { likes: true } },
      likes: { where: user ? { userId: user.id } : anonKey ? { anonKey } : { id: "none" }, select: { id: true } },
      comments: { orderBy: { createdAt: "asc" }, take: 100, select: { id: true, authorName: true, content: true, createdAt: true } },
    },
  });
  const items: FeedItem[] = rows.slice(0, CONFESSION_PAGE_SIZE).map((c) => ({
    id: c.id, content: c.content, nickname: c.nickname, at: (c.reviewedAt ?? c.createdAt).toISOString(),
    likes: c._count.likes, liked: c.likes.length > 0,
    comments: c.comments.map((m) => ({ id: m.id, authorName: m.authorName, content: m.content, createdAt: m.createdAt.toISOString() })),
  }));
  return { items, hasMore: rows.length > CONFESSION_PAGE_SIZE };
}
