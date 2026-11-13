import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { UserError } from "@/lib/action";
import { hasEduIntegration } from "./edu-integration";
import { schoolYearStart } from "@/lib/school-year";
import { runSharedCommand } from "@/lib/shared-command";
export type Office = "SECRETARY" | "RED_MONITOR" | "PRESIDENT";
/** Use shared DB command when installed; otherwise Cổng Đoàn owns all its class offices locally. */
export async function assignClassOfficer(actorId: string, departmentId: string, office: Office, memberId: string | null, remove = false) {
  return db.$transaction(async (tx) => {
    const actor = await tx.user.findUnique({ where: { id: actorId } });
    if (actor?.role !== "ADMIN" || actor.status !== "ACTIVE") throw new UserError("Không có quyền bổ nhiệm");
    if (await hasEduIntegration(tx)) {
      const [r] = await tx.$queryRaw<{ ready: boolean }[]>`SELECT to_regprocedure('edu.assign_class_officer(text,text,text,text,text,boolean)') IS NOT NULL AS ready`;
      if (r.ready) {
        await runSharedCommand(() => tx.$queryRaw`SELECT 1 FROM edu.assign_class_officer('doan', ${actorId}, ${departmentId}, ${office}, ${memberId}, ${remove})`);
        return;
      }
    }
    await localOfficer(tx, departmentId, office, memberId, remove);
    await tx.auditLog.create({ data: { userId: actorId, action: `department.${office}.${remove ? "remove" : "assign"}`, target: "Department", targetId: departmentId, metadata: { memberId } } });
  });
}
async function localOfficer(tx: Prisma.TransactionClient, departmentId: string, office: Office, memberId: string | null, remove: boolean) {
  await tx.$queryRaw`SELECT id FROM public."Department" WHERE id=${departmentId} FOR UPDATE`;
  const d = await tx.department.findUnique({ where: { id: departmentId } });
  const grade = d?.startYear == null ? null : 10 + schoolYearStart(new Date()) - d.startYear;
  if (!d || d.graduatedAt || (!d.isTeacher && (grade == null || grade < 10 || grade > 12))) throw new UserError("Không tìm thấy lớp đang hoạt động");
  if (d.isTeacher && office === "PRESIDENT") throw new UserError("Chi đoàn giáo viên không có lớp trưởng");
  const m = memberId ? await tx.member.findFirst({ where: { id: memberId, departmentId, ...(!remove ? { status: "ACTIVE" as const } : {}) }, include: { user: true } }) : null;
  if (!remove && (!m || m.user.status !== "ACTIVE" || !["MEMBER", "SECRETARY", "MONITOR"].includes(m.user.role))) throw new UserError("Chọn học sinh đang hoạt động thuộc lớp");
  if (office === "PRESIDENT") {
    await tx.department.update({ where: { id: d.id }, data: { presidentId: remove ? null : m!.userId } }); return;
  }
  if (office === "SECRETARY") {
    if (!remove && (!m!.isDoanVien || await tx.departmentMonitor.findUnique({ where: { userId: m!.userId } }))) throw new UserError("Bí thư phải là đoàn viên và không kiêm cờ đỏ");
    if (d.secretaryId) await tx.user.updateMany({ where: { id: d.secretaryId, role: "SECRETARY" }, data: { role: "MEMBER" } });
    await tx.department.update({ where: { id: d.id }, data: { secretaryId: remove ? null : m!.userId } });
    if (!remove) await tx.user.update({ where: { id: m!.userId }, data: { role: "SECRETARY" } });
  } else if (office === "RED_MONITOR") {
    if (!m) throw new UserError("Không tìm thấy học sinh");
    if (remove) {
      const result = await tx.departmentMonitor.deleteMany({ where: { departmentId, userId: m.userId } });
      if (!result.count) throw new UserError("Không tìm thấy cờ đỏ trong lớp");
      await tx.user.updateMany({ where: { id: m.userId, role: "MONITOR" }, data: { role: "MEMBER" } });
    } else {
      if (m.user.role === "SECRETARY" || await tx.department.findUnique({ where: { secretaryId: m.userId } })) throw new UserError("Bí thư không kiêm cờ đỏ");
      if (await tx.departmentMonitor.findUnique({ where: { userId: m.userId } })) throw new UserError("Học sinh đã là cờ đỏ");
      await tx.departmentMonitor.create({ data: { departmentId, userId: m.userId } });
      await tx.user.update({ where: { id: m.userId }, data: { role: "MONITOR" } });
    }
  } else throw new UserError("Chức danh không hợp lệ");
}
