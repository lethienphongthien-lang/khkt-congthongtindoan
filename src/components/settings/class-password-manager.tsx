"use client";
import { useEffect, useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { resetDepartmentPasswordsAction } from "@/actions/members";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/modal";
import { Alert } from "@/components/ui/misc";
import { csvStamp, downloadCsv } from "@/components/members/credentials";
import type { Credential } from "@/actions/members";

type ClassOption = { id: string; name: string; count: number };

/**
 * Admin chọn một hoặc nhiều lớp (Chi đoàn) → xem số tài khoản → cấp lại từng lớp → tải một tệp CSV.
 * Mật khẩu chỉ nằm trong bộ nhớ trình duyệt này; đóng trang là mất nên CSV tự tải ngay khi xong.
 */
export function ClassPasswordManager({ classes }: { classes: ClassOption[] }) {
  const [all, setAll] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<Credential[]>([]);
  const [phase, setPhase] = useState<"form" | "running" | "done">("form");
  const [doneClasses, setDoneClasses] = useState(0);
  const [error, setError] = useState("");
  const running = useRef(false);

  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => { if (running.current) e.preventDefault(); };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, []);

  const selected = classes.filter((c) => all || picked.has(c.id));
  const total = selected.reduce((n, c) => n + c.count, 0);
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const save = (r: Credential[]) => downloadCsv(r, `mat-khau-lop-${csvStamp()}.csv`);

  async function run() {
    running.current = true; setPhase("running"); setError(""); setRows([]); setDoneClasses(0);
    const out: Credential[] = [];
    for (const c of selected) {
      const res = await resetDepartmentPasswordsAction(c.id);
      if (!res.ok || !res.data) { setError(`Lớp ${c.name}: ${res.ok ? "không có dữ liệu" : res.error}. Đã cấp lại ${out.length} tài khoản, hãy tải CSV phần đã xong rồi chọn lại các lớp còn lại.`); break; }
      out.push(...res.data.rows); setRows([...out]); setDoneClasses((n) => n + 1);
    }
    running.current = false;
    setPhase("done");
    if (out.length) save(out);
  }

  if (phase !== "form") {
    const pct = selected.length ? (doneClasses / selected.length) * 100 : 0;
    return (
      <div className="max-w-xl space-y-3 text-sm">
        <p className="font-medium">{phase === "running" ? "Đang cấp lại mật khẩu... đừng đóng trang." : "Hoàn tất."} Đã xử lý {doneClasses}/{selected.length} lớp ({rows.length} tài khoản).</p>
        <div className="h-2 overflow-hidden rounded bg-border"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
        {error && <Alert tone="red">{error}</Alert>}
        {phase === "done" && (
          <>
            <p className="text-muted">Tệp CSV đã tự tải về. Mật khẩu chỉ hiện ở đây một lần, hãy cất tệp cẩn thận và gửi riêng cho từng người. Khi đăng nhập họ sẽ bị buộc đổi mật khẩu.</p>
            <div className="flex gap-2">
              {rows.length > 0 && <Button variant="secondary" onClick={() => save(rows)}>Tải lại CSV</Button>}
              <Button variant="secondary" onClick={() => { setPhase("form"); setRows([]); setPicked(new Set()); setAll(false); setError(""); }}>Làm lớp khác</Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4 text-sm">
      <p className="text-muted">Cấp mật khẩu tạm thời mới cho tất cả tài khoản đang hoạt động của các lớp đã chọn và tải CSV. Mỗi người phải đổi mật khẩu khi đăng nhập lại, và các thiết bị đăng nhập nhanh của họ bị thu hồi.</p>
      <fieldset className="space-y-2">
        <legend className="mb-1 font-medium">Lớp (Chi đoàn)</legend>
        <label className="flex items-center gap-2"><input type="checkbox" className="size-4" checked={all} onChange={() => setAll(!all)} />Tất cả lớp</label>
        {!all && (
          <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-3">
            {classes.map((c) => <label key={c.id} className="flex items-center gap-2"><input type="checkbox" className="size-4" checked={picked.has(c.id)} onChange={() => toggle(c.id)} />{c.name} <span className="text-muted">({c.count})</span></label>)}
            {!classes.length && <p className="col-span-full text-muted">Chưa có lớp nào.</p>}
          </div>
        )}
      </fieldset>
      {selected.length > 0 && <Alert tone="amber">Sẽ cấp lại mật khẩu cho <b>{total}</b> tài khoản của {selected.length} lớp.{total === 0 && " Không có tài khoản nào phù hợp."}</Alert>}
      <div>
        {selected.length > 0 && total > 0 && (
          <ConfirmButton trigger={<><KeyRound className="size-4" />Cấp lại mật khẩu & tải CSV</>} title={`Cấp lại mật khẩu cho ${total} tài khoản?`} danger confirmLabel="Cấp lại"
            description="Mật khẩu cũ sẽ không dùng được nữa và mọi người bị đăng xuất khỏi các thiết bị. Mật khẩu mới chỉ hiện trong tệp CSV tải về ngay sau đó."
            onConfirm={run} />
        )}
      </div>
    </div>
  );
}
