import "server-only";
import { db } from "@/lib/db";

const VN = 7 * 3600_000;
const DAY = 86_400_000;

/** Ngày hiện tại theo giờ Việt Nam, dạng YYYY-MM-DD. */
export const vnDay = (d: Date = new Date()) => new Date(d.getTime() + VN).toISOString().slice(0, 10);
const addDays = (day: string, n: number) => new Date(new Date(`${day}T00:00:00Z`).getTime() + n * DAY).toISOString().slice(0, 10);
/** Thứ Hai của tuần chứa ngày `day` (YYYY-MM-DD). */
const mondayOf = (day: string) => addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));

/**
 * Ghi nhận một ngày truy cập hệ thống của đoàn viên: +1 điểm mỗi ngày, không cộng thêm khi truy cập lại trong ngày.
 * Dữ liệu ghi theo giờ máy chủ (giờ Việt Nam) nên không thể sửa ngày. Trả `created: true` nếu hôm nay là lần đầu.
 */
export async function recordVisit(memberId: string, now: Date = new Date()): Promise<{ created: boolean }> {
  const day = vnDay(now);
  if (await db.dailyCheckin.findUnique({ where: { memberId_day: { memberId, day } }, select: { id: true } })) return { created: false };
  const [y, m, d] = day.split("-");
  try {
    await db.$transaction(async (tx) => {
      await tx.dailyCheckin.create({ data: { memberId, day, streak: 1 } });
      await tx.pointTransaction.create({ data: { memberId, type: "DAILY", points: 1, reason: `Truy cập hệ thống ngày ${d}/${m}/${y}` } });
      await tx.member.update({ where: { id: memberId }, data: { totalPoints: { increment: 1 } } });
    });
    return { created: true };
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") return { created: false }; // hai thiết bị mở cùng lúc
    throw e;
  }
}

/** Số ngày đã truy cập trong tuần này (từ thứ Hai) và tổng số ngày, để hiển thị cho đoàn viên. */
export async function visitStatus(memberId: string, now: Date = new Date()) {
  const day = vnDay(now);
  const monday = mondayOf(day);
  const [today, week, total] = await Promise.all([
    db.dailyCheckin.findUnique({ where: { memberId_day: { memberId, day } }, select: { id: true } }),
    db.dailyCheckin.count({ where: { memberId, day: { gte: monday, lte: day } } }),
    db.dailyCheckin.count({ where: { memberId } }),
  ]);
  return { visitedToday: !!today, daysThisWeek: week, totalDays: total };
}
