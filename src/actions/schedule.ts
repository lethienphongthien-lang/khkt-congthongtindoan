"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { notifyUsers } from "@/lib/notify";
import { defaultCalendar, weekRange, weekLabel, yearLabel } from "@/lib/school-calendar";
import { loadCalendars } from "@/lib/services/school-calendar";

const DAY = 86400_000;
const VN = 7 * 3600_000;
const midnight = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d) - VN); };

const itemSchema = z.object({
  startYear: z.number().int(),
  week: z.number().int().min(1).max(52),
  itemId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Chọn ngày"),
  // Thời gian chọn từ bộ chọn giờ: "Cả ngày", "07:30" hoặc "07:30 – 09:00"
  time: z.string().trim().regex(/^(Cả ngày|([01]\d|2[0-3]):[0-5]\d( – ([01]\d|2[0-3]):[0-5]\d)?)$/, "Chọn thời gian"),
  content: z.string().trim().min(3, "Nhập nội dung công việc").max(500),
  assignee: z.string().trim().max(150).optional(),
  place: z.string().trim().max(150).optional(),
});

async function calendarOf(startYear: number) {
  return (await loadCalendars()).find((c) => c.startYear === startYear) ?? defaultCalendar(startYear);
}

const paths = () => { revalidatePath("/schedule"); revalidatePath("/lich-cong-tac"); };

export async function saveScheduleItemAction(input: unknown) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const d = itemSchema.parse(input);
    const cal = await calendarOf(d.startYear);
    const range = weekRange(cal, d.week);
    if (!range) throw new UserError("Tuần không hợp lệ");
    const date = midnight(d.date);
    if (date < range.from || date >= range.to) throw new UserError("Ngày phải nằm trong tuần đã chọn");
    const schedule = await db.weeklySchedule.upsert({ where: { startYear_week: { startYear: d.startYear, week: d.week } }, update: {}, create: { startYear: d.startYear, week: d.week } });
    const data = { date, time: d.time || null, content: d.content, assignee: d.assignee || null, place: d.place || null };
    if (d.itemId) {
      const cur = await db.weeklyScheduleItem.findFirst({ where: { id: d.itemId, scheduleId: schedule.id } });
      if (!cur) throw new UserError("Không tìm thấy công việc");
      await db.weeklyScheduleItem.update({ where: { id: cur.id }, data });
    } else {
      await db.weeklyScheduleItem.create({ data: { ...data, scheduleId: schedule.id } });
    }
    await audit(admin.id, d.itemId ? "schedule.update_item" : "schedule.add_item", "WeeklySchedule", schedule.id, { week: d.week });
    paths();
    return { message: d.itemId ? "Đã cập nhật" : "Đã thêm công việc" };
  });
}

export async function deleteScheduleItemAction(itemId: string) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const it = await db.weeklyScheduleItem.findUnique({ where: { id: itemId } });
    if (!it) throw new UserError("Không tìm thấy công việc");
    await db.weeklyScheduleItem.delete({ where: { id: itemId } });
    await audit(admin.id, "schedule.delete_item", "WeeklySchedule", it.scheduleId);
    paths();
    return { message: "Đã xóa" };
  });
}

/** Công bố / hủy công bố lịch của một tuần. Công bố có thể kèm gửi thông báo cho mọi người dùng. */
export async function setSchedulePublishedAction(input: { startYear: number; week: number; published: boolean; notify?: boolean }) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const cal = await calendarOf(input.startYear);
    if (!weekRange(cal, input.week)) throw new UserError("Tuần không hợp lệ");
    const s = await db.weeklySchedule.findUnique({ where: { startYear_week: { startYear: input.startYear, week: input.week } }, include: { _count: { select: { items: true } } } });
    if (!s || s._count.items === 0) throw new UserError("Tuần này chưa có công việc nào để công bố");
    await db.weeklySchedule.update({ where: { id: s.id }, data: { published: input.published, publishedAt: input.published ? s.publishedAt ?? new Date() : s.publishedAt } });
    if (input.published && input.notify) {
      const users = await db.user.findMany({ where: { status: "ACTIVE", id: { not: admin.id } }, select: { id: true } });
      await notifyUsers(users.map((u) => u.id), { type: "SYSTEM", title: `Lịch công tác ${weekLabel(cal, input.week)}`, body: `Năm học ${yearLabel(input.startYear)}`, link: `/lich-cong-tac?nh=${input.startYear}&tuan=${input.week}` });
    }
    await audit(admin.id, input.published ? "schedule.publish" : "schedule.unpublish", "WeeklySchedule", s.id, { week: input.week });
    paths();
    return { message: input.published ? (input.notify ? "Đã công bố và gửi thông báo" : "Đã công bố lịch") : "Đã hủy công bố" };
  });
}

/** Sao chép toàn bộ công việc của tuần trước sang tuần này (dời đúng 7 ngày), giúp soạn nhanh lịch lặp lại. */
export async function copyPreviousWeekAction(input: { startYear: number; week: number }) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    if (input.week <= 1) throw new UserError("Đây là tuần đầu tiên, không có tuần trước");
    const prev = await db.weeklySchedule.findUnique({ where: { startYear_week: { startYear: input.startYear, week: input.week - 1 } }, include: { items: true } });
    if (!prev || prev.items.length === 0) throw new UserError("Tuần trước chưa có công việc nào");
    const schedule = await db.weeklySchedule.upsert({ where: { startYear_week: { startYear: input.startYear, week: input.week } }, update: {}, create: { startYear: input.startYear, week: input.week } });
    await db.weeklyScheduleItem.createMany({
      data: prev.items.map((i) => ({ scheduleId: schedule.id, date: new Date(i.date.getTime() + 7 * DAY), time: i.time, content: i.content, assignee: i.assignee, place: i.place, sortOrder: i.sortOrder })),
    });
    await audit(admin.id, "schedule.copy_week", "WeeklySchedule", schedule.id, { from: input.week - 1, count: prev.items.length });
    paths();
    return { message: `Đã sao chép ${prev.items.length} công việc từ tuần trước` };
  });
}
