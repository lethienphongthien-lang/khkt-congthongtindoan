"use client";
import { useEffect } from "react";
import { recordVisitAction } from "@/actions/visit";

/** Gọi một lần mỗi ngày khi đoàn viên mở hệ thống để ghi nhận ngày truy cập (+1 điểm). Không hiện gì trên màn hình. */
export function VisitPing({ userId }: { userId: string }) {
  useEffect(() => {
    let key = "";
    try { key = `visit-${userId}-` + new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }); if (localStorage.getItem(key)) return; } catch { /* không có localStorage: vẫn gọi, máy chủ tự chặn trùng */ }
    recordVisitAction().then((r) => { if (r.ok) try { localStorage.setItem(key, "1"); } catch { /* bỏ qua */ } }).catch(() => {});
  }, [userId]);
  return null;
}
