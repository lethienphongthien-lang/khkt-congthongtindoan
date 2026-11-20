"use client";
import { useEffect, useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { resetDepartmentPasswordsAction } from "@/actions/members";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/modal";
import { Alert } from "@/components/ui/misc";
import { csvStamp, downloadCsv } from "@/components/members/credentials";
import type { Credential } from "@/actions/members";

type ClassOption = { id: string; name: string; count: number; hasAccount: boolean };

/**
 * Admin chọn một hoặc nhiều lớp (Chi đoàn) → xem số tài khoản → cấp lại từng lớp → tải một tệp CSV.
 * Mật khẩu chỉ nằm trong bộ nhớ trình duyệt này; đóng trang là mất nên CSV tự tải ngay khi xong.
 */
export function ClassPasswordManager({ classes: all0, mode = "members" }: { classes: ClassOption[]; mode?: "members" | "account" }) {
  const t = useT();
  const isAcc = mode === "account";
  const classes = isAcc ? all0.filter((c) => c.hasAccount).map((c) => ({ ...c, count: 1 })) : all0;
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
  const save = (r: Credential[]) => downloadCsv(r, `mat-khau-${isAcc ? "chi-doan" : "lop"}-${csvStamp()}.csv`);

  async function run() {
    running.current = true; setPhase("running"); setError(""); setRows([]); setDoneClasses(0);
    const out: Credential[] = [];
    for (const c of selected) {
      const res = await resetDepartmentPasswordsAction(c.id, mode);
      if (!res.ok || !res.data) { setError(t("ui.cp.err", { name: c.name, err: res.ok ? t("ui.cp.noData") : res.error, n: out.length })); break; }
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
        <p className="font-medium">{phase === "running" ? t("ui.cp.running") : t("ui.cp.done")} {t("ui.cp.progress", { done: doneClasses, total: selected.length, rows: rows.length })}</p>
        <div className="h-2 overflow-hidden rounded bg-border"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
        {error && <Alert tone="red">{error}</Alert>}
        {phase === "done" && (
          <>
            <p className="text-muted">{t("ui.cp.csvNote")}</p>
            <div className="flex gap-2">
              {rows.length > 0 && <Button variant="secondary" onClick={() => save(rows)}>{t("ui.cp.redownload")}</Button>}
              <Button variant="secondary" onClick={() => { setPhase("form"); setRows([]); setPicked(new Set()); setAll(false); setError(""); }}>{t("ui.cp.another")}</Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4 text-sm">
      <p className="text-muted">{isAcc ? t("ui.cp.introAcc") : t("ui.cp.introMem")}{t("ui.cp.introTail")}</p>
      <fieldset className="space-y-2">
        <legend className="mb-1 font-medium">{t("ui.cp.classes")}</legend>
        <label className="flex items-center gap-2"><input type="checkbox" className="size-4" checked={all} onChange={() => setAll(!all)} />{t("ui.cp.allClasses")}</label>
        {!all && (
          <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-3">
            {classes.map((c) => <label key={c.id} className="flex items-center gap-2"><input type="checkbox" className="size-4" checked={picked.has(c.id)} onChange={() => toggle(c.id)} />{c.name} <span className="text-muted">({c.count})</span></label>)}
            {!classes.length && <p className="col-span-full text-muted">{t("ui.cp.noClass")}</p>}
          </div>
        )}
      </fieldset>
      {selected.length > 0 && <Alert tone="amber">{t("ui.cp.willReset", { total: "\u0000", n: selected.length }).split("\u0000").flatMap((p, i) => i ? [<b key={i}>{total}</b>, p] : [p])}{total === 0 && t("ui.cp.noMatch")}</Alert>}
      <div>
        {selected.length > 0 && total > 0 && (
          <ConfirmButton trigger={<><KeyRound className="size-4" />{t("ui.cp.trigger")}</>} title={t("ui.cp.confirmTitle", { total })} danger confirmLabel={t("ui.cp.confirmBtn")}
            description={t("ui.cp.confirmDesc")}
            onConfirm={run} />
        )}
      </div>
    </div>
  );
}
