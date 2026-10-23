"use client";
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
  const [form, setForm] = useState<{ id: string | null; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const done = (r: { ok: boolean; error?: string; message?: string }) => { if (!r.ok) toast.error(r.error ?? "Có lỗi"); else if (r.message) toast.success(r.message); router.refresh(); return r.ok; };

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
        <p className="text-sm text-muted">Danh mục để phân loại {label.toLowerCase()} (ví dụ: Kế hoạch tháng, Chào cờ, Diễn đàn). Khi đăng bài bạn chọn danh mục; trang công khai có tab lọc theo từng danh mục.</p>
        <Button className="shrink-0" onClick={() => setForm({ id: null, name: "" })}><Plus className="size-4" />Thêm danh mục</Button>
      </div>
      {categories.length === 0 ? (
        <div className="rounded-lg border border-border bg-white/85"><EmptyState title="Chưa có danh mục nào" description="Bấm “Thêm danh mục” để tạo danh mục đầu tiên." /></div>
      ) : (
        <DataTable>
          <thead><tr><Th className="w-16">Thứ tự</Th><Th>Danh mục</Th><Th className="text-right">Số bài</Th><Th /></tr></thead>
          <tbody>{categories.map((c, i) => (
            <tr key={c.id}>
              <Td className="whitespace-nowrap">
                <Button size="sm" variant="ghost" aria-label="Chuyển lên" disabled={i === 0} onClick={async () => done(await moveCategoryAction(c.id, -1))}><ArrowUp className="size-4" /></Button>
                <Button size="sm" variant="ghost" aria-label="Chuyển xuống" disabled={i === categories.length - 1} onClick={async () => done(await moveCategoryAction(c.id, 1))}><ArrowDown className="size-4" /></Button>
              </Td>
              <Td className="font-medium">{c.name}</Td>
              <Td className="text-right tabular-nums">{c.count}</Td>
              <Td className="text-right whitespace-nowrap">
                <Button size="sm" variant="ghost" aria-label="Sửa" onClick={() => setForm({ id: c.id, name: c.name })}><Pencil className="size-3.5" /></Button>
                <ConfirmButton triggerVariant="ghost" triggerClassName="text-danger" triggerLabel="Xóa" trigger={<Trash2 className="size-3.5" />} title={`Xóa danh mục “${c.name}”?`} danger confirmLabel="Xóa"
                  description={c.count ? `${c.count} bài trong danh mục này sẽ chuyển về “Chưa phân loại” (bài không bị xóa).` : "Danh mục chưa có bài nào."}
                  onConfirm={async () => { done(await deleteCategoryAction(c.id)); }} />
              </Td>
            </tr>
          ))}</tbody>
        </DataTable>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Sửa danh mục" : "Thêm danh mục"} className="max-w-sm">
        {form && (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <Field label="Tên danh mục" required><Input autoFocus value={form.name} maxLength={60} placeholder="Ví dụ: Kế hoạch chào cờ" onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>Hủy</Button>
              <Button type="submit" loading={busy} disabled={form.name.trim().length < 2}>Lưu</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
