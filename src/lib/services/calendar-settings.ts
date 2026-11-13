import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { defaultCalendar } from "@/lib/school-calendar";
/** Reset the saved calendar in place so the cross-schema link and sync triggers stay intact. */
export function resetConfiguredCalendar(startYear: number, client: Prisma.TransactionClient | typeof db = db) {
  if (!Number.isInteger(startYear) || startYear < 2000 || startYear > 2100) throw new Error("Năm học không hợp lệ");
  const defaults = defaultCalendar(startYear);
  return client.schoolYear.upsert({ where: { startYear }, create: defaults, update: defaults });
}
