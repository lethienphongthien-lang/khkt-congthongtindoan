import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { UserError } from "@/lib/action";
import { hasEduIntegration } from "./edu-integration";
import { EDU_LABEL, EDU_OPEN, type EduDomain, type EduPolicy } from "@/lib/edu-policy-types";

export type { EduDomain, EduPolicy } from "@/lib/edu-policy-types";
const LABEL = EDU_LABEL;
const OPEN = EDU_OPEN;

/**
 * Quyền ghi của Cổng Đoàn với dữ liệu dùng chung. Chỉ có hiệu lực khi đồng bộ với EduConnect đang bật và bảng chính sách đã cài;
 * chạy riêng (hoặc lỗi đọc) thì mở hết để không làm hỏng Cổng Đoàn.
 */
export const getEduPolicy = cache(async (): Promise<EduPolicy> => {
  try {
    if (!(await hasEduIntegration())) return OPEN;
    const [ready] = await db.$queryRaw<{ ready: boolean }[]>`SELECT to_regclass('edu."DoanWritePolicy"') IS NOT NULL AND coalesce((SELECT enabled FROM edu."SyncSetting" WHERE id = 1), false) AS ready`;
    if (!ready.ready) return OPEN;
    const [p] = await db.$queryRaw<Record<EduDomain, boolean>[]>`SELECT years, classes, placement, profiles FROM edu."DoanWritePolicy" WHERE id = 1`;
    if (!p) return OPEN;
    return { ...p, managed: !(p.years && p.classes && p.placement && p.profiles) };
  } catch (e) {
    console.error("edu policy read failed", e);
    return OPEN;
  }
});

/** Ném UserError nếu một trong các nhóm đang bị EduConnect khóa. */
export async function assertEduWrite(...domains: EduDomain[]) {
  const p = await getEduPolicy();
  const locked = domains.filter((d) => !p[d]);
  if (locked.length) throw new UserError(`${locked.map((d) => LABEL[d]).join(", ")} do EduConnect quản lý. Nhờ quản trị viên EduConnect thực hiện, hoặc cấp quyền cho Cổng Đoàn ở Cấu hình → Cổng Đoàn.`);
}

