"use client";
import { useT } from "@/lib/i18n/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { createCategoryAction, deleteCategoryAction, moveCategoryAction, renameCategoryAction } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { ConfirmButton, Modal } from "@/components/ui/modal";
import { DataTable, EmptyState, Td, Th } from "@/components/ui/misc";

export type CategoryRow = { id: string; name: string; count: number };

/** Thiết lập danh mục cho một loại bài (hiện: Kế hoạch). Đặt trong Cài đặt, cùng kiểu với "Loại hoạt động". */
export function CategoryTable({ kind, label, categories }: { kind: string; label: string; categories: CategoryRow[] }) {
  const router = useRouter();
  const t = useT();
  const [form, setForm] = useState<{ id: string | null; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const done = (r: { ok: boolean; error?: string; message?: string }) => { if (!r.ok) toast.error(r.error ?? t("cms.c.error")); else if (r.message) toast.success(r.message); router.refresh(); return r.ok; };

  async function save() {
    if (!form) return;
    setBusy(true);
    const r = form.id ? await renameCategoryAction(form.id, form.name) : await createCategoryAction(kind, form.name);
    setBusy(false);
    if (done(r)) setForm(null);
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{t("cms.cat.intro", { label: label.toLowerCase() })}</p>
        <Button className="shrink-0" onClick={() => setForm({ id: null, name: "" })}><Plus className="size-4" />{t("cms.cat.add")}</Button>
      </div>
      {categories.length === 0 ? (
        <div className="rounded-lg border border-border bg-white/85"><EmptyState title={t("cms.cat.emptyTitle")} description={t("cms.cat.emptyDesc")} /></div>
      ) : (
        <DataTable>
          <thead><tr><Th className="w-16">{t("cms.cat.thOrder")}</Th><Th>{t("cms.cat.thCat")}</Th><Th className="text-right">{t("cms.cat.thCount")}</Th><Th /></tr></thead>
          <tbody>{categories.map((c, i) => (
            <tr key={c.id}>
              <Td className="whitespace-nowrap">
                <Button size="sm" variant="ghost" aria-label={t("cms.cat.moveUp")} disabled={i === 0} onClick={async () => done(await moveCategoryAction(c.id, -1))}><ArrowUp className="size-4" /></Button>
                <Button size="sm" variant="ghost" aria-label={t("cms.cat.moveDown")} disabled={i === categories.length - 1} onClick={async () => done(await moveCategoryAction(c.id, 1))}><ArrowDown className="size-4" /></Button>
              </Td>
              <Td className="font-medium">{c.name}</Td>
              <Td className="text-right tabular-nums">{c.count}</Td>
              <Td className="text-right whitespace-nowrap">
                <Button size="sm" variant="ghost" aria-label={t("cms.c.edit")} onClick={() => setForm({ id: c.id, name: c.name })}><Pencil className="size-3.5" /></Button>
                <ConfirmButton triggerVariant="ghost" triggerClassName="text-danger" triggerLabel={t("cms.c.delete")} trigger={<Trash2 className="size-3.5" />} title={t("cms.cat.delTitle", { name: c.name })} danger confirmLabel={t("cms.c.delete")}
                  description={c.count ? t("cms.cat.delDescN", { n: c.count }) : t("cms.cat.delDesc0")}
                  onConfirm={async () => { done(await deleteCategoryAction(c.id)); }} />
              </Td>
            </tr>
          ))}</tbody>
        </DataTable>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? t("cms.cat.editTitle") : t("cms.cat.add")} className="max-w-sm">
        {form && (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <Field label={t("cms.cat.name")} required><Input autoFocus value={form.name} maxLength={60} placeholder={t("cms.cat.example")} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>{t("cms.c.cancel")}</Button>
              <Button type="submit" loading={busy} disabled={form.name.trim().length < 2}>{t("cms.c.save")}</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
