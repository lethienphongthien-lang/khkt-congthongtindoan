"use client";
import { useState } from "react";
import { cn } from "@/utils";

/** Các tab của một trang giới thiệu (ví dụ Nội quy). Mọi nội dung đều nằm sẵn trong trang (tốt cho tìm kiếm); chỉ ẩn/hiện theo tab đang chọn. Địa chỉ có ?tab=N để chia sẻ đúng tab. */
export function SiteTabs({ titles, initial = 0, children }: { titles: string[]; initial?: number; children: React.ReactNode[] }) {
  const [active, setActive] = useState(Math.min(Math.max(0, initial), titles.length - 1));
  const pick = (i: number) => { setActive(i); try { const u = new URL(location.href); u.searchParams.set("tab", String(i)); history.replaceState(null, "", u); } catch { /* bỏ qua */ } };
  return (
    <div>
      <div role="tablist" className="mb-3 flex flex-wrap gap-1 border-b border-border">
        {titles.map((t, i) => (
          <button key={i} role="tab" type="button" id={`site-tab-${i}`} aria-selected={i === active} aria-controls={`site-panel-${i}`} onClick={() => pick(i)}
            className={cn("-mb-px border-b-2 px-4 py-2 text-sm font-semibold", i === active ? "border-primary text-primary-dark" : "border-transparent text-muted hover:text-foreground")}>{t}</button>
        ))}
      </div>
      {children.map((c, i) => <div key={i} role="tabpanel" id={`site-panel-${i}`} aria-labelledby={`site-tab-${i}`} hidden={i !== active} className="rounded border border-border bg-white/85 p-5">{c}</div>)}
    </div>
  );
}
