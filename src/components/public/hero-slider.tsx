"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cdnImage, cdnSrcSet } from "@/lib/image-url";

export type HeroSlide = { id: string; title: string; href: string; coverUrl: string; date: string; summary?: string | null };

/** Ảnh bìa lớn tự trượt cho các tin nổi bật: 5 giây một ảnh, dừng khi rê chuột/chạm, có mũi tên, chấm và vuốt ngang. */
export function HeroSlider({ slides, interval = 5000, className }: { slides: HeroSlide[]; interval?: number; className?: string }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const n = slides.length;
  const go = useCallback((d: number) => setI((v) => (v + d + n) % n), [n]);
  useEffect(() => {
    if (n < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => go(1), interval);
    return () => clearInterval(t);
  }, [n, paused, go, interval]);
  if (!n) return null;
  const cur = slides[i];
  return (
    <section className={`group relative self-start overflow-hidden rounded ${className ?? ""}`} aria-roledescription="carousel" aria-label="Tin nổi bật"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={(e) => { const s = touch.current; touch.current = null; setPaused(false); if (s == null) return; const dx = e.changedTouches[0].clientX - s; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); }}>
      {/* Ảnh ở trên: tỉ lệ cố định nên luôn vừa khung ở mọi cỡ màn hình */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded bg-slate-200">
        {slides.map((s, k) => (
          <Link key={s.id} href={s.href} tabIndex={k === i ? 0 : -1} aria-hidden={k !== i} aria-label={s.title}
            className={`absolute inset-0 transition-opacity duration-700 ${k === i ? "opacity-100" : "pointer-events-none opacity-0"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cdnImage(s.coverUrl, 1280)} srcSet={cdnSrcSet(s.coverUrl, [640, 960, 1280, 1600, 2000])} sizes="(min-width: 1280px) 42vw, (min-width: 768px) 60vw, 100vw" alt="" className="size-full object-cover object-top" loading={k === 0 ? "eager" : "lazy"} decoding="async" draggable={false} />
          </Link>
        ))}
        {n > 1 && (
          <>
            <button type="button" aria-label="Tin trước" onClick={() => go(-1)} className="absolute top-1/2 left-2 hidden -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60 sm:block"><ChevronLeft className="size-5" /></button>
            <button type="button" aria-label="Tin sau" onClick={() => go(1)} className="absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60 sm:block"><ChevronRight className="size-5" /></button>
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {slides.map((s, k) => <button key={s.id} type="button" aria-label={`Tin ${k + 1}`} aria-current={k === i} onClick={() => setI(k)} className={`h-1.5 rounded-full shadow transition-all ${k === i ? "w-6 bg-[#ffd400]" : "w-1.5 bg-white/80"}`} />)}
            </div>
          </>
        )}
      </div>
      {/* Nội dung ở dưới ảnh */}
      <Link href={cur.href} className="block pt-1.5">
        <h3 className="line-clamp-2 min-h-[2.75rem] text-base leading-snug font-bold hover:text-primary sm:text-lg sm:min-h-[3.25rem]">{cur.title}</h3>
        <p className="text-xs text-muted">{cur.date}</p>
      </Link>
    </section>
  );
}
