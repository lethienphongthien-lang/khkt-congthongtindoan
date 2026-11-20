import { NextResponse } from "next/server";
import { getT } from "@/lib/i18n/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(req: Request) {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: t("misc.api.unauth") }, { status: 401 });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (typeof endpoint === "string") await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return NextResponse.json({ ok: true });
}
