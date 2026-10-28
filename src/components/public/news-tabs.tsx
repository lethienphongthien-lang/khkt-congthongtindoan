"use client";
import Link from "next/link";
import { useState } from "react";
import { Eye } from "lucide-react";
import { Thumb, type ThumbSource } from "./thumb";
import { cn } from "@/utils";

export type TabItem = ThumbSource & { id: string; title: string; href: string; date: string; views: number };

/** Khung hai tab "Tin mới / Tin xem nhiều" ở cột phải đầu trang chủ. */
export function NewsTabs({ latest, popular, className }: { latest: TabItem[]; popular: TabItem[]; className?: string }) {
  const [tab, setTab] = useState<"latest" | "popular">("latest");
  const items = tab === "latest" ? latest : popular;
  const tabs = [["latest", "Tin mới"], ["popular", "Tin xem nhiều"]] as const;
  return (
    <section className={cn("rounded bg-white/85 shadow-sm", className)}>
      <div role="tablist" className="flex border-b border-border">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={cn("-mb-px border-t-2 px-3 py-1.5 text-[15px] font-semibold transition-colors", tab === key ? "border-primary text-primary-dark" : "border-transparent text-slate-600 hover:text-primary")}>{label}</button>
        ))}
      </div>
      <ul className="divide-y divide-border px-2">
        {items.map((a) => (
          <li key={a.id} className="group flex gap-2 py-2">
            <Thumb a={a} always className="h-[68px] w-24 shrink-0" />
            <div className="min-w-0">
              <Link href={a.href} className="line-clamp-3 font-serif text-[15px] leading-snug font-semibold group-hover:text-primary">{a.title}</Link>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">{a.date}{tab === "popular" && <span className="inline-flex items-center gap-1"><Eye className="size-3" />{a.views.toLocaleString("vi-VN")}</span>}</p>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="py-6 text-center text-sm text-muted">Chưa có tin.</li>}
      </ul>
    </section>
  );
}
