import { NextResponse, type NextRequest } from "next/server";
import { runCleanup } from "@/lib/services/cleanup";

export const dynamic = "force-dynamic";

/** Dọn thông báo/nhật ký cũ (Vercel Cron mỗi ngày; cần CRON_SECRET như các cron khác). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret ? req.headers.get("authorization") !== `Bearer ${secret}` : process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runCleanup());
}
