import { indexNowKey } from "@/lib/seo";

/** Tệp khóa xác minh quyền sở hữu cho giao thức IndexNow. */
export function GET() {
  const key = indexNowKey();
  return key ? new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } }) : new Response("Not found", { status: 404 });
}
