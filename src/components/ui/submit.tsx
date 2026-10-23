"use client";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action";

type Ok<T> = Extract<ActionResult<T>, { ok: true }>;

/** Hiển thị toast theo kết quả action. Trả về true (và thu hẹp kiểu) nếu thành công. */
export function reportResult<T>(res: ActionResult<T>, fallbackSuccess?: string): res is Ok<T> {
  if (res.ok) {
    const msg = res.message ?? fallbackSuccess;
    if (msg) toast.success(msg);
    return true;
  }
  toast.error(res.error);
  return false;
}
