"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Đưa các nút của biểu mẫu (Đăng, Lưu, Hủy...) lên góc trên bên phải trang, cùng hàng với tên trang.
 * Nút vẫn thuộc biểu mẫu nên dùng được trạng thái đang lưu; nếu không có chỗ gắn thì hiện ngay tại chỗ như cũ.
 */
export function HeaderActions({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { setTarget(document.getElementById("page-actions-slot")); setReady(true); }, []);
  if (!ready) return null;
  if (target) return createPortal(children, target);
  return <div className="flex gap-2">{children}</div>;
}
