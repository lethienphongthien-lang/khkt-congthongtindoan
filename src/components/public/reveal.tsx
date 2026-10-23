"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils";

/**
 * Khối hiện dần khi cuộn tới (trượt nhẹ lên và rõ dần). Khối đã nằm sẵn trong màn hình lúc mở trang thì hiện ngay, không hiệu ứng;
 * nội dung luôn có trong HTML nên không ảnh hưởng tìm kiếm, và không ẩn gì nếu người dùng đặt "giảm chuyển động".
 */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return; // đã thấy được: giữ nguyên
    setState("hidden");
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setState("shown"); io.disconnect(); } }, { threshold: 0.06, rootMargin: "0px 0px -40px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={state === "shown" && delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(className, state === "hidden" && "translate-y-6 opacity-0", state === "shown" && "translate-y-0 opacity-100 transition duration-700 ease-out")}>
      {children}
    </div>
  );
}
