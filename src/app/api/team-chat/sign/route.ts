import { NextResponse } from "next/server";
import { getT } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isCloudinaryConfigured, signUpload } from "@/lib/cloudinary";
import { canUseTeamChat } from "@/lib/services/team-chat";

/** Trả chữ ký để trình duyệt tải tệp (ảnh, video, tài liệu) thẳng lên Cloudinary. Chỉ thành viên kênh. */
export async function POST() {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return NextResponse.json({ error: t("misc.api.unauth") }, { status: 401 });
  if (!canUseTeamChat(user)) return NextResponse.json({ error: t("misc.api.forbidden") }, { status: 403 });
  if (!isCloudinaryConfigured()) return NextResponse.json({ error: t("misc.api.noCloud") }, { status: 503 });
  return NextResponse.json(signUpload("chat"), { headers: { "Cache-Control": "no-store" } });
}
