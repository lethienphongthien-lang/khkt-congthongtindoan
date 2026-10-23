"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const LIST = "doan:list:";
const SCROLL = "doan:scroll:";
// Các trang không cần nhớ bộ lọc (không phải danh sách, hoặc muốn luôn mở từ đầu)
const SKIP = new Set(["/", "/settings", "/profile", "/dashboard", "/checkin", "/login"]);
const looksLikeId = (s: string) => s.length >= 20 || /^\d+$/.test(s);
const isListPath = (path: string) => {
  if (SKIP.has(path)) return false;
  const segs = path.split("/").filter(Boolean);
  const last = segs[segs.length - 1] ?? "";
  return !(last === "new" || last === "edit" || (segs.length >= 2 && looksLikeId(last)));
};
const get = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string | null) => { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch { /* bộ nhớ đầy hoặc bị chặn: bỏ qua */ } };

/**
 * Nhớ trạng thái các trang danh sách trong phiên làm việc:
 * 1) bộ lọc, cách sắp xếp, số trang: bấm vào mục menu của một danh sách vừa xem sẽ mở lại đúng bộ lọc cũ (bấm menu khi đang ở chính trang đó thì đặt lại từ đầu);
 * 2) vị trí cuộn: quay lại trang bằng nút Quay lại thì cuộn về đúng chỗ đang xem dở.
 */
export function ListStateKeeper() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const popped = useRef(false);

  // ghi nhớ bộ lọc hiện tại của trang danh sách
  useEffect(() => {
    if (isListPath(pathname)) set(LIST + pathname, search || null);
  }, [pathname, search]);

  // bắt cú bấm liên kết: lưu vị trí cuộn trang đang rời đi; liên kết tới danh sách không kèm bộ lọc thì thêm bộ lọc đã nhớ
  useEffect(() => {
    const onPop = () => { popped.current = true; };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      set(SCROLL + location.pathname + location.search, String(Math.round(window.scrollY)));
      if (url.search || url.hash || url.pathname === location.pathname || !isListPath(url.pathname)) return;
      const saved = get(LIST + url.pathname);
      if (!saved) return;
      e.preventDefault(); e.stopPropagation();
      router.push(`${url.pathname}?${saved}`);
    };
    window.addEventListener("popstate", onPop);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener("popstate", onPop); document.removeEventListener("click", onClick, true); };
  }, [router]);

  // quay lại bằng nút Quay lại/Back của trình duyệt: khôi phục vị trí cuộn đã lưu (chờ nội dung tải đủ cao rồi mới cuộn)
  useEffect(() => {
    if (!popped.current) return;
    popped.current = false;
    const y = Number(get(SCROLL + pathname + (search ? `?${search}` : "")));
    if (!y) return;
    let tries = 0;
    const tick = () => {
      if (document.documentElement.scrollHeight >= y + window.innerHeight * 0.5 || tries++ > 25) window.scrollTo({ top: y });
      else requestAnimationFrame(tick);
    };
    const t = setTimeout(tick, 60);
    return () => clearTimeout(t);
  }, [pathname, search]);

  return null;
}
