"use client";
import { useEffect, useRef } from "react";
import { recordViewAction } from "@/actions/visit";

/** Ghi một lượt xem mỗi lần mở bài viết (tải lại trang cũng tính). */
export function ViewTracker({ id, kind = "article" }: { id: string; kind?: "article" | "report" | "page" }) {
  const sent = useRef(false); // chế độ dev của React chạy hiệu ứng hai lần: chỉ gửi một lần cho mỗi lần mở trang
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void recordViewAction(kind, id);
  }, [id]);
  return null;
}
