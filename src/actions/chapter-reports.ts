"use server";

import { revalidatePath } from "next/cache";
import { invalidatePublic } from "@/lib/public-cache";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { ForbiddenError, assertManageDepartment } from "@/lib/permissions";
import { reportSchema, reportPeriodSchema } from "@/lib/validation";
import { deleteImage, isOwnPublicId } from "@/lib/cloudinary";
import { cleanContent } from "@/lib/sanitize";

const refresh = () => { revalidatePath("/bao-cao-chi-doan", "layout"); revalidatePath("/chapter-reports"); invalidatePublic(); };

export async function savePeriodAction(id: string | null, input: unknown) {
  return run<{ id: string }>(async () => {
    const user = await requireRole(["ADMIN"]);
    const d = reportPeriodSchema.parse(input);
    const startDate = d.startDate ? new Date(d.startDate) : null;
    const endDate = d.endDate ? new Date(d.endDate) : null;
    if (startDate && isNaN(startDate.getTime())) throw new UserError("Ngày bắt đầu không hợp lệ");
    if (endDate && isNaN(endDate.getTime())) throw new UserError("Hạn chót không hợp lệ");
    if (startDate && endDate && endDate < startDate) throw new UserError("Hạn chót phải sau ngày bắt đầu");

    const data = {
      title: d.title,
      description: d.description?.trim() || null,
      startDate,
      endDate,
      academicYear: d.academicYear?.trim() || null,
      status: d.status,
    };

    if (id) {
      const cur = await db.reportPeriod.findUnique({ where: { id } });
      if (!cur) throw new UserError("Không tìm thấy đợt báo cáo");
      await db.reportPeriod.update({ where: { id }, data });
      await audit(user.id, "report_period.update", "ReportPeriod", id, { title: d.title });
      refresh();
      return { data: { id }, message: "Đã cập nhật đợt báo cáo" };
    }

    const p = await db.reportPeriod.create({ data: { ...data, createdById: user.id } });
    await audit(user.id, "report_period.create", "ReportPeriod", p.id, { title: d.title });
    refresh();
    return { data: { id: p.id }, message: "Đã tạo đợt báo cáo mới" };
  });
}

export async function deletePeriodAction(id: string) {
  return run(async () => {
    const user = await requireRole(["ADMIN"]);
    const cur = await db.reportPeriod.findUnique({ where: { id }, include: { _count: { select: { reports: true } } } });
    if (!cur) throw new UserError("Không tìm thấy đợt báo cáo");
    if (cur._count.reports > 0) {
      throw new UserError(`Đợt báo cáo này đã có ${cur._count.reports} báo cáo. Vui lòng đóng đợt báo cáo thay vì xóa.`);
    }
    await db.reportPeriod.delete({ where: { id } });
    await audit(user.id, "report_period.delete", "ReportPeriod", id, { title: cur.title });
    refresh();
    return { message: "Đã xóa đợt báo cáo" };
  });
}

export async function saveReportAction(id: string | null, input: unknown) {
  return run<{ id: string }>(async () => {
    const user = await requireRole(["ADMIN", "SECRETARY"]);
    const d = reportSchema.parse(input);
    d.content = cleanContent(d.content);
    // Bí thư luôn đăng cho Chi đoàn của mình, bất kể client gửi gì.
    const departmentId = user.role === "SECRETARY" ? user.departmentId : d.departmentId;
    if (!departmentId) throw user.role === "ADMIN" ? new UserError("Chọn Chi đoàn") : new ForbiddenError();
    if (!(await db.department.findUnique({ where: { id: departmentId } }))) throw new UserError("Chi đoàn không tồn tại");
    if (d.imagePublicId && !isOwnPublicId(d.imagePublicId, "activities")) throw new UserError("Ảnh không hợp lệ");

    const periodId = d.periodId?.trim() ? d.periodId.trim() : null;
    if (periodId) {
      const period = await db.reportPeriod.findUnique({ where: { id: periodId } });
      if (!period) throw new UserError("Đợt báo cáo không tồn tại");
      if (period.status === "CLOSED" && user.role !== "ADMIN") {
        throw new UserError("Đợt báo cáo này đã đóng, không thể nộp hoặc chỉnh sửa");
      }
    }

    const data = {
      title: d.title,
      content: d.content,
      periodId,
      imageUrl: d.imageUrl ?? null,
      imagePublicId: d.imagePublicId ?? null,
    };

    if (id) {
      const cur = await db.chapterReport.findUnique({ where: { id } });
      if (!cur) throw new UserError("Không tìm thấy báo cáo");
      assertManageDepartment(user, cur.departmentId);
      const targetDeptId = user.role === "ADMIN" ? departmentId : cur.departmentId;

      // Kiểm tra nếu đổi periodId sang đợt mà Chi đoàn đã nộp báo cáo khác
      if (periodId && (periodId !== cur.periodId || targetDeptId !== cur.departmentId)) {
        const existing = await db.chapterReport.findFirst({
          where: { departmentId: targetDeptId, periodId, id: { not: id } },
        });
        if (existing) throw new UserError("Chi đoàn này đã có báo cáo cho đợt được chọn");
      }

      await db.chapterReport.update({
        where: { id },
        data: { ...data, departmentId: targetDeptId },
      });
      if (cur.imagePublicId && cur.imagePublicId !== data.imagePublicId) await deleteImage(cur.imagePublicId);
      await audit(user.id, "report.update", "ChapterReport", id);
      refresh();
      return { data: { id }, message: "Đã cập nhật báo cáo" };
    }

    // Tạo mới: Kiểm tra trùng đợt báo cáo cho Chi đoàn này
    if (periodId) {
      const existing = await db.chapterReport.findFirst({
        where: { departmentId, periodId },
      });
      if (existing) {
        throw new UserError("Chi đoàn đã nộp báo cáo cho đợt này. Bạn có thể xem hoặc chỉnh sửa báo cáo đã nộp.");
      }
    }

    const r = await db.chapterReport.create({ data: { ...data, departmentId, createdById: user.id } });
    await audit(user.id, "report.create", "ChapterReport", r.id, { departmentId, periodId });
    refresh();
    return { data: { id: r.id }, message: "Đã nộp báo cáo thành công" };
  });
}

export async function deleteReportAction(id: string) {
  return run(async () => {
    const user = await requireRole(["ADMIN", "SECRETARY"]);
    const cur = await db.chapterReport.findUnique({ where: { id } });
    if (!cur) throw new UserError("Không tìm thấy báo cáo");
    assertManageDepartment(user, cur.departmentId);
    await db.chapterReport.delete({ where: { id } });
    await deleteImage(cur.imagePublicId);
    await audit(user.id, "report.delete", "ChapterReport", id);
    refresh();
    return { message: "Đã xóa báo cáo" };
  });
}
