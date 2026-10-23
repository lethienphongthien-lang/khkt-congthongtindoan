"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");

/** Đếm ngược tới một mốc (ISO). Hết hạn thì tự ẩn. */
export function Countdown({ title, target, link }: { title: string; target: string; link?: string }) {
  const end = new Date(target).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now !== null && now >= end) return null;
  const left = Math.max(0, end - (now ?? end));
  const parts = [
    ["Ngày", Math.floor(left / 86_400_000)], ["Giờ", Math.floor(left / 3_600_000) % 24], ["Phút", Math.floor(left / 60_000) % 60], ["Giây", Math.floor(left / 1000) % 60],
  ] as const;
  const body = (
    <div className="flex flex-col items-center gap-3 rounded bg-gradient-to-r from-primary-dark to-primary px-4 py-4 text-white shadow-md sm:flex-row sm:justify-between sm:px-6">
      <div className="flex items-center gap-3 text-center sm:text-left">
        <CalendarClock className="hidden size-9 shrink-0 text-[#ffd400] sm:block" />
        <div><p className="text-xs font-semibold tracking-widest text-blue-200 uppercase">Sắp diễn ra</p><h2 className="text-lg font-extrabold text-[#ffd400] sm:text-2xl">{title}</h2></div>
      </div>
      <div className="flex gap-2 sm:gap-3" aria-label="Thời gian còn lại">
        {parts.map(([label, n]) => (
          <div key={label} className="w-14 rounded bg-white/15 py-1.5 text-center sm:w-16">
            <div className="text-2xl leading-none font-extrabold tabular-nums sm:text-3xl">{now === null ? "--" : pad(n)}</div>
            <div className="mt-0.5 text-[11px] text-blue-100">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
  return link ? <Link href={link} className="block hover:opacity-95">{body}</Link> : body;
}
