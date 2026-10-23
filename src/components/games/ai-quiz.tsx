"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Wand2 } from "lucide-react";
import { aiAvailableAction, aiGenerateQuizAction, type GenQuestion } from "@/actions/ai";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/utils";

const KINDS: { k: GenQuestion["ui"]; label: string }[] = [{ k: "CHOICE", label: "Trắc nghiệm" }, { k: "TF", label: "Đúng / Sai" }, { k: "FILL", label: "Điền từ" }, { k: "ORDER", label: "Sắp xếp" }];
const TOPICS = ["Ngày Nhà giáo Việt Nam 20/11", "An toàn giao thông", "Lịch sử Đoàn TNCS Hồ Chí Minh", "Bảo vệ môi trường", "Kỹ năng sống cho học sinh", "Văn hóa học đường"];

/** Nút "Tạo câu hỏi bằng AI" cho biểu mẫu trò chơi: nhập chủ đề, AI soạn sẵn câu hỏi để bạn xem và sửa. */
export function AiQuizButton({ onResult, onBusy }: { onResult: (r: { title: string; description: string; questions: GenQuestion[] }) => void; onBusy: (label: string | null) => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(8);
  const [kinds, setKinds] = useState<GenQuestion["ui"][]>(["CHOICE", "TF", "FILL", "ORDER"]);
  useEffect(() => { aiAvailableAction().then((r) => setEnabled(r.ok ? !!r.data?.enabled : false)); }, []);
  if (!enabled) return null;

  async function go() {
    const t = topic; setOpen(false); onBusy("AI đang soạn câu hỏi cho bạn");
    try {
      const r = await aiGenerateQuizAction({ topic: t, count, kinds });
      if (!r.ok || !r.data) { toast.error(r.ok ? "AI không soạn được" : r.error); setOpen(true); return; }
      onResult(r.data); toast.success(`AI đã soạn ${r.data.questions.length} câu. Hãy đọc lại, kiểm tra đáp án trước khi đăng`);
    } catch { toast.error("Mất kết nối khi gọi AI, hãy thử lại"); setOpen(true); }
    finally { onBusy(null); }
  }
  return (
    <>
      <Button type="button" size="sm" className="w-full" onClick={() => setOpen(true)}><Sparkles className="size-3.5" />Tạo câu hỏi bằng AI</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Tạo câu hỏi bằng AI" className="max-w-lg">
        <div className="space-y-3">
          <Field label="Chủ đề" required><Input value={topic} maxLength={200} placeholder="Ví dụ: Ngày Nhà giáo Việt Nam 20/11" onChange={(e) => setTopic(e.target.value)} /></Field>
          <div className="flex flex-wrap gap-1.5">{TOPICS.map((t) => <button key={t} type="button" onClick={() => setTopic(t)} className="rounded-full border border-border bg-white px-2.5 py-1 text-xs hover:bg-primary-light">{t}</button>)}</div>
          <Field label="Số câu hỏi"><Select value={count} onChange={(e) => setCount(Number(e.target.value))}>{[5, 8, 10, 12, 15].map((n) => <option key={n} value={n}>{n} câu</option>)}</Select></Field>
          <div>
            <div className="mb-1 text-[13px] font-medium">Dạng câu hỏi</div>
            <div className="flex flex-wrap gap-2">{KINDS.map((k) => { const on = kinds.includes(k.k); return (
              <button key={k.k} type="button" onClick={() => setKinds((p) => (on ? (p.length > 1 ? p.filter((x) => x !== k.k) : p) : [...p, k.k]))}
                className={cn("rounded-full border px-3 py-1.5 text-sm font-medium", on ? "border-primary bg-primary text-white" : "border-border bg-white hover:bg-slate-50")}>{on ? "✓ " : ""}{k.label}</button>
            ); })}</div>
          </div>
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">AI có thể nhầm kiến thức. <b>Luôn đọc lại và kiểm tra đáp án</b> trước khi đăng. Câu hỏi sẽ <b>thêm vào</b> danh sách hiện có (nếu danh sách còn trống thì thay thế).</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <Button type="button" disabled={topic.trim().length < 3} onClick={go}><Wand2 className="size-4" />Soạn giúp tôi</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
