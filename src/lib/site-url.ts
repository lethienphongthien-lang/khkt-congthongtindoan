/** Địa chỉ gốc của website (không có dấu / cuối): ưu tiên APP_URL, sau đó tên miền Production do Vercel cung cấp, cuối cùng là máy cục bộ. */
export function siteUrl() {
  const raw = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return raw.replace(/\/+$/, "");
}
