"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Wand2 } from "lucide-react";
import { aiAvailableAction, aiGenerateQuizAction, type GenQuestion } from "@/actions/ai";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/utils";
import { useT } from "@/lib/i18n/client";

const KINDS = [{ k: "CHOICE", label: "community.ai.kChoice" }, { k: "TF", label: "community.ai.kTf" }, { k: "FILL", label: "community.ai.kFill" }, { k: "ORDER", label: "community.ai.kOrder" }] as const;
const TOPICS = ["community.ai.t0", "community.ai.t1", "community.ai.t2", "community.ai.t3", "community.ai.t4", "community.ai.t5"] as const;

/** Nút "Tạo câu hỏi bằng AI" cho biểu mẫu trò chơi: nhập chủ đề, AI soạn sẵn câu hỏi để bạn xem và sửa. */
export function AiQuizButton({ onResult, onBusy }: { onResult: (r: { title: string; description: string; questions: GenQuestion[] }) => void; onBusy: (label: string | null) => void }) {
  const tr = useT();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(8);
  const [kinds, setKinds] = useState<GenQuestion["ui"][]>(["CHOICE", "TF", "FILL", "ORDER"]);
  useEffect(() => { aiAvailableAction().then((r) => setEnabled(r.ok ? !!r.data?.enabled : false)); }, []);
  if (!enabled) return null;

  async function go() {
    const t = topic; setOpen(false); onBusy(tr("community.ai.busy"));
    try {
      const r = await aiGenerateQuizAction({ topic: t, count, kinds });
      if (!r.ok || !r.data) { toast.error(r.ok ? tr("community.ai.failed") : r.error); setOpen(true); return; }
      onResult(r.data); toast.success(tr("community.ai.done", { n: r.data.questions.length }));
    } catch { toast.error(tr("community.ai.offline")); setOpen(true); }
    finally { onBusy(null); }
  }
  return (
    <>
      <Button type="button" size="sm" className="w-full" onClick={() => setOpen(true)}><Sparkles className="size-3.5" />{tr("community.ai.button")}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={tr("community.ai.button")} className="max-w-lg">
        <div className="space-y-3">
          <Field label={tr("community.ai.topic")} required><Input value={topic} maxLength={200} placeholder={tr("community.ai.topicPh")} onChange={(e) => setTopic(e.target.value)} /></Field>
          <div className="flex flex-wrap gap-1.5">{TOPICS.map((k) => <button key={k} type="button" onClick={() => setTopic(tr(k))} className="rounded-full border border-border bg-white px-2.5 py-1 text-xs hover:bg-primary-light">{tr(k)}</button>)}</div>
          <Field label={tr("community.ai.count")}><Select value={count} onChange={(e) => setCount(Number(e.target.value))}>{[5, 8, 10, 12, 15].map((n) => <option key={n} value={n}>{tr("community.nQuestions", { n })}</option>)}</Select></Field>
          <div>
            <div className="mb-1 text-[13px] font-medium">{tr("community.ai.kinds")}</div>
            <div className="flex flex-wrap gap-2">{KINDS.map((k) => { const on = kinds.includes(k.k); return (
              <button key={k.k} type="button" onClick={() => setKinds((p) => (on ? (p.length > 1 ? p.filter((x) => x !== k.k) : p) : [...p, k.k]))}
                className={cn("rounded-full border px-3 py-1.5 text-sm font-medium", on ? "border-primary bg-primary text-white" : "border-border bg-white hover:bg-slate-50")}>{on ? "✓ " : ""}{tr(k.label)}</button>
            ); })}</div>
          </div>
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{tr("community.ai.warn1")} <b>{tr("community.ai.warn2")}</b> {tr("community.ai.warn3")} <b>{tr("community.ai.warn4")}</b> {tr("community.ai.warn5")}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>{tr("community.cancel")}</Button>
            <Button type="button" disabled={topic.trim().length < 3} onClick={go}><Wand2 className="size-4" />{tr("community.ai.go")}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
