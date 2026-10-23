/**
 * Tối ưu ảnh lưu trên Cloudinary khi hiển thị: tự chọn định dạng nhẹ nhất mà trình duyệt hỗ trợ (WebP/AVIF), nén vừa đủ,
 * và thu nhỏ về bề rộng cần dùng (không bao giờ phóng to). `width` nên bằng khoảng 1,5–2 lần bề rộng hiển thị để ảnh vẫn nét trên màn hình độ phân giải cao. Ảnh khác hoặc đã có biến đổi sẵn thì giữ nguyên.
 */
export function cdnImage(url: string | null | undefined, width: number): string | undefined {
  if (!url) return undefined;
  const m = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/);
  if (!m) return url;
  const first = m[2].split("/")[0];
  if (!/^v\d+$/.test(first) && first.includes("_")) return url; // đã có biến đổi (ví dụ ảnh trang đầu PDF)
  return `${m[1]}f_auto,q_auto:good,w_${width},c_limit/${m[2]}`;
}

/** Danh sách `srcset` nhiều bề rộng để trình duyệt tự chọn bản vừa màn hình (điện thoại tải bản nhỏ, tiết kiệm băng thông Cloudinary). Ảnh không thuộc Cloudinary trả về undefined. */
export function cdnSrcSet(url: string | null | undefined, widths: number[]): string | undefined {
  if (!url || !/^https:\/\/res\.cloudinary\.com\//.test(url)) return undefined;
  return widths.map((w) => `${cdnImage(url, w)} ${w}w`).join(", ");
}
