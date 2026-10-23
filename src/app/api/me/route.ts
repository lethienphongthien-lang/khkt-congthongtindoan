import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Cho trang công khai (cache tĩnh) biết người xem đã đăng nhập chưa, để đổi nút "Đăng nhập" thành "Quản lý". Không trả thông tin cá nhân. */
export async function GET() {
  return NextResponse.json({ loggedIn: !!(await getSessionUserId()) }, { headers: { "Cache-Control": "private, no-store" } });
}
