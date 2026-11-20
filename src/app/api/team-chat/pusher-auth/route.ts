import { NextResponse } from "next/server";
import { getT } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canUseTeamChat } from "@/lib/services/team-chat";
import { getPusher, TEAM_CHANNEL } from "@/lib/realtime";

/** Cấp quyền cho trình duyệt đăng ký kênh riêng tư: chỉ ai đang là Ban chấp hành hoặc Bí thư. Hết vai trò là không đăng ký lại được. */
export async function POST(req: Request) {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword || !canUseTeamChat(user)) return NextResponse.json({ error: t("misc.api.forbidden") }, { status: 403 });
  const pusher = getPusher();
  if (!pusher) return NextResponse.json({ error: t("misc.api.noRealtime") }, { status: 503 });
  const form = await req.formData();
  const socketId = String(form.get("socket_id") ?? ""), channel = String(form.get("channel_name") ?? "");
  if (channel !== TEAM_CHANNEL || !/^\d+\.\d+$/.test(socketId)) return NextResponse.json({ error: t("misc.api.badReq") }, { status: 400 });
  return NextResponse.json(pusher.authorizeChannel(socketId, channel));
}
