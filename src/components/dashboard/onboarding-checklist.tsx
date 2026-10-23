"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/utils";

export type OnboardingStep = { label: string; hint: string; href: string; done: boolean };

/** Hướng dẫn làm quen cho bí thư mới: các bước đầu tiên, tự đánh dấu hoàn thành theo dữ liệu thật; tự ẩn khi xong hết hoặc khi bấm "Để sau". */
export function OnboardingChecklist({ userId, title, steps }: { userId: string; title: string; steps: OnboardingStep[] }) {
  const key = `doan:onboarding:${userId}`;
  const [hidden, setHidden] = useState(true); // ẩn cho tới khi biết người dùng đã đóng chưa (tránh nháy)
  useEffect(() => { try { setHidden(localStorage.getItem(key) === "1"); } catch { setHidden(false); } }, [key]);
  const done = steps.filter((s) => s.done).length;
  if (hidden || done === steps.length) return null;
  const next = steps.findIndex((s) => !s.done);
  const close = () => { try { localStorage.setItem(key, "1"); } catch { /* bỏ qua */ } setHidden(true); };
  return (
    <section aria-label="Hướng dẫn làm quen" className="mb-6 rounded-lg border border-primary/30 bg-primary-light/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-primary-dark">{title}</h2>
          <p className="mt-0.5 text-sm text-muted">Làm lần lượt vài bước dưới đây để dùng hệ thống thuận tay. Đã xong {done}/{steps.length} bước.</p>
        </div>
        <button type="button" onClick={close} className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[13px] text-muted hover:bg-white/60" title="Ẩn hướng dẫn này"><X className="size-3.5" />Để sau</button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.label}>
            <Link href={s.href} className={cn("flex items-start gap-3 rounded-md border bg-white/85 p-3 hover:border-primary", i === next ? "border-primary ring-1 ring-primary" : "border-border")}>
              <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold", s.done ? "border-primary bg-primary text-white" : "border-slate-300 text-slate-500")}>{s.done ? <Check className="size-3" /> : i + 1}</span>
              <span className="min-w-0"><span className={cn("block text-sm font-medium", s.done && "text-muted line-through")}>{s.label}</span><span className="block text-xs text-muted">{s.hint}</span></span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
