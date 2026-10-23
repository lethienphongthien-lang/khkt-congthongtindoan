import "server-only";
import { ForbiddenError } from "@/lib/permissions";
import { ZodError } from "zod";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export class UserError extends Error {}

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
    console.error("[action]", e);
    return { ok: false, error: "Đã có lỗi xảy ra, vui lòng thử lại" };
  }
}
