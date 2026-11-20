"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { PHONE_RE } from "@/lib/validation/rules";
import { notifyUsers } from "@/lib/notify";
import { getT } from "@/lib/i18n/server";
import type { TFn } from "@/lib/i18n/translate";

const feedbackSchema = (t: TFn) => z.object({
  category: z.string().trim().max(60).optional(),
  content: z.string().trim().min(10, t("community.cf2.tooShort")).max(2000, t("community.v.max", { n: 2000 })),
  contact: z.string().trim().max(120).optional().refine((v) => !v || PHONE_RE.test(v) || z.string().email().safeParse(v).success, t("community.sa.contactInvalid")),
  website: z.string().max(0).optional(), // ô ẩn chống bot
});

/** Gửi góp ý ẩn danh từ trang công khai (không cần đăng nhập, không lưu danh tính). */
export async function submitFeedbackAction(input: unknown) {
  return run(async () => {
    const t = await getT();
    const parsed = feedbackSchema(t).safeParse(input);
    if (!parsed.success) {
      if ((input as { website?: string } | null)?.website) return { message: t("community.sa.fbThanksShort") }; // bot: giả vờ thành công
      throw parsed.error;
    }
    const d = parsed.data;
    // Giới hạn tổng số góp ý mỗi giờ để chặn spam (không phụ thuộc IP).
    const recent = await db.feedback.count({ where: { createdAt: { gte: new Date(Date.now() - 3600_000) } } });
    if (recent >= 30) throw new UserError(t("community.sa.fbBusy"));
    const f = await db.feedback.create({ data: { category: d.category || null, content: d.content, contact: d.contact || null } });
    const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
    await notifyUsers(admins.map((a) => a.id), { type: "SYSTEM", title: "Có góp ý mới", body: d.content.slice(0, 80), link: `/feedback/${f.id}` });
    revalidatePath("/feedback");
    return { message: t("community.sa.fbThanks") };
  });
}

export async function updateFeedbackAction(id: string, input: { status: "NEW" | "READ" | "RESOLVED"; note?: string }) {
  return run(async () => {
    const t = await getT();
    const admin = await requireRole(["ADMIN"]);
    const status = z.enum(["NEW", "READ", "RESOLVED"]).parse(input.status);
    await db.feedback.update({ where: { id }, data: { status, note: input.note?.trim().slice(0, 1000) || null } });
    await audit(admin.id, "feedback.update", "Feedback", id, { status });
    revalidatePath("/feedback");
    return { message: t("community.sa.fbUpdated") };
  });
}

export async function deleteFeedbackAction(id: string) {
  return run(async () => {
    const t = await getT();
    const admin = await requireRole(["ADMIN"]);
    await db.feedback.delete({ where: { id } });
    await audit(admin.id, "feedback.delete", "Feedback", id);
    revalidatePath("/feedback");
    return { message: t("community.sa.fbDeleted") };
  });
}
