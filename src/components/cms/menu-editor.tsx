"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, RotateCcw, Trash2 } from "lucide-react";
import { saveMenuConfigAction } from "@/actions/cms";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";
import { cn } from "@/utils";
import type { MenuConfig, NavLink, SideGroup, TopItem } from "@/lib/menu-config";

const inp = "h-8 rounded-md border border-border bg-white px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const uid = () => "c-" + Math.random().toString(36).slice(2, 9);

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const out = [...arr];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/** Một dòng mục: lên/xuống, ẩn/hiện, tên, liên kết (mục tự thêm), xóa (mục tự thêm). */
function Row<T extends NavLink>({ item, i, n, onChange, onMove, onDelete, extra, indent }: {
  item: T; i: number; n: number; onChange: (v: T) => void; onMove: (d: -1 | 1) => void; onDelete: () => void; extra?: React.ReactNode; indent?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 py-1", indent && "ml-6 border-l-2 border-primary/25 pl-2", item.hidden && "opacity-55")}>
      <div className="flex shrink-0">
        <button type="button" disabled={i === 0} onClick={() => onMove(-1)} className="rounded p-1 text-muted hover:bg-slate-100 disabled:opacity-30" aria-label="Lên"><ArrowUp className="size-4" /></button>
        <button type="button" disabled={i === n - 1} onClick={() => onMove(1)} className="rounded p-1 text-muted hover:bg-slate-100 disabled:opacity-30" aria-label="Xuống"><ArrowDown className="size-4" /></button>
      </div>
      <input value={item.label} maxLength={40} onChange={(e) => onChange({ ...item, label: e.target.value })} className={cn(inp, "w-44 font-medium sm:w-56")} aria-label="Tên mục" />
      {item.custom
        ? <input value={item.href} onChange={(e) => onChange({ ...item, href: e.target.value })} placeholder="/duong-dan hoặc https://..." className={cn(inp, "w-44 sm:w-60")} aria-label="Liên kết" />
        : <span className="hidden max-w-60 truncate text-xs text-muted sm:inline">{item.href}</span>}
      {extra}
      <button type="button" onClick={() => onChange({ ...item, hidden: !item.hidden })} className="ml-auto rounded p-1.5 text-muted hover:bg-slate-100" title={item.hidden ? "Đang ẩn — bấm để hiện" : "Đang hiện — bấm để ẩn"} aria-label={item.hidden ? "Hiện" : "Ẩn"}>
        {item.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4 text-primary" />}
      </button>
      {item.custom
        ? <button type="button" onClick={onDelete} className="rounded p-1.5 text-danger hover:bg-red-50" aria-label="Xóa mục"><Trash2 className="size-4" /></button>
        : <span className="size-7" aria-hidden />}
    </div>
  );
}

export function MenuEditor({ initial }: { initial: MenuConfig }) {
  const router = useRouter();
  const [cfg, setCfg] = useState<MenuConfig>(initial);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const edit = (fn: (c: MenuConfig) => MenuConfig) => { setCfg((c) => fn(structuredClone(c))); setDirty(true); };

  const save = async () => {
    setBusy(true); const res = await saveMenuConfigAction(cfg); setBusy(false);
    if (reportResult(res)) { setDirty(false); router.refresh(); }
  };

  const setTop = (i: number, v: TopItem) => edit((c) => { c.top[i] = v; return c; });
  const setChild = (i: number, j: number, v: NavLink) => edit((c) => { c.top[i].children![j] = v; return c; });
  const setGroup = (gi: number, v: SideGroup) => edit((c) => { c.side[gi] = v; return c; });

  return (
    <div className="space-y-6 pb-4">
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
        <Button loading={busy} disabled={!dirty} onClick={save}>Lưu thay đổi</Button>
        <ConfirmButton triggerVariant="ghost" triggerLabel="Khôi phục mặc định" trigger={<RotateCcw className="size-3.5" />} title="Khôi phục menu mặc định?" confirmLabel="Khôi phục"
          description="Mọi đổi tên, sắp xếp và mục tự thêm sẽ bị xóa; menu trở về như ban đầu." onConfirm={async () => { if (reportResult(await saveMenuConfigAction(null))) { router.refresh(); location.reload(); } }} />
        {dirty && <span className="text-xs text-amber-700">Có thay đổi chưa lưu</span>}
      </div>

      <section className="rounded-lg border border-border bg-white/85 p-4">
        <h2 className="text-[15px] font-semibold">Thanh menu phía trên</h2>
        <p className="mb-2 text-xs text-muted">Nút Trang chủ (biểu tượng ngôi nhà) luôn ở đầu. Mục có mục con sẽ hiện danh sách thả xuống. Dùng nút mắt để ẩn/hiện; mục có sẵn không xóa được, chỉ ẩn.</p>
        <div className="divide-y divide-border">
          {cfg.top.map((it, i) => (
            <div key={it.id}>
              <Row item={it} i={i} n={cfg.top.length} onChange={(v) => setTop(i, { ...it, ...v })} onMove={(d) => edit((c) => { c.top = move(c.top, i, d); return c; })} onDelete={() => edit((c) => { c.top.splice(i, 1); return c; })} extra={<button type="button" onClick={() => edit((c) => { (c.top[i].children ??= []).push({ id: uid(), label: "Mục mới", href: "/", custom: true }); return c; })} className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-primary hover:bg-primary-light"><Plus className="size-3.5" />Mục con</button>} />
              {(it.children ?? []).map((ch, j) => (
                <Row key={ch.id} indent item={ch} i={j} n={it.children!.length} onChange={(v) => setChild(i, j, v)} onMove={(d) => edit((c) => { c.top[i].children = move(c.top[i].children!, j, d); return c; })}
                  onDelete={() => edit((c) => { c.top[i].children!.splice(j, 1); if (!c.top[i].children!.length) delete c.top[i].children; return c; })} />
              ))}
            </div>
          ))}
        </div>
        <Button variant="secondary" className="mt-2" onClick={() => edit((c) => { c.top.push({ id: uid(), label: "Mục mới", href: "/", custom: true }); return c; })}><Plus className="size-4" />Thêm mục vào thanh menu</Button>
      </section>

      <section className="rounded-lg border border-border bg-white/85 p-4">
        <h2 className="text-[15px] font-semibold">Thanh bên trái (các nhóm)</h2>
        <p className="mb-2 text-xs text-muted">Nhóm “Báo cáo Chi đoàn” tự liệt kê Khối và lớp theo dữ liệu thật nên chỉ đổi tên, ẩn hoặc di chuyển được. Chọn “Chuyển sang” để đưa một mục sang nhóm khác.</p>
        <div className="space-y-3">
          {cfg.side.map((g, gi) => (
            <div key={g.id} className={cn("rounded-md border border-border bg-white p-2.5", g.hidden && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex shrink-0">
                  <button type="button" disabled={gi === 0} onClick={() => edit((c) => { c.side = move(c.side, gi, -1); return c; })} className="rounded p-1 text-muted hover:bg-slate-100 disabled:opacity-30" aria-label="Nhóm lên"><ArrowUp className="size-4" /></button>
                  <button type="button" disabled={gi === cfg.side.length - 1} onClick={() => edit((c) => { c.side = move(c.side, gi, 1); return c; })} className="rounded p-1 text-muted hover:bg-slate-100 disabled:opacity-30" aria-label="Nhóm xuống"><ArrowDown className="size-4" /></button>
                </div>
                <input value={g.title} maxLength={40} onChange={(e) => setGroup(gi, { ...g, title: e.target.value })} className={cn(inp, "w-56 font-semibold")} aria-label="Tên nhóm" />
                {g.kind === "reports" && <span className="text-xs text-muted">Khối → lớp tự động</span>}
                <button type="button" onClick={() => setGroup(gi, { ...g, hidden: !g.hidden })} className="ml-auto rounded p-1.5 text-muted hover:bg-slate-100" aria-label={g.hidden ? "Hiện nhóm" : "Ẩn nhóm"} title={g.hidden ? "Đang ẩn — bấm để hiện" : "Đang hiện — bấm để ẩn"}>
                  {g.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4 text-primary" />}
                </button>
                {g.id.startsWith("c-")
                  ? <button type="button" onClick={() => edit((c) => { c.side.splice(gi, 1); return c; })} className="rounded p-1.5 text-danger hover:bg-red-50" aria-label="Xóa nhóm"><Trash2 className="size-4" /></button>
                  : <span className="size-7" aria-hidden />}
              </div>
              {g.kind !== "reports" && (
                <div className="mt-1 divide-y divide-border/60 pl-2">
                  {g.items.map((it, j) => (
                    <Row key={it.id} item={it} i={j} n={g.items.length} onChange={(v) => edit((c) => { c.side[gi].items[j] = v; return c; })} onMove={(d) => edit((c) => { c.side[gi].items = move(c.side[gi].items, j, d); return c; })} onDelete={() => edit((c) => { c.side[gi].items.splice(j, 1); return c; })}
                      extra={
                        <select aria-label="Chuyển sang nhóm" value="" onChange={(e) => { const to = e.target.value; if (!to) return; edit((c) => { const [m] = c.side[gi].items.splice(j, 1); c.side.find((x) => x.id === to)!.items.push(m); return c; }); }} className="h-8 rounded-md border border-border bg-white px-1.5 text-xs">
                          <option value="">Chuyển sang…</option>
                          {cfg.side.filter((x) => x.id !== g.id && x.kind !== "reports").map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
                        </select>
                      } />
                  ))}
                  <div className="pt-1.5"><button type="button" onClick={() => edit((c) => { c.side[gi].items.push({ id: uid(), label: "Mục mới", href: "/", custom: true }); return c; })} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Plus className="size-3.5" />Thêm mục</button></div>
                </div>
              )}
            </div>
          ))}
        </div>
        <Button variant="secondary" className="mt-3" onClick={() => edit((c) => { c.side.push({ id: uid(), title: "Nhóm mới", items: [] }); return c; })}><Plus className="size-4" />Thêm nhóm</Button>
      </section>
    </div>
  );
}
