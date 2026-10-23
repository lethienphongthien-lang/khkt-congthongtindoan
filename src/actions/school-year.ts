"use server";

import { revalidatePath } from "next/cache";
import { invalidatePublic } from "@/lib/public-cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { run } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";

const schema = z.object({
  startYear: z.number().int().min(2000, "Năm học không hợp lệ").max(2100, "Năm học không hợp lệ"),
  week1Start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Chọn ngày bắt đầu Tuần 1"),
  sem1Weeks: z.number().int().min(1, "Học kỳ 1 tối thiểu 1 tuần").max(30),
  totalWeeks: z.number().int().max(52, "Tối đa 52 tuần"),
}).refine((d) => d.totalWeeks > d.sem1Weeks, { message: "Tổng số tuần phải lớn hơn số tuần học kỳ 1", path: ["totalWeeks"] })
  .refine((d) => !Number.isNaN(new Date(`${d.week1Start}T00:00:00Z`).getTime()), { message: "Ngày không hợp lệ", path: ["week1Start"] })
  .refine((d) => { const y = Number(d.week1Start.slice(0, 4)); return y === d.startYear || y === d.startYear + 1; }, { message: "Ngày bắt đầu Tuần 1 phải nằm trong năm học đã chọn", path: ["week1Start"] });

export async function saveSchoolYearAction(input: unknown) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const d = schema.parse(input);
    await db.schoolYear.upsert({ where: { startYear: d.startYear }, update: d, create: d });
    await audit(admin.id, "school_year.save", "SchoolYear", String(d.startYear), d);
    invalidatePublic();
    return { message: `Đã lưu lịch năm học ${d.startYear}–${d.startYear + 1}` };
  });
}

/** Xóa cấu hình riêng của một năm học (quay về mặc định: Tuần 1 bắt đầu 05/09, 18 + 17 tuần). */
export async function resetSchoolYearAction(startYear: number) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    await db.schoolYear.deleteMany({ where: { startYear } });
    await audit(admin.id, "school_year.reset", "SchoolYear", String(startYear));
    invalidatePublic();
    return { message: "Đã đặt lại mặc định" };
  });
}
