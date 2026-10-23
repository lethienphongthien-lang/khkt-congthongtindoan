"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { notifyUser } from "@/lib/notify";
import { emulationBatchSchema, emulationSchema } from "@/lib/validation";
import { defaultCalendar, currentWeek, schoolYearOf, weekRange } from "@/lib/school-calendar";
import { loadCalendars } from "@/lib/services/school-calendar";

export async function createEmulationRecordAction(input: unknown) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const data = emulationSchema.parse(input);
    const dept = await db.department.findUnique({ where: { id: data.departmentId } });
    if (!dept) throw new UserError("Chi đoàn không tồn tại");
    const rec = await db.emulationRecord.create({ data: { ...data, createdById: admin.id } });
    if (dept.secretaryId) {
      await notifyUser(dept.secretaryId, {
        type: "POINTS", title: `Chi đoàn ${dept.name} ${data.points > 0 ? "được cộng" : "bị trừ"} ${Math.abs(data.points)} điểm thi đua`, body: data.reason, link: "/emulation",
      });
    }
    await audit(admin.id, "emulation.create", "Department", dept.id, { recordId: rec.id, points: data.points, reason: data.reason });
    revalidatePath("/emulation");
    return { message: "Đã ghi nhận điểm thi đua" };
  });
}

export async function deleteEmulationRecordAction(id: string) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const rec = await db.emulationRecord.findUnique({ where: { id } });
    if (!rec) throw new UserError("Không tìm thấy bản ghi");
    await db.emulationRecord.delete({ where: { id } });
    await audit(admin.id, "emulation.delete", "Department", rec.departmentId, { recordId: id, points: rec.points, reason: rec.reason });
    revalidatePath("/emulation");
    return { message: "Đã xóa bản ghi" };
  });
}

/** Khoảng thời gian của một tuần trong lịch năm học (theo ngày nằm trong tuần đó). */
async function weekRangeOf(date: Date) {
  const year = schoolYearOf(date);
  const cal = (await loadCalendars()).find((c) => c.startYear === year) ?? defaultCalendar(year);
  const wk = currentWeek(cal, date);
  const range = wk ? weekRange(cal, wk) : null;
  if (!range) throw new UserError("Ngày này nằm ngoài lịch năm học, chưa xác định được tuần");
  return range;
}

/** Điểm thi đua hiện có của từng Chi đoàn trong một tuần (để điền sẵn vào bảng nhập). */
export async function getEmulationWeekAction(year: number, week: number) {
  return run<{ points: Record<string, number> }>(async () => {
    await requireRole(["ADMIN"]);
    const cal = (await loadCalendars()).find((c) => c.startYear === year) ?? defaultCalendar(year);
    const range = weekRange(cal, week);
    if (!range) throw new UserError("Tuần không hợp lệ");
    const sums = await db.emulationRecord.groupBy({ by: ["departmentId"], where: { recordedAt: { gte: range.from, lt: range.to } }, _sum: { points: true } });
    return { data: { points: Object.fromEntries(sums.map((r) => [r.departmentId, r._sum.points ?? 0])) } };
  });
}

/**
 * Ghi điểm thi đua của một tuần cho nhiều Chi đoàn. Mỗi ô là ĐIỂM CỦA CẢ TUẦN: nhập mới thì thay thế điểm cũ của Chi đoàn đó trong tuần
 * (không cộng dồn); nhập 0 để xóa điểm của tuần; ô để trống thì giữ nguyên. Mỗi Chi đoàn tối đa 105 điểm mỗi tuần.
 */
export async function createEmulationBatchAction(input: unknown) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const data = emulationBatchSchema.parse(input);
    const items = data.items;
    if (!items.length) throw new UserError("Chưa nhập điểm cho Chi đoàn nào");
    const depts = await db.department.findMany({ where: { id: { in: items.map((i) => i.departmentId) } }, select: { id: true, name: true, secretaryId: true } });
    const byId = new Map(depts.map((d) => [d.id, d]));
    if (items.some((i) => !byId.has(i.departmentId))) throw new UserError("Có Chi đoàn không tồn tại");
    const range = await weekRangeOf(data.recordedAt);
    const before = await db.emulationRecord.groupBy({ by: ["departmentId"], where: { departmentId: { in: items.map((i) => i.departmentId) }, recordedAt: { gte: range.from, lt: range.to } }, _sum: { points: true } });
    const had = new Map(before.map((r) => [r.departmentId, r._sum.points ?? 0]));
    const changed = items.filter((i) => (had.get(i.departmentId) ?? 0) !== i.points);
    await db.$transaction([
      // Thay thế: xóa điểm cũ của các Chi đoàn được nhập trong tuần này, rồi ghi điểm mới
      db.emulationRecord.deleteMany({ where: { departmentId: { in: items.map((i) => i.departmentId) }, recordedAt: { gte: range.from, lt: range.to } } }),
      db.emulationRecord.createMany({ data: items.filter((i) => i.points !== 0).map((i) => ({ departmentId: i.departmentId, points: i.points, reason: data.reason, recordedAt: data.recordedAt, createdById: admin.id })) }),
    ]);
    for (const i of changed) {
      const d = byId.get(i.departmentId)!;
      if (d.secretaryId) {
        await notifyUser(d.secretaryId, { type: "POINTS", title: `Điểm thi đua tuần của Chi đoàn ${d.name}: ${i.points} điểm`, body: data.reason, link: "/emulation" });
      }
    }
    await audit(admin.id, "emulation.createBatch", "Department", null, { count: items.length, changed: changed.length, reason: data.reason });
    revalidatePath("/emulation");
    return { message: `Đã lưu điểm tuần cho ${items.length} Chi đoàn` };
  });
}
