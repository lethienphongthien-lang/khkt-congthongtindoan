"use server";

import { revalidatePath } from "next/cache";
import { invalidatePublic } from "@/lib/public-cache";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { ForbiddenError, assertManageDepartment } from "@/lib/permissions";
import { reportSchema } from "@/lib/validation";
import { deleteImage, isOwnPublicId } from "@/lib/cloudinary";
import { cleanContent } from "@/lib/sanitize";

const refresh = () => { revalidatePath("/bao-cao-chi-doan", "layout"); revalidatePath("/chapter-reports"); invalidatePublic(); };

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

    const data = { title: d.title, content: d.content, imageUrl: d.imageUrl ?? null, imagePublicId: d.imagePublicId ?? null };
    if (id) {
      const cur = await db.chapterReport.findUnique({ where: { id } });
      if (!cur) throw new UserError("Không tìm thấy báo cáo");
      assertManageDepartment(user, cur.departmentId);
      await db.chapterReport.update({ where: { id }, data: { ...data, departmentId: user.role === "ADMIN" ? departmentId : cur.departmentId } });
      if (cur.imagePublicId && cur.imagePublicId !== data.imagePublicId) await deleteImage(cur.imagePublicId);
      await audit(user.id, "report.update", "ChapterReport", id);
      refresh();
      return { data: { id }, message: "Đã cập nhật báo cáo" };
    }
    const r = await db.chapterReport.create({ data: { ...data, departmentId, createdById: user.id } });
    await audit(user.id, "report.create", "ChapterReport", r.id, { departmentId });
    refresh();
    return { data: { id: r.id }, message: "Đã đăng báo cáo" };
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
