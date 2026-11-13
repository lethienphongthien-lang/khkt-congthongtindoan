import { NextResponse, type NextRequest } from "next/server";
import { syncSchoolYear } from "@/lib/services/rollover";

export const dynamic = "force-dynamic";

/** Chuyển năm học: KHÔNG còn chạy theo lịch (đã gỡ khỏi vercel.json); admin chạy bằng nút "Cập nhật năm học". Đường dẫn này chỉ để gọi tay có CRON_SECRET; chạy lại không gây hại. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret ? req.headers.get("authorization") !== `Bearer ${secret}` : process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await syncSchoolYear());
}
