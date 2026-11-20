import { getT } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { formatDateTime } from "@/utils";
import { PageHeader } from "@/components/ui/misc";
import { FeedbackActions } from "@/components/feedback/feedback-actions";
import { HeartHandshake, Phone, Shield } from "lucide-react";

export async function generateMetadata() { return { title: (await getT())("cms.counsel.detail") }; }

export default async function CounselingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  await requireRole(["ADMIN"]);
  const { id } = await params;
  let f = await db.feedback.findUnique({ where: { id } });
  if (!f || f.category !== "TƯ VẤN TÂM LÝ") notFound();

  // Mở xem thì đánh dấu là đã đọc
  if (f.status === "NEW") {
    f = await db.feedback.update({ where: { id }, data: { status: "READ" } });
  }

  return (
    <>
      <PageHeader
        title={t("cms.counsel.title")}
        description={t("cms.counsel.sentAt", { time: formatDateTime(f.createdAt) })}
      />

      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-800">
          <Shield className="size-4 text-blue-600" />
          <span>{t("cms.counsel.senderInfo")}</span>
        </div>
        <p className="mt-1 text-sm font-medium text-slate-800">
          {f.contact ? (
            <span className="inline-flex items-center gap-1.5 text-primary">
              <Phone className="size-3.5" />
              {f.contact}
            </span>
          ) : (
            <span className="italic text-slate-500">{t("cms.counsel.anonNote")}</span>
          )}
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-white p-5 shadow-xs">
        <h3 className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {t("cms.counsel.msgHeading")}
        </h3>
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">
          {f.content}
        </div>
      </div>

      <FeedbackActions id={f.id} status={f.status} note={f.note ?? ""} />
    </>
  );
}

