"use client";
import { useEffect, useRef } from "react";

/**
 * Trên mobile bảng được hiển thị dạng danh sách thẻ (CSS trong globals.css, lớp .rtable).
 * Component này gắn data-label cho từng ô theo tiêu đề cột để CSS hiển thị nhãn.
 */
export function ResponsiveTable({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const table = ref.current;
    if (!table) return;
    const label = () => {
      const heads = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent?.trim() ?? "");
      table.querySelectorAll("tbody tr").forEach((tr) => {
        Array.from(tr.children).forEach((td, i) => {
          if (td.getAttribute("data-label") !== (heads[i] ?? "")) td.setAttribute("data-label", heads[i] ?? "");
        });
      });
    };
    label();
    const mo = new MutationObserver(label);
    mo.observe(table, { childList: true, subtree: true, characterData: true });
    return () => mo.disconnect();
  }, []);

  return <table ref={ref} className="rtable w-full text-left text-sm [&_tr:last-child_td]:border-b-0">{children}</table>;
}
