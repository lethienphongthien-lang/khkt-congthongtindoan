import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canUseTeamChat } from "@/lib/services/team-chat";

export const dynamic = "force-dynamic";

/** Cho trang công khai (cache tĩnh) biết người xem đã đăng nhập chưa và có quyền dùng kênh chat BCH & Bí thư không. Không trả thông tin cá nhân. */
export async function GET() {
  const user = await getCurrentUser();
  const canChat = canUseTeamChat(user);
  return NextResponse.json(
    {
      loggedIn: !!user,
      canChat,
      user: canChat && user ? { id: user.id, fullName: user.fullName, role: user.role } : null,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
