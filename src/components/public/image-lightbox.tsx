"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

/** Bao quanh nội dung có ảnh: bấm vào ảnh (không nằm trong liên kết) để xem ảnh rộng toàn màn hình; bấm nền, nút đóng hoặc Esc để thoát. */
export function ImageLightbox({ children, className, html }: { children?: React.ReactNode; className?: string; html?: string }) {
  const [view, setView] = useState<{ src: string; alt: string } | null>(null);
  useEffect(() => {
    if (!view) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setView(null);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [view]);
  const open = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.tagName !== "IMG" || t.closest("a")) return;
    const img = t as HTMLImageElement;
    setView({ src: img.currentSrc || img.src, alt: img.alt });
  };
  return (
    <>
      {html !== undefined
        ? <div className={`${className ?? ""} [&_img]:cursor-zoom-in`} onClick={open} dangerouslySetInnerHTML={{ __html: html }} />
        : <div className={`${className ?? ""} [&_img]:cursor-zoom-in`} onClick={open}>{children}</div>}
      {view && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-2" role="dialog" aria-label="Xem ảnh" onClick={() => setView(null)}>
          <button type="button" aria-label="Đóng" className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 rounded-full bg-white/15 p-2 text-white" onClick={() => setView(null)}><X className="size-6" /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={view.src} alt={view.alt} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </>
  );
}
