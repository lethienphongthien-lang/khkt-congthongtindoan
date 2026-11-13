import "server-only";
import { ForbiddenError } from "@/lib/permissions";
import { ZodError } from "zod";
import { EDU_LABEL, type EduDomain } from "@/lib/edu-policy-types";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export class UserError extends Error {}

/** Lỗi do trigger của database (migration shared_delete_and_write_guard) khi EduConnect khóa quyền ghi hoặc lớp có dữ liệu: đưa nguyên thông báo tiếng Việt cho người dùng. */
function eduDbMessage(e: unknown): string | null {
  const msg = e instanceof Error ? e.message : "";
  const locked = /Dữ liệu do EduConnect quản lý \((years|classes|placement|profiles)\)/.exec(msg);
  if (locked) return `${EDU_LABEL[locked[1] as EduDomain]} do EduConnect quản lý. Nhờ quản trị viên EduConnect thực hiện, hoặc cấp quyền ở Cấu hình → Cổng Đoàn.`;
  const linked = /Chi đoàn [^\n`"]*? là lớp của EduConnect[^\n`"]*/.exec(msg);
  return linked ? linked[0] : null;
}

/** Bọc server action: chuẩn hóa lỗi, không rò rỉ chi tiết nội bộ. */
export async function run<T>(fn: () => Promise<ActionResult<T> | { message?: string; data?: T } | void>): Promise<ActionResult<T>> {
  try {
    const res = await fn();
    if (res && "ok" in res) return res as ActionResult<T>;
    return { ok: true, data: (res as { data?: T } | undefined)?.data, message: (res as { message?: string } | undefined)?.message };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    if (e instanceof UserError || e instanceof ForbiddenError) return { ok: false, error: e.message };
    if (e instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of e.issues) {
        const key = issue.path.join(".") || "_";
        (fieldErrors[key] ??= []).push(issue.message);
      }
      return { ok: false, error: e.issues[0]?.message ?? "Dữ liệu không hợp lệ", fieldErrors };
    }
    const dbMsg = eduDbMessage(e);
    if (dbMsg) return { ok: false, error: dbMsg };
    console.error("[action]", e);
    return { ok: false, error: "Đã có lỗi xảy ra, vui lòng thử lại" };
  }
}
