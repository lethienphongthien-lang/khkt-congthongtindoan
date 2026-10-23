import "server-only";
import type { Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";

/** Ai đang là Ban chấp hành (ADMIN) hoặc Bí thư Chi đoàn (SECRETARY) thì dùng được kênh; hết vai trò là mất quyền ngay ở lần kiểm tra kế tiếp. */
export const canUseTeamChat = (u: { role: Role } | null | undefined) => !!u && (u.role === "ADMIN" || u.role === "SECRETARY");

export type ChatAttachment = { url: string; publicId: string; name: string; size: number; mime: string; kind: "image" | "video" | "file" };

export type ChatMessageDTO = {
  id: string; authorId: string; authorName: string; authorLabel: string; authorAvatar: string | null;
  content: string | null; attachments: ChatAttachment[]; deleted: boolean; createdAt: string; updatedAt: string;
};

export const messageInclude = {
  author: { select: { id: true, fullName: true, role: true, position: true, avatarUrl: true, secretaryOf: { select: { name: true } } } },
} satisfies Prisma.TeamMessageInclude;

type Row = Prisma.TeamMessageGetPayload<{ include: typeof messageInclude }>;

function labelOf(a: Row["author"]) {
  if (a.role === "ADMIN") return a.position ?? "Ban chấp hành";
  if (a.role === "SECRETARY") return a.secretaryOf?.name ? `Bí thư ${a.secretaryOf.name}` : "Bí thư";
  return "Đã rời kênh"; // từng là bí thư, nay không còn vai trò
}

export function toDTO(m: Row): ChatMessageDTO {
  const att = Array.isArray(m.attachments) ? (m.attachments as ChatAttachment[]) : [];
  return {
    id: m.id, authorId: m.authorId, authorName: m.author.fullName, authorLabel: labelOf(m.author), authorAvatar: m.author.avatarUrl,
    content: m.deletedAt ? null : m.content, attachments: m.deletedAt ? [] : att, deleted: !!m.deletedAt,
    createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString(),
  };
}

/** `limit` tin mới nhất (xếp từ cũ đến mới). `before`: tin cũ hơn mốc thời gian này. */
export async function recentMessages(limit = 50, before?: Date) {
  const rows = await db.teamMessage.findMany({ where: before ? { createdAt: { lt: before } } : {}, orderBy: { createdAt: "desc" }, take: limit, include: messageInclude });
  return rows.reverse().map(toDTO);
}

/** Tin mới hoặc vừa đổi (thu hồi) sau mốc `since` (dùng cho cập nhật gần thời gian thực). */
export async function changedSince(since: Date) {
  const rows = await db.teamMessage.findMany({ where: { updatedAt: { gt: since } }, orderBy: { updatedAt: "asc" }, take: 100, include: messageInclude });
  return rows.map(toDTO);
}

export type ChatMemberDTO = { id: string; name: string; label: string; avatar: string | null; role: "ADMIN" | "SECRETARY" };

/** Thành viên hiện tại của kênh: Ban chấp hành trước (xếp theo tên), rồi các Bí thư (xếp theo Chi đoàn). */
export async function channelMembers(): Promise<ChatMemberDTO[]> {
  const rows = await db.user.findMany({
    where: { role: { in: ["ADMIN", "SECRETARY"] }, status: "ACTIVE" },
    select: { id: true, fullName: true, role: true, position: true, avatarUrl: true, secretaryOf: { select: { name: true } } },
  });
  const list = rows.map((u) => ({ id: u.id, name: u.fullName, role: u.role as "ADMIN" | "SECRETARY", avatar: u.avatarUrl, label: u.role === "ADMIN" ? u.position ?? "Ban chấp hành" : u.secretaryOf?.name ? `Bí thư ${u.secretaryOf.name}` : "Bí thư" }));
  return list.sort((a, b) => (a.role === b.role ? a.label.localeCompare(b.label, "vi", { numeric: true }) || a.name.localeCompare(b.name, "vi") : a.role === "ADMIN" ? -1 : 1));
}
