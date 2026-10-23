"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";
import { DetailSkeleton, FormSkeleton, PageSkeleton, PublicSkeleton, QuizFormSkeleton } from "@/components/ui/skeleton";

export const NAVIGATE_EVENT = "app:navigate";
/** Báo cho khung chờ biết sắp chuyển trang (dùng cho chuyển trang bằng code như router.push, không phải thẻ <a>). */
export const announceNavigation = (href: string) => window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: href }));

const looksLikeId = (s: string) => s.length >= 20 || /^\d+$/.test(s);
function skeletonFor(path: string, variant: "admin" | "public") {
  if (variant === "public") return <PublicSkeleton />;
  const segs = path.split("/").filter(Boolean);
  const last = segs[segs.length - 1] ?? "";
  if (last === "new" || last === "edit") return segs[0] === "quizzes" ? <QuizFormSkeleton /> : <FormSkeleton />;
  if (segs.length >= 2 && looksLikeId(last) && segs[0] !== "departments") return <DetailSkeleton />;
  return <PageSkeleton />;
}

/**
 * Khung chờ hiện NGAY khi bấm chuyển trang (không đợi máy chủ trả lời): bắt cú bấm vào liên kết nội bộ hoặc thông báo từ ClickRow,
 * phủ khung xám lên vùng nội dung cho tới khi đường dẫn mới được nạp. Chỉ áp dụng khi đổi sang TRANG KHÁC (đổi bộ lọc/tab cùng trang thì không phủ).
 */
export function NavigationSkeleton({ children, className, variant = "admin" }: { children: React.ReactNode; className?: string; variant?: "admin" | "public" }) {
  const pathname = usePathname();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => { setTarget(null); }, [pathname]);
  useEffect(() => {
    const go = (href: string) => {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      window.scrollTo({ top: 0 });
      setTarget(url.pathname);
    };
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.getAttribute("href")?.startsWith("#")) return;
      if (/^(mailto|tel):/.test(a.getAttribute("href") ?? "") || a.getAttribute("href")?.startsWith("/api/")) return;
      go(a.href);
    };
    const onEvent = (e: Event) => go(String((e as CustomEvent).detail));
    document.addEventListener("click", onClick, true);
    window.addEventListener(NAVIGATE_EVENT, onEvent);
    return () => { document.removeEventListener("click", onClick, true); window.removeEventListener(NAVIGATE_EVENT, onEvent); };
  }, []);
  // phòng khi chuyển trang bị hủy hoặc lỗi: tự gỡ khung chờ sau 12 giây
  useEffect(() => { if (!target) return; const t = setTimeout(() => setTarget(null), 12000); return () => clearTimeout(t); }, [target]);

  return (
    <div className={cn("relative", className)}>
      {/* trang cũ ẩn đi nhưng vẫn giữ chỗ (không đổi chiều cao); không dùng nền đặc để hình huy hiệu phía sau không bị che rồi hiện lại */}
      <div className={target ? "invisible" : undefined}>{children}</div>
      {target && <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>{skeletonFor(target, variant)}</div>}
    </div>
  );
}
