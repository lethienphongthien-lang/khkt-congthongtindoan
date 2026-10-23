import "server-only";
import { unstable_cache } from "next/cache";

/** Tên các trường ngày giờ: dữ liệu lấy từ bộ nhớ đệm đã bị chuyển sang chuỗi, cần đổi lại thành Date để các trang dùng như cũ. */
const DATE_KEYS = new Set(["publishedAt", "eventAt", "startAt", "endAt", "updatedAt", "createdAt"]);
function revive(v: unknown): unknown {
  if (v instanceof Date) return v; // lần đầu (chưa qua bộ nhớ đệm) vẫn là Date thật: giữ nguyên
  if (Array.isArray(v)) return v.map(revive);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, DATE_KEYS.has(k) && typeof x === "string" ? new Date(x) : revive(x)]));
  return v;
}

export const PUBLIC_TAG = "public";

/**
 * Lưu sẵn kết quả truy vấn cho trang công khai (nhiều người xem, ít đổi): mở trang không cần hỏi cơ sở dữ liệu lại.
 * Tự làm mới khi có thay đổi (gọi `invalidatePublic()` ở thao tác ghi) và luôn hết hạn sau `revalidate` giây để không bao giờ cũ quá lâu.
 * Chỉ dùng cho hàm KHÔNG phụ thuộc người đang xem (không đọc cookie/phiên).
 */
export function cachedPublic<A extends unknown[], R>(name: string, fn: (...args: A) => Promise<R>, revalidate = 60): (...args: A) => Promise<R> {
  const cached = unstable_cache(fn, ["public", name], { tags: [PUBLIC_TAG], revalidate });
  return async (...args: A) => revive(await cached(...args)) as R;
}
