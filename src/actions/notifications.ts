"use server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
}

export async function markNotificationRead(id: string) {
  const user = await getCurrentUser();
  if (!user) return;
  // Ràng buộc userId: không thể đánh dấu thông báo của người khác.
  await db.notification.updateMany({ where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
}
