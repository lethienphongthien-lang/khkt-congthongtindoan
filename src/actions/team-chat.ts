"use server";

import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { getCurrentUser } from "@/lib/auth/session";
import { folderPath } from "@/lib/cloudinary";
import { sendPushToUsers } from "@/lib/push";
import { publishTeamEvent } from "@/lib/realtime";
import { getT } from "@/lib/i18n/server";
import type { TFn } from "@/lib/i18n/translate";
import { canUseTeamChat, messageInclude, toDTO, type ChatAttachment } from "@/lib/services/team-chat";

const MAX_FILES = 10;
const attachmentSchema = z.object({
  url: z.string().url().max(500), publicId: z.string().max(300), name: z.string().trim().min(1).max(200),
  size: z.number().int().min(0).max(110 * 1024 * 1024), mime: z.string().max(100), kind: z.enum(["image", "video", "file"]),
});
const sendSchema = (t: TFn) => z.object({ content: z.string().trim().max(4000, t("community.sa.tcMax", { n: 4000 })).optional(), attachments: z.array(attachmentSchema).max(MAX_FILES, t("community.sa.tcFiles", { n: MAX_FILES })).default([]) });

async function member() {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword || !canUseTeamChat(user)) throw new UserError(t("community.sa.tcNotMember"));
  return user;
}

/** Gửi tin nhắn (chữ và/hoặc tệp đã tải lên Cloudinary). */
export async function sendTeamMessageAction(input: unknown) {
  return run(async () => {
    const t = await getT();
    const user = await member();
    const d = sendSchema(t).parse(input);
    const content = d.content || null;
    if (!content && d.attachments.length === 0) throw new UserError(t("community.sa.tcEmpty"));
    // Tệp phải nằm trong thư mục chat của chính hệ thống trên Cloudinary (không nhận đường dẫn bất kỳ)
    const prefix = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`;
    for (const a of d.attachments) {
      if (!a.url.startsWith(prefix) || !a.publicId.startsWith(`${folderPath("chat")}/`)) throw new UserError(t("community.sa.tcFileBad"));
    }
    const m = await db.teamMessage.create({ data: { authorId: user.id, content, attachments: d.attachments.length ? (d.attachments as ChatAttachment[]) : undefined }, include: messageInclude });
    const dto = toDTO(m);
    after(() => publishTeamEvent("message", dto)); // đẩy tức thì tới mọi trình duyệt đang mở kênh (WSS)
    // Thông báo cho các thành viên khác: MỖI tin đều đẩy ra thiết bị. Trong danh sách thông báo của hệ thống thì gộp thành một mục:
    // ai đã có thông báo kênh chat chưa đọc thì cập nhật mục đó theo tin mới nhất, người chưa có thì tạo mới. Trên thiết bị dùng chung "tag" nên tin sau thay tin trước, không chồng chất.
    after(async () => {
      try {
        const others = await db.user.findMany({ where: { role: { in: ["ADMIN", "SECRETARY"] }, status: "ACTIVE", id: { not: user.id } }, select: { id: true } });
        const ids = others.map((o) => o.id);
        const body = content ? content.slice(0, 80) : "Đã gửi một tệp đính kèm";
        const title = `Kênh chat: ${user.fullName}`;
        const existing = await db.notification.findMany({ where: { userId: { in: ids }, link: "/team-chat", readAt: null }, select: { userId: true } });
        const has = new Set(existing.map((n) => n.userId));
        if (has.size) await db.notification.updateMany({ where: { userId: { in: [...has] }, link: "/team-chat", readAt: null }, data: { title, body, createdAt: new Date() } });
        const fresh = ids.filter((id) => !has.has(id));
        if (fresh.length) await db.notification.createMany({ data: fresh.map((userId) => ({ userId, type: "SYSTEM" as const, title, body, link: "/team-chat" })) });
        await sendPushToUsers(ids, { title, body, url: "/team-chat", tag: "team-chat" });
      } catch { /* thông báo lỗi không làm hỏng việc gửi tin */ }
    });
    return { data: dto };
  });
}

/** Thu hồi tin nhắn: người gửi thu hồi tin của mình; Admin thu hồi được mọi tin. */
export async function deleteTeamMessageAction(id: string) {
  return run(async () => {
    const t = await getT();
    const user = await member();
    const m = await db.teamMessage.findUnique({ where: { id } });
    if (!m) throw new UserError(t("community.sa.tcMissing"));
    if (m.authorId !== user.id && user.role !== "ADMIN") throw new UserError(t("community.sa.tcOwnOnly"));
    const upd = await db.teamMessage.update({ where: { id }, data: { deletedAt: new Date(), content: null, attachments: Prisma.DbNull }, include: messageInclude });
    after(() => publishTeamEvent("update", toDTO(upd)));
    return { message: t("community.sa.tcRecalled") };
  });
}
