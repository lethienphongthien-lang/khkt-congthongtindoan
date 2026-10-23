import "server-only";
import { db } from "@/lib/db";
import { UserError } from "@/lib/action";

/** Giới hạn lượt dùng AI mỗi người trong 24 giờ, đếm theo nhật ký hệ thống (mỗi loại tác vụ một hạn mức riêng). */
export async function takeAiQuota(userId: string, action: "ai.assist", limit: number): Promise<number> {
  const used = await db.auditLog.count({ where: { userId, action, createdAt: { gte: new Date(Date.now() - 24 * 3600_000) } } });
  if (used >= limit) throw new UserError(`Bạn đã dùng hết ${limit} lượt AI trong 24 giờ, hãy quay lại sau`);
  return limit - used - 1; // số lượt còn lại sau lượt này
}
