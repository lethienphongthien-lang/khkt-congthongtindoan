import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { canUseTeamChat, changedSince, recentMessages } from "@/lib/services/team-chat";

export const dynamic = "force-dynamic";

/** Lấy tin: `?since=<ISO>` tin mới/đổi sau mốc; `?before=<ISO>` tải tin cũ hơn; không tham số: 20 tin gần nhất (`limit` tối đa 50). `read=1` đánh dấu đã đọc. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!canUseTeamChat(user)) return NextResponse.json({ error: "Bạn không còn trong kênh chat này" }, { status: 403 });
  const sp = new URL(req.url).searchParams;
  const date = (v: string | null) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d : null; };
  const since = date(sp.get("since")), before = date(sp.get("before"));
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 20));
  const messages = since ? await changedSince(since) : await recentMessages(limit, before ?? undefined);
  if (sp.get("read") === "1") {
    await Promise.all([
      db.teamChatRead.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: { lastReadAt: new Date() } }),
      db.notification.updateMany({ where: { userId: user.id, link: "/team-chat", readAt: null }, data: { readAt: new Date() } }),
    ]);
  }
  return NextResponse.json({ messages, serverTime: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
