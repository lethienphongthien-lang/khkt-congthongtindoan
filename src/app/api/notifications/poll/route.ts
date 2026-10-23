import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

/** Nhẹ: trả về số chưa đọc và thông báo mới nhất để tab đang mở phát âm thanh khi có thông báo mới. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const [unread, latest] = await Promise.all([
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    db.notification.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, body: true, link: true } }),
  ]);
  return NextResponse.json({ unread, latest }, { headers: { "Cache-Control": "no-store" } });
}
