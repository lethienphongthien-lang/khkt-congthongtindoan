"use client";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Khớp với experimental.staleTimes.dynamic trong next.config.ts (giây)
const CACHE_MS = 20_000;
const seen = new Map<string, number>();

/**
 * Trang xem lại trong thời gian bộ nhớ đệm sẽ hiện ngay (mượt, không khung chờ) nhưng có thể là bản cũ.
 * Thành phần này nhận ra trường hợp đó và âm thầm lấy dữ liệu mới ở nền; trang tự cập nhật tại chỗ, không chớp.
 * Lần xem đầu tiên (đã tải mới từ máy chủ) thì không cần làm gì.
 */
export function FreshOnRevisit() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams().toString();
  useEffect(() => {
    const key = `${pathname}?${sp}`;
    const last = seen.get(key);
    seen.set(key, Date.now());
    if (last !== undefined && Date.now() - last < CACHE_MS) router.refresh();
  }, [pathname, sp, router]);
  return null;
}
