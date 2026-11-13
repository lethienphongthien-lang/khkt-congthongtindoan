import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/permissions";

/** Điều kiện lọc Member theo phạm vi quyền của người xem. */
export function memberScope(user: SessionUser): Prisma.MemberWhereInput {
  // deletedAt: null — đoàn viên bị xóa mềm (học sinh bị xóa ở EduConnect) không còn xuất hiện ở đâu.
  if (user.role === "ADMIN") return { deletedAt: null };
  if ((user.role === "SECRETARY" || user.role === "DEPARTMENT_ACCOUNT" || user.role === "MONITOR") && user.departmentId) return { departmentId: user.departmentId, deletedAt: null };
  if (user.role === "MEMBER" && user.memberId) return { id: user.memberId, deletedAt: null };
  return { id: "__none__" };
}

/** Lấy 1 đoàn viên, chỉ khi người xem có quyền (chống IDOR). */
export async function getMemberForUser(user: SessionUser, id: string) {
  return db.member.findFirst({
    where: { id, ...memberScope(user) },
    include: { class: true, department: true, user: { select: { username: true, status: true, lastLoginAt: true, mustChangePassword: true } } },
  });
}

/** Bài viết mà người dùng được xem: toàn trường + Chi đoàn của mình (Admin xem tất cả). */
export function postScope(user: SessionUser): Prisma.PostWhereInput {
  if (user.role === "ADMIN") return {};
  if (!user.departmentId) return { departmentId: null };
  return { OR: [{ departmentId: null }, { departmentId: user.departmentId }] };
}
