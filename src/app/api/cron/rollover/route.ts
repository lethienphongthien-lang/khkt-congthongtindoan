import { NextResponse, type NextRequest } from "next/server";
import { syncSchoolYear } from "@/lib/services/rollover";

export const dynamic = "force-dynamic";

/** Chuyển năm học tự động (Vercel Cron mỗi ngày; chạy lại không gây hại). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret ? req.headers.get("authorization") !== `Bearer ${secret}` : process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await syncSchoolYear());
}
