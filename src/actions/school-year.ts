"use server";

import { getT } from "@/lib/i18n/server";
import { assertEduWrite } from "@/lib/services/edu-policy";
import { invalidatePublic } from "@/lib/public-cache";
import { z } from "zod";
import { resetConfiguredCalendar } from "@/lib/services/calendar-settings";
import { db } from "@/lib/db";
import { run } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import type { TFn } from "@/lib/i18n/translate";

const makeSchema = (t: TFn) => z.object({
  startYear: z.number().int().min(2000, t("dash.act.yearInvalid")).max(2100, t("dash.act.yearInvalid")),
  week1Start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t("dash.act.pickWeek1")),
  sem1Weeks: z.number().int().min(1, t("dash.act.sem1Min")).max(30),
  totalWeeks: z.number().int().max(52, t("dash.act.max52")),
}).refine((d) => d.totalWeeks > d.sem1Weeks, { message: t("dash.act.totalGtSem1"), path: ["totalWeeks"] })
  .refine((d) => !Number.isNaN(new Date(`${d.week1Start}T00:00:00Z`).getTime()), { message: t("dash.act.dateInvalid"), path: ["week1Start"] })
  .refine((d) => { const y = Number(d.week1Start.slice(0, 4)); return y === d.startYear || y === d.startYear + 1; }, { message: t("dash.act.week1InYear"), path: ["week1Start"] });

export async function saveSchoolYearAction(input: unknown) {
  return run(async () => {
    const t = await getT();
    const admin = await requireRole(["ADMIN"]);
    await assertEduWrite("years");
    const d = makeSchema(t).parse(input);
    await db.schoolYear.upsert({ where: { startYear: d.startYear }, update: d, create: d });
    await audit(admin.id, "school_year.save", "SchoolYear", String(d.startYear), d);
    invalidatePublic();
    return { message: t("dash.act.yearSaved", { a: d.startYear, b: d.startYear + 1 }) };
  });
}

/** Xóa cấu hình riêng của một năm học (quay về mặc định: Tuần 1 bắt đầu 05/09, 18 + 17 tuần). */
export async function resetSchoolYearAction(startYear: number) {
  return run(async () => {
    const t = await getT();
    const admin = await requireRole(["ADMIN"]);
    await assertEduWrite("years");
    const year = z.number().int().min(2000).max(2100).parse(startYear);
    await resetConfiguredCalendar(year);
    await audit(admin.id, "school_year.reset", "SchoolYear", String(startYear));
    invalidatePublic();
    return { message: t("dash.act.yearReset") };
  });
}
