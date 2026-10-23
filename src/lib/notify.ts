import { after } from "next/server";
import type { NotificationType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { sendPushToUsers } from "@/lib/push";

type Tx = Prisma.TransactionClient | typeof db;
type Notice = { type: NotificationType; title: string; body?: string; link?: string };

/** Đẩy thông báo ra thiết bị SAU khi phản hồi đã gửi (để transaction đã commit, không làm chậm người dùng). */
function pushLater(userIds: string[], n: Notice) {
  const run = () => sendPushToUsers(userIds, { title: n.title, body: n.body, url: n.link, tag: n.type });
  try {
    after(run);
  } catch {
    // Ngoài ngữ cảnh request (seed, script): bỏ qua push.
  }
}

export async function notifyUser(userId: string, n: Notice, client: Tx = db) {
  await client.notification.create({ data: { userId, ...n } });
  pushLater([userId], n);
}

export async function notifyUsers(userIds: string[], n: Notice, client: Tx = db) {
  if (!userIds.length) return;
  await client.notification.createMany({ data: userIds.map((userId) => ({ userId, ...n })) });
  pushLater(userIds, n);
}
