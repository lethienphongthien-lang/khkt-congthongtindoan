"use client";
import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { deleteQuizAction, saveGameCapAction, setQuizPublishedAction } from "@/actions/games";
import { Button, buttonClass } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ConfirmButton } from "@/components/ui/modal";

export function QuizRowActions({ id, published }: { id: string; published: boolean }) {
  const router = useRouter();
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1">
      <Button size="sm" variant="ghost" aria-label={published ? t("cms.qa.hide") : t("cms.qa.show")} title={published ? t("cms.qa.hide") : t("cms.qa.show")} onClick={async () => { const r = await setQuizPublishedAction(id, !published); if (!r.ok) toast.error(r.error); else toast.success(r.message); router.refresh(); }}>{published ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</Button>
      <Link href={`/quizzes/${id}/edit`} className={buttonClass("ghost", "sm")} aria-label={t("cms.c.edit")}><Pencil className="size-3.5" /></Link>
      <ConfirmButton triggerVariant="ghost" triggerClassName="text-danger" triggerLabel={t("cms.c.delete")} trigger={<Trash2 className="size-3.5" />} title={t("cms.qa.delTitle")} danger confirmLabel={t("cms.c.delete")}
        description={t("cms.qa.delDesc")}
        onConfirm={async () => { const r = await deleteQuizAction(id); if (!r.ok) toast.error(r.error); else toast.success(r.message); router.refresh(); }} />
    </span>
  );
}

export function GameCapForm({ cap }: { cap: number }) {
  const router = useRouter();
  const t = useT();
  const [v, setV] = useState(String(cap));
  const [busy, setBusy] = useState(false);
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const r = await saveGameCapAction(Number(v)); setBusy(false); if (!r.ok) toast.error(r.error); else { toast.success(r.message); router.refresh(); } }}>
      <label className="block"><span className="mb-1 block text-[13px] font-medium">{t("cms.qa.cap")}</span><Input type="number" min={0} max={200} className="w-32" value={v} onChange={(e) => setV(e.target.value)} /></label>
      <Button type="submit" size="sm" loading={busy}>{t("cms.c.save")}</Button>
      <p className="basis-full text-xs text-muted">{t("cms.qa.capNote")}</p>
    </form>
  );
}
