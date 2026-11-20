"use client";
import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { deleteArticleAction, setArticlePublishedAction } from "@/actions/cms";
import { deleteReportAction } from "@/actions/chapter-reports";
import { buttonClass } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/misc";
import { reportResult } from "@/components/ui/submit";

export function ArticleStatus({ published, pending }: { published: boolean; pending?: boolean }) {
  const t = useT();
  return <StatusBadge tone={published ? "green" : pending ? "amber" : "gray"}>{published ? t("cms.ra.shown") : pending ? t("cms.ra.pending") : t("cms.ra.draft")}</StatusBadge>;
}

export function ArticleRowActions({ id, published, base, backToList, ownerOnly }: { id: string; published: boolean; base: string; backToList?: boolean; ownerOnly?: boolean }) {
  const router = useRouter();
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1">
      {!ownerOnly && <ConfirmButton triggerVariant="ghost" triggerLabel={published ? t("cms.ra.hidePost") : t("cms.ra.showPost")} trigger={published ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        title={published ? t("cms.ra.hideTitle") : t("cms.ra.showTitle")} description={published ? t("cms.ra.hideDesc") : t("cms.ra.showDesc")} confirmLabel={published ? t("cms.ra.hide") : t("cms.ra.shown")}
        onConfirm={async () => { reportResult(await setArticlePublishedAction(id, !published)); router.refresh(); }} />}
      <Link href={`${base}/${id}/edit`} className={buttonClass("ghost", "sm")} aria-label={t("cms.c.edit")}><Pencil className="size-3.5" /></Link>
      <ConfirmButton triggerVariant="ghost" triggerClassName="text-danger" triggerLabel={t("cms.c.delete")} trigger={<Trash2 className="size-3.5" />} title={t("cms.ra.delArticle")} danger confirmLabel={t("cms.c.delete")}
        onConfirm={async () => { reportResult(await deleteArticleAction(id)); if (backToList) router.push(base); else router.refresh(); }} />
    </span>
  );
}

export function ReportRowActions({ id, backToList }: { id: string; backToList?: boolean }) {
  const router = useRouter();
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1">
      <Link href={`/chapter-reports/${id}/edit`} className={buttonClass("ghost", "sm")} aria-label={t("cms.c.edit")}><Pencil className="size-3.5" /></Link>
      <ConfirmButton triggerVariant="ghost" triggerClassName="text-danger" triggerLabel={t("cms.c.delete")} trigger={<Trash2 className="size-3.5" />} title={t("cms.ra.delReport")} danger confirmLabel={t("cms.c.delete")}
        onConfirm={async () => { reportResult(await deleteReportAction(id)); if (backToList) router.push("/chapter-reports"); else router.refresh(); }} />
    </span>
  );
}
