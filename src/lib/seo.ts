import "server-only";
import { createHash } from "node:crypto";
import { after } from "next/server";
import { siteUrl } from "@/lib/site-url";

/** Khóa IndexNow tự sinh từ AUTH_SECRET (không cần cấu hình thêm); công khai ở /indexnow.txt để công cụ tìm kiếm xác minh quyền sở hữu. */
export function indexNowKey() {
  const secret = process.env.AUTH_SECRET;
  return secret ? createHash("sha256").update(`indexnow:${secret}`).digest("hex").slice(0, 32) : null;
}

/**
 * Báo cho các công cụ tìm kiếm (Bing, Yandex, Naver, Seznam… qua giao thức IndexNow) biết các trang vừa thêm/sửa/xóa để lập chỉ mục sớm.
 * Chạy sau khi đã trả lời người dùng, không bao giờ làm hỏng thao tác chính. Google không nhận cách này: Google tự đọc sitemap.xml
 * (cập nhật tự động theo bài đăng) và tự quay lại thu thập.
 */
export function pingSearchEngines(paths: string[]) {
  const key = indexNowKey();
  const base = siteUrl();
  if (!key || base.includes("localhost") || !paths.length) return;
  const urlList = [...new Set(paths)].map((p) => `${base}${p}`);
  after(async () => {
    try {
      const res = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, signal: AbortSignal.timeout(8000),
        body: JSON.stringify({ host: new URL(base).host, key, keyLocation: `${base}/indexnow.txt`, urlList }),
      });
      if (!res.ok && res.status !== 202) console.error("[indexnow]", res.status, urlList.length, "địa chỉ");
    } catch (e) { console.error("[indexnow]", e instanceof Error ? e.message : e); }
  });
}
