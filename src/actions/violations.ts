"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/session";
import { assertReportViolation, assertRole } from "@/lib/permissions";
import { violationSchema } from "@/lib/validation";
import { notifyUser } from "@/lib/notify";

/** Danh sách đoàn viên đang sinh hoạt của một Chi đoàn, để cờ đỏ/Admin chọn khi ghi nhận vi phạm. */
export async function getDepartmentMembersAction(departmentId: string) {
  return run<{ members: { id: string; fullName: string; code: string }[] }>(async () => {
    const user = await requireUser();
    assertRole(user, "ADMIN", "MONITOR");
    const members = await db.member.findMany({ where: { departmentId, status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, code: true } });
    return { data: { members } };
  });
}

/** Cờ đỏ ghi nhận một vi phạm mới cho một đoàn viên của bất kỳ Chi đoàn nào (chấm nề nếp toàn trường). Admin cũng ghi nhận được. */
export async function createViolationAction(input: unknown) {
  return run(async () => {
    const user = await requireUser();
    assertRole(user, "ADMIN", "MONITOR");
    const data = violationSchema.parse(input);
    assertReportViolation(user);
    const member = await db.member.findFirst({ where: { id: data.memberId, departmentId: data.departmentId, status: "ACTIVE" } });
    if (!member) throw new UserError("Đoàn viên này không thuộc Chi đoàn hoặc không còn sinh hoạt");
    const dept = await db.department.findUnique({ where: { id: data.departmentId }, select: { name: true, accountId: true } });
    const violation = await db.violation.create({
      data: { departmentId: data.departmentId, memberId: data.memberId, type: data.type, content: data.content, recordedAt: data.recordedAt, recordedById: user.id },
    });
    await audit(user.id, "violation.create", "Violation", violation.id, { departmentId: data.departmentId, memberId: data.memberId });
    if (dept?.accountId) {
      await notifyUser(dept.accountId, {
        type: "VIOLATION", title: `Vi phạm mới: ${member.fullName} (${data.type})`, body: data.content, link: "/violations",
      });
    }
    revalidatePath(`/departments/${data.departmentId}`);
    revalidatePath("/violations");
    return { message: `Đã ghi nhận vi phạm của ${member.fullName}` };
  });
}

export async function deleteViolationAction(id: string) {
  return run(async () => {
    const user = await requireUser();
    const violation = await db.violation.findUnique({ where: { id } });
    if (!violation) throw new UserError("Không tìm thấy vi phạm");
    assertRole(user, "ADMIN", "MONITOR");
    if (user.role === "MONITOR" && violation.recordedById !== user.id) throw new UserError("Chỉ được xóa vi phạm do chính mình ghi nhận");
    await db.violation.delete({ where: { id } });
    await audit(user.id, "violation.delete", "Violation", id, { departmentId: violation.departmentId });
    revalidatePath(`/departments/${violation.departmentId}`);
    revalidatePath("/violations");
    return { message: "Đã xóa vi phạm" };
  });
}
