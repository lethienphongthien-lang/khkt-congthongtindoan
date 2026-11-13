import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { UserError } from "@/lib/action";
import { isSharedTeacher, sharedTeachers } from "./edu-integration";

type Tx = Prisma.TransactionClient;
async function actor(tx: Tx, id: string) {
  const u = await tx.user.findUnique({ where: { id } });
  if (!u || u.role !== "ADMIN" || !u.superAdmin || u.status !== "ACTIVE") throw new UserError("Chỉ quản trị tối cao được quản lý BCH");
}
async function target(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM public."User" WHERE id=${id} FOR UPDATE`;
  const u = await tx.user.findUnique({ where: { id } });
  if (!u || u.role !== "ADMIN" || u.superAdmin) throw new UserError("Không tìm thấy tài khoản BCH");
  return u;
}
const log = (tx: Tx, actorId: string, action: string, id: string) => tx.auditLog.create({ data: { userId: actorId, action, target: "User", targetId: id } });
export async function appointTeacher(actorId: string, accountId: string, position: string) {
  return db.$transaction(async (tx) => {
    await actor(tx, actorId);
    await tx.$queryRaw`SELECT id FROM public."User" WHERE id=${accountId} FOR UPDATE`;
    const teacher = (await sharedTeachers(tx)).find((s) => s.accountId === accountId);
    if (!teacher?.eligible) throw new UserError("Chỉ liên kết tài khoản giáo viên đang hoạt động; học sinh BCH phải dùng tài khoản riêng");
    const u = await tx.user.update({ where: { id: accountId }, data: { role: "ADMIN", superAdmin: false, position, fullName: teacher.fullName } });
    await log(tx, actorId, "leader.appoint_teacher", u.id); return u;
  });
}
export async function createStandaloneLeader(actorId: string, data: { username: string; fullName: string; position: string; passwordHash: string }) {
  return db.$transaction(async (tx) => {
    await actor(tx, actorId);
    if (await tx.user.findUnique({ where: { username: data.username } })) throw new UserError("Tên đăng nhập đã tồn tại");
    const u = await tx.user.create({ data: { ...data, role: "ADMIN", superAdmin: false, mustChangePassword: true } });
    await log(tx, actorId, "leader.create_standalone", u.id); return u;
  });
}
export async function editLeader(actorId: string, id: string, data: { position: string; fullName?: string }) {
  return db.$transaction(async (tx) => {
    await actor(tx, actorId); await target(tx, id);
    const shared = await isSharedTeacher(id, tx);
    if (shared && data.fullName !== undefined) throw new UserError("Sửa họ tên giáo viên tại EduConnect");
    await tx.user.update({ where: { id }, data }); await log(tx, actorId, "leader.update", id);
  });
}
export async function changeLeaderStatus(actorId: string, id: string, status: "ACTIVE" | "LOCKED") {
  return db.$transaction(async (tx) => {
    await actor(tx, actorId); await target(tx, id);
    const shared = await isSharedTeacher(id, tx);
    if (shared) {
      if (status !== "LOCKED") throw new UserError("Chọn giáo viên để bổ nhiệm lại");
      await tx.user.update({ where: { id }, data: { role: "EXTERNAL", position: null } });
    } else await tx.user.update({ where: { id }, data: { status } });
    await log(tx, actorId, status === "LOCKED" ? "leader.revoke" : "leader.restore", id);
  });
}
export async function resetLeaderPassword(actorId: string, id: string, passwordHash: string) {
  return db.$transaction(async (tx) => {
    await actor(tx, actorId); const u = await target(tx, id);
    await tx.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true } });
    await tx.passkey.deleteMany({ where: { userId: id } }); await log(tx, actorId, "leader.reset_password", id); return u;
  });
}
