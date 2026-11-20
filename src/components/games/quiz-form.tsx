"use client";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowDown, ArrowUp, Check, ChevronDown, Copy, ImagePlus, ListChecks, ListOrdered, Plus, ToggleLeft, Trash2, Type, X } from "lucide-react";
import { saveQuizAction } from "@/actions/games";
import { AiQuizButton } from "@/components/games/ai-quiz";
import { AiWorkingOverlay } from "@/components/cms/ai-assist";
import { Button } from "@/components/ui/button";
import { HeaderActions } from "@/components/ui/header-actions";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ImageUpload } from "@/components/ui/image-upload";
import { cn, fromLocalInput } from "@/utils";
import { blank, type QForm, type QuizFormValue, type UiKind } from "./quiz-defaults";
import { THEMES, themeOf } from "./game-meta";

const KINDS: { k: UiKind; label: MessageKey; hint: MessageKey; icon: typeof ListChecks }[] = [
  { k: "CHOICE", label: "cms.qf.k.CHOICE", hint: "cms.qf.h.CHOICE", icon: ListChecks },
  { k: "TF", label: "cms.qf.k.TF", hint: "cms.qf.h.TF", icon: ToggleLeft },
  { k: "FILL", label: "cms.qf.k.FILL", hint: "cms.qf.h.FILL", icon: Type },
  { k: "ORDER", label: "cms.qf.k.ORDER", hint: "cms.qf.h.ORDER", icon: ListOrdered },
];
const uid = () => Math.random().toString(36).slice(2, 9);
const v0Key = (init: QuizFormValue) => init.questions[0]?.key ?? "q0"; // khóa lần dựng đầu theo thứ tự (không ngẫu nhiên, tránh lệch giữa máy chủ và trình duyệt)

/** Các việc còn thiếu của một câu hỏi (rỗng = hợp lệ). */
function problems(q: QForm): MessageKey[] {
  const p: MessageKey[] = [];
  const filled = q.options.map((o) => o.trim());
  if (q.text.trim().length < 3) p.push("cms.qf.p.text");
  if (q.ui === "CHOICE") {
    if (filled.filter(Boolean).length < 2) p.push("cms.qf.p.min2");
    else if (!filled[q.correct]) p.push("cms.qf.p.correct");
    if (new Set(filled.filter(Boolean).map((o) => o.toLowerCase())).size !== filled.filter(Boolean).length) p.push("cms.qf.p.dup");
  }
  if (q.ui === "FILL" && !filled[0]) p.push("cms.qf.p.answer");
  if (q.ui === "ORDER" && filled.filter(Boolean).length < 3) p.push("cms.qf.p.min3");
  return p;
}

/** Tự chọn biểu tượng/màu theo các dạng câu hỏi. */
function autoTheme(qs: QForm[]): string {
  const kinds = new Set(qs.map((q) => q.ui));
  if (qs.some((q) => q.image) && kinds.size === 1 && kinds.has("FILL")) return "picture";
  if (kinds.size === 1) return kinds.has("TF") ? "truefalse" : kinds.has("ORDER") ? "order" : kinds.has("FILL") ? "picture" : "quiz";
  return "mix";
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition", active ? "border-primary bg-primary text-white" : "border-border bg-white hover:bg-slate-50")}>{children}</button>;
}

function QuestionCard({ q, i, n, open, onToggle, set, move, dup, del, locked }: { q: QForm; i: number; n: number; open: boolean; onToggle: () => void; set: (p: Partial<QForm>) => void; move: (d: number) => void; dup: () => void; del: () => void; locked?: boolean }) {
  const t = useT();
  const probs = problems(q);
  const kind = KINDS.find((k) => k.k === q.ui)!;
  const setOpt = (k: number, v: string) => set({ options: q.options.map((x, j) => (j === k ? v : x)) });
  return (
    <section className={cn("rounded-xl border bg-white shadow-sm", probs.length ? "border-amber-300" : "border-border")}>
      <header className="flex items-center gap-2 px-3 py-2">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={open}>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{i + 1}</span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"><kind.icon className="size-3.5" />{t(kind.label)}</span>
          <span className={cn("min-w-0 flex-1 truncate text-sm", q.text.trim() ? "font-medium" : "text-slate-400")}>{q.text.trim() || t("cms.qf.noText")}</span>
          {probs.length > 0 && <AlertTriangle className="size-4 shrink-0 text-amber-500" aria-label={t("cms.qf.missingInfo")} />}
          <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
        </button>
        {!locked && (
          <div className="flex shrink-0">
            <Button size="sm" variant="ghost" aria-label={t("cms.qf.moveUp")} disabled={i === 0} onClick={() => move(-1)}><ArrowUp className="size-4" /></Button>
            <Button size="sm" variant="ghost" aria-label={t("cms.qf.moveDown")} disabled={i === n - 1} onClick={() => move(1)}><ArrowDown className="size-4" /></Button>
            <Button size="sm" variant="ghost" aria-label={t("cms.qf.dup")} disabled={n >= 30} onClick={dup}><Copy className="size-4" /></Button>
            <Button size="sm" variant="ghost" aria-label={t("cms.qf.del")} disabled={n <= 3} onClick={del}><Trash2 className="size-4 text-danger" /></Button>
          </div>
        )}
      </header>
      {open && (
        <fieldset disabled={locked} className="space-y-3 border-t border-border p-3 disabled:opacity-70">
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => <Pill key={k.k} active={q.ui === k.k} onClick={() => q.ui !== k.k && set({ ...blank(k.k), text: q.text, image: q.image, explanation: q.explanation })}><k.icon className="size-3.5" />{t(k.label)}</Pill>)}
          </div>
          <p className="-mt-1 text-xs text-muted">{t(kind.hint)}</p>

          <Textarea className="min-h-16" value={q.text} maxLength={300} placeholder={q.ui === "TF" ? t("cms.qf.phTF") : q.ui === "ORDER" ? t("cms.qf.phOrder") : q.ui === "FILL" ? t("cms.qf.phFill") : t("cms.qf.phQ")} onChange={(e) => set({ text: e.target.value })} />

          {q.ui === "CHOICE" && (
            <div className="space-y-2">
              <p className="text-xs text-muted">{t("cms.qf.clickA")}<b>{t("cms.qf.circle")}</b>{t("cms.qf.clickB")}<b className="text-emerald-600">{t("cms.qf.correctAns")}</b>.</p>
              {q.options.map((o, k) => (
                <div key={k} className={cn("flex items-center gap-2 rounded-lg border p-1.5", q.correct === k ? "border-emerald-400 bg-emerald-50" : "border-border")}>
                  <button type="button" onClick={() => set({ correct: k })} aria-label={t("cms.qf.pickOpt", { n: k + 1 })} className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border-2", q.correct === k ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-400")}><Check className="size-4" /></button>
                  <Input className="border-0 bg-transparent focus:ring-0" value={o} maxLength={120} placeholder={t("cms.qf.option", { n: k + 1 })}
                    onChange={(e) => setOpt(k, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (k === q.options.length - 1 && q.options.length < 5) set({ options: [...q.options, ""] }); } }} />
                  {q.options.length > 2 && <Button size="sm" variant="ghost" aria-label={t("cms.qf.delOption")} onClick={() => set({ options: q.options.filter((_, j) => j !== k), correct: q.correct === k ? 0 : q.correct > k ? q.correct - 1 : q.correct })}><X className="size-4" /></Button>}
                </div>
              ))}
              {q.options.length < 5 && <Button size="sm" variant="secondary" onClick={() => set({ options: [...q.options, ""] })}><Plus className="size-4" />{t("cms.qf.addOption")}</Button>}
            </div>
          )}

          {q.ui === "TF" && (
            <div className="grid grid-cols-2 gap-2">
              {(["cms.qf.tfTrue", "cms.qf.tfFalse"] as const).map((o, k) => (
                <button key={o} type="button" onClick={() => set({ correct: k })} className={cn("flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-semibold", q.correct === k ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-border hover:bg-slate-50")}>
                  {q.correct === k && <Check className="size-4" />}{t("cms.qf.tfIs", { o: t(o) })}
                </button>
              ))}
            </div>
          )}

          {q.ui === "FILL" && (
            <div className="space-y-2">
              <p className="text-xs text-muted">{t("cms.qf.fillNote")}</p>
              {q.options.map((o, k) => (
                <div key={k} className="flex items-center gap-2">
                  <Input value={o} maxLength={120} placeholder={k === 0 ? t("cms.qf.correctAnswer") : t("cms.qf.altAnswer")} onChange={(e) => setOpt(k, e.target.value)} />
                  {q.options.length > 1 && <Button size="sm" variant="ghost" aria-label={t("cms.c.delete")} onClick={() => set({ options: q.options.filter((_, j) => j !== k) })}><X className="size-4" /></Button>}
                </div>
              ))}
              {q.options.length < 5 && <Button size="sm" variant="secondary" onClick={() => set({ options: [...q.options, ""] })}><Plus className="size-4" />{t("cms.qf.addAlt")}</Button>}
            </div>
          )}

          {q.ui === "ORDER" && (
            <div className="space-y-2">
              <p className="text-xs text-muted">{t("cms.qf.orderA")}<b>{t("cms.qf.orderB")}</b>{t("cms.qf.orderC")}</p>
              {q.options.map((o, k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">{k + 1}</span>
                  <Input value={o} maxLength={120} placeholder={t("cms.qf.itemN", { n: k + 1 })} onChange={(e) => setOpt(k, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (k === q.options.length - 1 && q.options.length < 6) set({ options: [...q.options, ""] }); } }} />
                  <Button size="sm" variant="ghost" aria-label={t("cms.c.up")} disabled={k === 0} onClick={() => { const a = [...q.options]; [a[k - 1], a[k]] = [a[k], a[k - 1]]; set({ options: a }); }}><ArrowUp className="size-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label={t("cms.c.down")} disabled={k === q.options.length - 1} onClick={() => { const a = [...q.options]; [a[k + 1], a[k]] = [a[k], a[k + 1]]; set({ options: a }); }}><ArrowDown className="size-4" /></Button>
                  {q.options.length > 3 && <Button size="sm" variant="ghost" aria-label={t("cms.qf.delItem")} onClick={() => set({ options: q.options.filter((_, j) => j !== k) })}><X className="size-4" /></Button>}
                </div>
              ))}
              {q.options.length < 6 && <Button size="sm" variant="secondary" onClick={() => set({ options: [...q.options, ""] })}><Plus className="size-4" />{t("cms.qf.addItem")}</Button>}
            </div>
          )}

          <Input value={q.explanation} maxLength={300} placeholder={t("cms.qf.explain")} onChange={(e) => set({ explanation: e.target.value })} />
          <details open={!!q.image || q.ui === "FILL"} className="rounded-lg bg-slate-50 p-2 text-sm">
            <summary className="flex cursor-pointer items-center gap-1.5 text-primary"><ImagePlus className="size-4" />{q.image ? t("cms.qf.imgOf") : q.ui === "FILL" ? t("cms.qf.imgFill") : t("cms.qf.imgOpt")}</summary>
            <div className="mt-2"><ImageUpload folder="activities" value={q.image} onChange={(image) => set({ image })} /></div>
          </details>
          {probs.length > 0 && <ul className="space-y-0.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{probs.map((x) => <li key={x} className="flex items-start gap-1.5"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{t(x)}</li>)}</ul>}
        </fieldset>
      )}
    </section>
  );
}

/** Chọn đối tượng chơi: toàn trường hoặc một số Chi đoàn (có nút chọn nhanh theo khối). */
function ScopePicker({ value, onChange, departments }: { value: string[]; onChange: (v: string[]) => void; departments: { id: string; name: string }[] }) {
  const t = useT();
  const all = value.length === 0;
  const grade = (n: string) => n.match(/\d{2}/)?.[0] ?? "";
  const grades = [...new Set(departments.map((d) => grade(d.name)).filter(Boolean))].sort();
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const pickGrade = (g: string) => { const ids = departments.filter((d) => grade(d.name) === g).map((d) => d.id); const allOn = ids.every((i) => value.includes(i)); onChange(allOn ? value.filter((v) => !ids.includes(v)) : [...new Set([...value, ...ids])]); };
  return (
    <div>
      <div className="mb-1 text-[13px] font-medium">{t("cms.qf.audience")}</div>
      <div className="inline-flex overflow-hidden rounded-md border border-border text-sm font-medium">
        <button type="button" onClick={() => onChange([])} className={cn("px-3 py-1.5", all ? "bg-primary text-white" : "bg-white hover:bg-slate-50")}>{t("cms.qf.whole")}</button>
        <button type="button" onClick={() => { if (all && departments[0]) onChange([departments[0].id]); }} className={cn("px-3 py-1.5", !all ? "bg-primary text-white" : "bg-white hover:bg-slate-50")}>{t("cms.qf.pickChapters")}</button>
      </div>
      {all ? <p className="mt-1 text-xs text-muted">{t("cms.qf.everyone")}</p> : (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted">{t("cms.qf.quick")}</span>
            {grades.map((g) => <button key={g} type="button" onClick={() => pickGrade(g)} className="rounded-full border border-border bg-white px-2.5 py-0.5 hover:bg-primary-light">{t("cms.qf.grade", { g })}</button>)}
          </div>
          <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-md border border-border bg-white p-1.5">
            {departments.map((d) => (
              <label key={d.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-50"><input type="checkbox" className="size-4 accent-[#0b63b8]" checked={value.includes(d.id)} onChange={() => toggle(d.id)} />{t("cms.qf.chapterN", { name: d.name })}</label>
            ))}
          </div>
          <p className="text-xs text-muted">{t("cms.qf.selected", { n: value.length })}</p>
        </div>
      )}
    </div>
  );
}

export function QuizForm({ id, initial, locked, departments = [] }: { id?: string; initial: QuizFormValue; /** Danh sách Chi đoàn đang học để chọn đối tượng chơi. */ departments?: { id: string; name: string }[]; /** Đã có người chơi: chỉ sửa thông tin hiển thị, giữ nguyên câu hỏi và điểm. */ locked?: boolean }) {
  const router = useRouter();
  const t = useT();
  const [v, setV] = useState<QuizFormValue>(() => ({ ...initial, questions: initial.questions.map((q, i) => ({ ...q, key: q.key ?? `q${i}` })) }));
  // soạn mới: mở sẵn câu đầu tiên cho đỡ trống; sửa: gọn lại, hiện tóm tắt từng câu
  const [openKey, setOpenKey] = useState<string | null>(() => (id ? null : (v0Key(initial))));
  const [busy, setBusy] = useState(false);
  const [aiWorking, setAiWorking] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  // Lưu nháp vào trình duyệt: lỡ tải lại trang (F5) hay đóng tab vẫn còn nguyên những gì đã soạn
  const draftKey = `quiz-draft:${id ?? "new"}`;
  const initialJson = useRef(JSON.stringify(v));
  const draftReady = useRef(false);
  useEffect(() => {
    if (locked) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw) as QuizFormValue;
        if (Array.isArray(d?.questions) && d.questions.length) {
          setV(d); setOpenKey(null);
          toast.info(t("cms.qf.draftRestored"), { action: { label: t("cms.qf.dropDraft"), onClick: () => { try { localStorage.removeItem(draftKey); } catch {} setV(JSON.parse(initialJson.current)); } } });
        }
      }
    } catch {}
    draftReady.current = true;
  }, [draftKey, locked]);
  useEffect(() => {
    if (locked || !draftReady.current) return;
    const tm = setTimeout(() => {
      try { const j = JSON.stringify(v); if (j === initialJson.current) localStorage.removeItem(draftKey); else localStorage.setItem(draftKey, j); } catch {}
    }, 500);
    return () => clearTimeout(tm);
  }, [v, draftKey, locked]);
  const clearDraft = () => { draftReady.current = false; try { localStorage.removeItem(draftKey); } catch {} };

  const qs = v.questions;
  const allProblems = useMemo(() => qs.map(problems), [qs]);
  const badCount = allProblems.filter((p) => p.length).length;
  const theme = v.theme === "auto" ? autoTheme(qs) : v.theme;
  const th = themeOf(theme, t);
  const totalSec = qs.length * v.seconds;

  const setQ = (key: string, patch: Partial<QForm>) => setV((p) => ({ ...p, questions: p.questions.map((q) => (q.key === key ? { ...q, ...patch } : q)) }));
  const add = (k: UiKind) => { const q = { ...blank(k), key: uid() }; setV((p) => ({ ...p, questions: [...p.questions, q] })); setOpenKey(q.key!); setTimeout(() => document.getElementById(`q-${q.key}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); };
  const move = (i: number, d: number) => setV((p) => { const a = [...p.questions]; const j = i + d; if (j < 0 || j >= a.length) return p; [a[i], a[j]] = [a[j], a[i]]; return { ...p, questions: a }; });
  const dup = (i: number) => setV((p) => { const a = [...p.questions]; a.splice(i + 1, 0, { ...a[i], key: uid(), options: [...a[i].options] }); return { ...p, questions: a }; });
  const del = (i: number) => setV((p) => ({ ...p, questions: p.questions.filter((_, j) => j !== i) }));

  async function submit() {
    if (!locked) {
      const first = allProblems.findIndex((p) => p.length);
      if (!v.title.trim() || v.title.trim().length < 3) { toast.error(t("cms.qf.needTitle")); return; }
      if (first >= 0) { setShowErrors(true); setOpenKey(qs[first].key!); toast.error(t("cms.qf.qN", { n: first + 1, msg: t(allProblems[first][0]) })); setTimeout(() => document.getElementById(`q-${qs[first].key}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); return; }
    }
    setBusy(true);
    const res = await saveQuizAction(id ?? null, {
      title: v.title, description: v.description, theme, points: v.points, secondsPerQuestion: v.seconds,
      startsAt: v.startsAt ? fromLocalInput(v.startsAt).toISOString() : "", endsAt: v.endsAt ? fromLocalInput(v.endsAt).toISOString() : "", published: v.published, departmentIds: v.departmentIds, notify: v.notify && !id,
      questions: qs.map((q) => ({
        kind: q.ui === "TF" || q.ui === "CHOICE" ? "CHOICE" : q.ui, text: q.text, imageUrl: q.image?.imageUrl ?? "", imagePublicId: q.image?.publicId ?? "",
        options: q.options.map((o) => o.trim()).filter(Boolean), correct: q.correct, explanation: q.explanation,
      })),
    });
    setBusy(false);
    if (!res.ok) return void toast.error(res.error);
    clearDraft(); toast.success(res.message); router.push("/quizzes"); router.refresh();
  }

  return (
    <div className="relative grid w-full gap-4 lg:h-[calc(100dvh-11rem)] lg:items-stretch lg:grid-cols-[minmax(0,1fr)_340px]" aria-busy={!!aiWorking}>
      {aiWorking && <AiWorkingOverlay label={aiWorking} />}
      {/* ================= CỘT TRÁI: CÂU HỎI ================= */}
      <div className="order-2 min-w-0 space-y-3 lg:order-1 lg:h-full lg:overflow-y-auto lg:pr-2">
        {locked && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{t("cms.qf.lockedNote")}<b>{t("cms.qf.lockedB")}</b>{t("cms.qf.lockedC")}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t("cms.qf.questions")}<span className="font-normal text-muted">{t("cms.qf.qCount", { n: qs.length })}</span></h2>
          <div className="flex gap-2 text-sm">
            <button type="button" className="text-primary hover:underline" onClick={() => setOpenKey(null)}>{t("cms.qf.collapse")}</button>
          </div>
        </div>
        {qs.map((q, i) => (
          <div id={`q-${q.key}`} key={q.key}>
            <QuestionCard q={q} i={i} n={qs.length} open={openKey === q.key} onToggle={() => setOpenKey((k) => (k === q.key ? null : q.key!))}
              set={(p) => setQ(q.key!, p)} move={(d) => move(i, d)} dup={() => dup(i)} del={() => del(i)} locked={locked} />
          </div>
        ))}
        {!locked && qs.length < 30 && (
          <div className="rounded-xl border-2 border-dashed border-border bg-white/60 p-3">
            <p className="mb-2 text-sm font-medium">{t("cms.qf.addNew")}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {KINDS.map((k) => <button key={k.k} type="button" onClick={() => add(k.k)} className="flex flex-col items-center gap-1 rounded-lg border border-border bg-white p-3 text-center text-[13px] font-medium hover:border-primary hover:bg-primary-light/40"><k.icon className="size-5 text-primary" />{t(k.label)}</button>)}
            </div>
          </div>
        )}
      </div>

      {/* ================= CỘT PHẢI: CÀI ĐẶT (cuộn độc lập) ================= */}
      <aside className="order-1 space-y-3 lg:order-2 lg:h-full lg:overflow-y-auto lg:pr-1">
        <div className={cn("flex items-center gap-3 rounded-xl bg-gradient-to-br px-4 py-3 text-white", th.grad)}>
          <span className="text-3xl">{th.emoji}</span>
          <div className="min-w-0"><div className="truncate font-bold">{v.title.trim() || t("cms.qf.newGame")}</div><div className="text-xs opacity-90">{t("cms.qf.summaryLine", { label: th.label, n: qs.length, m: Math.max(1, Math.round(totalSec / 60)) })}</div></div>
        </div>
        <div className="space-y-3 rounded-xl border border-border bg-white p-3 shadow-sm">
          {!locked && <AiQuizButton onBusy={setAiWorking} onResult={(r) => setV((p) => {
            const blankAll = p.questions.every((q) => !q.text.trim());
            const mapped = r.questions.map((q, i) => ({ key: uid() + i, ui: q.ui, text: q.text, image: null, options: q.options, correct: q.correct, explanation: q.explanation }));
            const merged = blankAll ? mapped : [...p.questions, ...mapped].slice(0, 30);
            return { ...p, title: p.title.trim() ? p.title : r.title, description: p.description.trim() ? p.description : r.description, questions: merged };
          })} />}
          <Field label={t("cms.qf.gameName")} required><Input value={v.title} maxLength={120} placeholder={t("cms.qf.gameNameEx")} onChange={(e) => setV({ ...v, title: e.target.value })} /></Field>
          <Field label={t("cms.qf.shortDesc")}><Textarea className="min-h-16" maxLength={300} value={v.description} placeholder={t("cms.qf.shortDescEx")} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("cms.qf.maxPoints")} hint={t("cms.qf.maxPointsHint")}><Input type="number" min={0} max={20} disabled={locked} value={v.points} onChange={(e) => setV({ ...v, points: Number(e.target.value) })} /></Field>
            <Field label={t("cms.qf.secPerQ")}><Select disabled={locked} value={v.seconds} onChange={(e) => setV({ ...v, seconds: Number(e.target.value) })}>{[10, 15, 20, 30, 45, 60].map((s) => <option key={s} value={s}>{t("cms.qf.nSec", { s })}</option>)}</Select></Field>
          </div>
          <p className="-mt-1 text-xs text-muted">{t("cms.qf.pointsNoteA")}<b>{t("cms.qf.pointsNoteB")}</b>.</p>
          <Field label={t("cms.qf.display")}><Select value={v.theme} onChange={(e) => setV({ ...v, theme: e.target.value })}><option value="auto">{t("cms.qf.autoTheme")}</option>{Object.entries(THEMES).map(([k, th2]) => <option key={k} value={k}>{th2.emoji} {th2.label}</option>)}</Select></Field>
          <div className="grid grid-cols-1 gap-3">
            <Field label={t("cms.qf.opensFrom")} hint={t("cms.qf.opensHint")}><Input type="datetime-local" value={v.startsAt} onChange={(e) => setV({ ...v, startsAt: e.target.value })} /></Field>
            <Field label={t("cms.qf.deadline")} hint={t("cms.qf.deadlineHint")}><Input type="datetime-local" value={v.endsAt} onChange={(e) => setV({ ...v, endsAt: e.target.value })} /></Field>
          </div>
          <ScopePicker value={v.departmentIds} onChange={(departmentIds) => setV((p) => ({ ...p, departmentIds }))} departments={departments} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[#0b63b8]" checked={v.published} onChange={(e) => setV({ ...v, published: e.target.checked })} />{t("cms.qf.openNow")}</label>
          {!id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[#0b63b8]" checked={v.notify} onChange={(e) => setV({ ...v, notify: e.target.checked })} />{t("cms.qf.notify")}</label>}
        </div>
        {badCount > 0 && !locked && <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{t("cms.qf.badCount", { n: badCount })}</p>}
        <HeaderActions>
          <Button loading={busy} onClick={submit}>{id ? t("cms.c.saveChanges") : t("cms.qf.create")}</Button>
          <Button variant="secondary" onClick={() => { clearDraft(); router.back(); }}>{t("cms.c.cancel")}</Button>
        </HeaderActions>
      </aside>
    </div>
  );
}
