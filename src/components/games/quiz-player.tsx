"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, Clock, Flame, Gamepad2, Trophy, Volume2, VolumeX, X } from "lucide-react";
import { answerQuizAction, getPlayStateAction, startQuizAction } from "@/actions/games";
import type { AnswerFeedback, GameResult, PlayState } from "@/lib/services/games";
import { cn } from "@/utils";
import { themeOf } from "./game-meta";

export type QuizInfo = { id: string; title: string; description: string | null; theme: string; points: number; seconds: number; total: number; endsAt: string | null };

const LETTERS = ["A", "B", "C", "D", "E"];
const CHOICE_COLORS = ["bg-sky-50 border-sky-200 hover:bg-sky-100", "bg-emerald-50 border-emerald-200 hover:bg-emerald-100", "bg-amber-50 border-amber-200 hover:bg-amber-100", "bg-rose-50 border-rose-200 hover:bg-rose-100", "bg-violet-50 border-violet-200 hover:bg-violet-100"];
const LETTER_COLORS = ["bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-violet-500"];

// ---- âm thanh nhỏ bằng WebAudio (không cần tệp), bật/tắt được và nhớ lựa chọn
export function useSound() {
  const [on, setOn] = useState(true);
  const ctx = useRef<AudioContext | null>(null);
  useEffect(() => { try { if (localStorage.getItem("game-sound") === "0") setOn(false); } catch {} }, []);
  const toggle = () => { setOn((v) => { try { localStorage.setItem("game-sound", v ? "0" : "1"); } catch {} return !v; }); };
  const play = useCallback((notes: [number, number][], type: OscillatorType = "sine") => {
    if (!on) return;
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx.current ??= new AC();
      const c = ctx.current; let t = c.currentTime;
      for (const [f, d] of notes) {
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.02); t += d * 0.9;
      }
    } catch {}
  }, [on]);
  return { on, toggle, ok: () => play([[660, 0.1], [880, 0.16]]), bad: () => play([[392, 0.16], [262, 0.34]], "square"), win: () => play([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.3]]), tick: () => play([[520, 0.06]], "triangle"), move: () => play([[400, 0.05], [500, 0.05]], "triangle"), lose: () => play([[330, 0.15], [262, 0.15], [196, 0.3]], "sawtooth") };
}

export function Confetti() {
  const colors = ["#0b63b8", "#ffd400", "#e11d48", "#16a34a", "#8b5cf6", "#f97316"];
  const [pieces] = useState(() => Array.from({ length: 60 }, (_, i) => ({ i, left: Math.random() * 100, d: 2.4 + Math.random() * 2.2, delay: Math.random() * 0.8, c: colors[i % colors.length] })));
  return <>{pieces.map((p) => <span key={p.i} className="g-confetti" style={{ left: `${p.left}vw`, background: p.c, ["--d" as string]: `${p.d}s`, ["--delay" as string]: `${p.delay}s` }} />)}</>;
}

export function TimerRing({ left, total }: { left: number; total: number }) {
  const r = 22, circ = 2 * Math.PI * r, frac = Math.max(0, Math.min(1, left / total));
  const low = left <= 5000;
  return (
    <div className={cn("relative size-14 shrink-0", low && "g-pulse")} aria-label={`Còn ${Math.ceil(left / 1000)} giây`}>
      <svg viewBox="0 0 56 56" className="size-full -rotate-90"><circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" /><circle cx="28" cy="28" r={r} fill="none" stroke={low ? "#e11d48" : "#0b63b8"} strokeWidth="5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)} /></svg>
      <span className={cn("absolute inset-0 flex items-center justify-center text-[15px] font-bold tabular-nums", low ? "text-rose-600" : "text-slate-800")}>{Math.ceil(left / 1000)}</span>
    </div>
  );
}

function ResultCard({ r, info, cap, celebrate, listHref }: { r: { correctCount: number; total: number; earned: number; awarded: number; bestStreak: number; capped?: boolean; badges?: string[] }; info: QuizInfo; cap: number; celebrate: boolean; listHref: string }) {
  const pct = r.total ? r.correctCount / r.total : 0;
  const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct > 0 ? 1 : 0;
  const msg = pct === 1 ? "Xuất sắc! Điểm tuyệt đối!" : pct >= 0.8 ? "Giỏi quá, gần như hoàn hảo!" : pct >= 0.6 ? "Khá lắm, cố gắng thêm chút nữa!" : pct >= 0.3 ? "Không sao, lần sau sẽ tốt hơn!" : "Đừng nản, đọc lại lời giải để nhớ lâu hơn nhé!";
  const th = themeOf(info.theme);
  return (
    <div className="g-pop mx-auto max-w-xl overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      {celebrate && pct >= 0.6 && <Confetti />}
      <div className={cn("bg-gradient-to-br px-6 py-6 text-center text-white", th.grad)}>
        <div className="text-5xl">{pct >= 0.8 ? "🏆" : pct >= 0.5 ? "🎉" : "💪"}</div>
        <div className="mt-2 text-xl font-bold">{msg}</div>
        <div className="mt-2 text-3xl tracking-widest">{[0, 1, 2].map((i) => <span key={i} className={i < stars ? "" : "opacity-30"}>⭐</span>)}</div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border text-center">
        <div className="p-3"><div className="text-2xl font-bold text-primary-dark">{r.correctCount}/{r.total}</div><div className="text-xs text-muted">câu đúng</div></div>
        <div className="p-3"><div className="text-2xl font-bold text-orange-500">🔥 {r.bestStreak}</div><div className="text-xs text-muted">chuỗi đúng dài nhất</div></div>
        <div className="p-3"><div className="text-2xl font-bold text-emerald-600">+{r.awarded}</div><div className="text-xs text-muted">điểm nhận được</div></div>
      </div>
      <div className="space-y-2 p-4 text-sm">
        {r.awarded > 0 && <p className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-800">Đã cộng <b>{r.awarded} điểm</b> vào điểm cá nhân và điểm thi đua Chi đoàn của bạn.</p>}
        {r.earned > r.awarded && <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">Bạn đạt {r.earned} điểm nhưng chỉ nhận {r.awarded} vì <b>đã chạm trần {cap} điểm trò chơi mỗi tuần</b>. Tuần sau lại tiếp tục tích điểm nhé!</p>}
        {r.earned === 0 && info.points === 0 && <p className="rounded-md bg-slate-50 px-3 py-2 text-slate-600">Trò chơi này chơi cho vui, không tính điểm.</p>}
        {!!r.badges?.length && <p className="rounded-md bg-violet-50 px-3 py-2 text-violet-800">🎖️ Huy hiệu mới: <b>{r.badges.join(", ")}</b></p>}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border p-4">
        <Link href={listHref} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark"><Gamepad2 className="size-4" />Chơi trò khác</Link>
        <Link href="/profile" className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-4 text-sm hover:bg-slate-50"><Trophy className="size-4" />Xem điểm của tôi</Link>
      </div>
    </div>
  );
}

type Phase = "intro" | "question" | "feedback" | "done";
export function QuizPlayer({ info, initial, cap, used, blocked, listHref = "/games" }: { info: QuizInfo; initial: PlayState | null; cap: number; used: number; blocked?: string; /** Trang danh sách trò chơi để quay về (trang quản lý hoặc cổng thông tin). */ listHref?: string }) {
  const th = themeOf(info.theme);
  const sound = useSound();
  const [state, setState] = useState<PlayState | null>(initial);
  const [phase, setPhase] = useState<Phase>(initial?.finished ? "done" : "intro");
  const [busy, setBusy] = useState(false);
  const [fb, setFb] = useState<AnswerFeedback | null>(null);
  const [picked, setPicked] = useState<number | string | null>(null);
  const [fill, setFill] = useState("");
  const [order, setOrder] = useState<number[]>([]);
  const [left, setLeft] = useState(0);
  const [marks, setMarks] = useState<boolean[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const deadline = useRef(0);
  const answered = useRef(false);

  const q = state?.question ?? null;

  const begin = (st: PlayState) => {
    setState(st); setMarks(st.marks); setFb(null); setPicked(null); setFill(""); setOrder([]); answered.current = false;
    deadline.current = Date.now() + st.remainingMs; setLeft(st.remainingMs); setPhase("question");
  };

  async function start() {
    setBusy(true);
    const s = await startQuizAction(info.id);
    if (!s.ok || !s.data) { setBusy(false); return void toast.error(s.ok ? "Không bắt đầu được" : s.error); }
    const r = await getPlayStateAction(s.data.attemptId);
    setBusy(false);
    if (!r.ok || !r.data) return void toast.error(r.ok ? "Không tải được câu hỏi" : r.error);
    if (r.data.finished) { setState(r.data); setPhase("done"); return; }
    begin(r.data);
  }

  const submit = useCallback(async (response: number | string | number[] | null) => {
    if (!state || !q || answered.current) return;
    answered.current = true; setBusy(true);
    const res = await answerQuizAction(state.attemptId, q.id, response);
    setBusy(false);
    if (!res.ok || !res.data) { answered.current = false; return void toast.error(res.ok ? "Có lỗi" : res.error); }
    const f = res.data;
    setFb(f); setPhase("feedback"); setMarks((m) => [...m.slice(0, state.index), f.correct]);
    setState({ ...state, correctSoFar: state.correctSoFar + (f.correct ? 1 : 0), streak: f.streak });
    if (f.correct) sound.ok(); else sound.bad();
    if (f.finished && f.result) { setResult(f.result); }
  }, [state, q, sound]);

  // đồng hồ đếm ngược (thời hạn do máy chủ tính; đây chỉ là hiển thị và tự nộp khi hết giờ)
  useEffect(() => {
    if (phase !== "question") return;
    const t = setInterval(() => {
      const l = deadline.current - Date.now();
      setLeft(Math.max(0, l));
      if (l <= 0) { clearInterval(t); void submit(null); }
    }, 100);
    return () => clearInterval(t);
  }, [phase, submit]);

  async function next() {
    if (!state) return;
    if (fb?.finished) { setPhase("done"); setCelebrate(true); if ((result?.correctCount ?? 0) / Math.max(1, state.total) >= 0.6) sound.win(); return; }
    setBusy(true);
    const r = await getPlayStateAction(state.attemptId);
    setBusy(false);
    if (!r.ok || !r.data) return void toast.error(r.ok ? "Không tải được câu tiếp theo" : r.error);
    if (r.data.finished) { setState(r.data); setPhase("done"); return; }
    begin(r.data);
  }

  // phím tắt: 1-5 chọn đáp án, Enter qua câu
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (phase === "feedback" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); void next(); }
      if (phase === "question" && q?.kind === "CHOICE" && /^[1-5]$/.test(e.key)) { const it = q.items[Number(e.key) - 1]; if (it) { setPicked(it.i); void submit(it.i); } }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  // ---------------- giao diện
  if (blocked) return <div className="mx-auto max-w-xl rounded-xl border border-border bg-white p-6 text-center"><div className="text-4xl">🔒</div><p className="mt-2 text-sm text-slate-700">{blocked}</p><Link href={listHref} className="mt-4 inline-block text-sm text-primary hover:underline">← Về trang trò chơi</Link></div>;

  if (phase === "done") {
    const s = result ?? (state?.summary ? { ...state.summary, capped: state.summary.earned > state.summary.awarded, badges: [] as string[] } : null);
    return s ? <ResultCard r={s} info={info} cap={cap} celebrate={celebrate} listHref={listHref} /> : null;
  }

  if (phase === "intro") {
    const resuming = !!initial && !initial.finished;
    return (
      <div className="g-pop mx-auto max-w-xl overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className={cn("bg-gradient-to-br px-6 py-8 text-center text-white", th.grad)}>
          <div className="text-6xl">{th.emoji}</div>
          <h2 className="mt-2 text-2xl font-bold">{info.title}</h2>
          <p className="mt-1 text-sm opacity-90">{th.label}</p>
        </div>
        <div className="space-y-3 p-5 text-sm">
          {info.description && <p className="text-slate-700">{info.description}</p>}
          <ul className="grid grid-cols-3 gap-2 text-center">
            <li className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{info.total}</div><div className="text-xs text-muted">câu hỏi</div></li>
            <li className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{info.seconds}s</div><div className="text-xs text-muted">mỗi câu</div></li>
            <li className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold text-emerald-600">{info.points ? `+${info.points}` : "Vui"}</div><div className="text-xs text-muted">{info.points ? "điểm tối đa" : "không tính điểm"}</div></li>
          </ul>
          <ul className="list-disc space-y-1 pl-5 text-slate-600">
            <li>Mỗi trò chỉ chơi <b>một lần</b>. Trả lời nhanh trong thời gian quy định, hết giờ tính là sai.</li>
            <li>Trả lời liên tiếp đúng để có <b>chuỗi 🔥</b>. Có lời giải thích sau mỗi câu.</li>
            <li>Điểm cộng vào <b>điểm thi đua Chi đoàn</b>, tối đa <b>{cap} điểm trò chơi mỗi tuần</b> (tuần này bạn đã có {used}).</li>
            {resuming && <li className="font-medium text-amber-700">Bạn đang chơi dở: bấm tiếp tục để chơi tiếp từ câu {initial!.index + 1}.</li>}
          </ul>
          <button disabled={busy} onClick={start} className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-base font-bold text-white shadow hover:bg-primary-dark disabled:opacity-60">
            {busy ? "Đang tải..." : resuming ? "Tiếp tục chơi" : "Bắt đầu chơi"} <ArrowRight className="size-5" />
          </button>
          <Link href={listHref} className="block text-center text-sm text-muted hover:text-primary">← Chọn trò khác</Link>
        </div>
      </div>
    );
  }

  if (!state || !q) return null;
  const isFb = phase === "feedback";
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center gap-3">
        <TimerRing left={left} total={info.seconds * 1000} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate font-semibold">{th.emoji} {info.title}</span>
            <span className="shrink-0 text-muted">Câu {Math.min(state.index + 1, state.total)}/{state.total}</span>
          </div>
          <div className="mt-1.5 flex gap-1">{Array.from({ length: state.total }, (_, i) => (
            <span key={i} className={cn("h-2 flex-1 rounded-full", i < marks.length ? (marks[i] ? "bg-emerald-500" : "bg-rose-400") : i === state.index ? "bg-primary" : "bg-slate-200")} />
          ))}</div>
        </div>
        <button onClick={sound.toggle} aria-label={sound.on ? "Tắt âm thanh" : "Bật âm thanh"} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">{sound.on ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}</button>
      </div>
      {state.streak >= 2 && <div className="g-pop inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-600"><Flame className="size-4" />{state.streak} câu đúng liên tiếp!</div>}

      <div key={q.id} className={cn("g-slide rounded-xl border border-border bg-white p-4 shadow-sm", isFb && fb && !fb.correct && "g-shake")}>
        {q.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.imageUrl} alt="Hình của câu hỏi" className="mx-auto mb-3 max-h-64 w-full rounded-lg object-contain" />
        )}
        <h3 className="text-lg font-semibold leading-snug">{q.text}</h3>
        {q.kind === "ORDER" && <p className="mt-1 text-xs text-muted">Bấm các mục theo đúng thứ tự (bấm lại để bỏ chọn).</p>}

        <div className="mt-4 space-y-2">
          {q.kind === "CHOICE" && q.items.map((it, idx) => {
            const isPicked = picked === it.i;
            const isRight = isFb && fb && it.text === fb.correctText;
            return (
              <button key={it.i} disabled={isFb || busy} onClick={() => { setPicked(it.i); void submit(it.i); }}
                className={cn("flex w-full items-center gap-3 rounded-lg border-2 px-3 py-3 text-left text-[15px] font-medium transition active:scale-[.99]", isFb ? (isRight ? "border-emerald-500 bg-emerald-50" : isPicked ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-slate-50 opacity-60") : CHOICE_COLORS[idx % 5])}>
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white", isFb ? (isRight ? "bg-emerald-500" : isPicked ? "bg-rose-500" : "bg-slate-400") : LETTER_COLORS[idx % 5])}>{isFb && isRight ? <Check className="size-4" /> : isFb && isPicked ? <X className="size-4" /> : LETTERS[idx]}</span>
                <span className="flex-1">{it.text}</span>
              </button>
            );
          })}

          {q.kind === "FILL" && (
            <form onSubmit={(e) => { e.preventDefault(); if (fill.trim() && !isFb) void submit(fill.trim()); }} className="flex gap-2">
              <input autoFocus disabled={isFb || busy} value={fill} onChange={(e) => setFill(e.target.value)} maxLength={120} placeholder="Gõ đáp án của bạn..." className="h-12 flex-1 rounded-lg border-2 border-slate-200 px-3 text-base outline-none focus:border-primary disabled:bg-slate-50" />
              <button type="submit" disabled={isFb || busy || !fill.trim()} className="h-12 rounded-lg bg-primary px-5 font-bold text-white disabled:opacity-50">Trả lời</button>
            </form>
          )}

          {q.kind === "ORDER" && (
            <>
              <div className="min-h-14 space-y-1.5 rounded-lg border-2 border-dashed border-slate-200 p-2">
                {order.length === 0 && <p className="py-2 text-center text-sm text-muted">Chưa chọn mục nào</p>}
                {order.map((oi, pos) => { const it = q.items.find((x) => x.i === oi)!; return (
                  <button key={oi} disabled={isFb || busy} onClick={() => setOrder(order.filter((x) => x !== oi))} className="flex w-full items-center gap-2 rounded-md bg-violet-50 px-3 py-2 text-left text-[15px] font-medium"><span className="flex size-6 items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white">{pos + 1}</span>{it.text}</button>
                ); })}
              </div>
              <div className="flex flex-wrap gap-2">
                {q.items.filter((it) => !order.includes(it.i)).map((it) => (
                  <button key={it.i} disabled={isFb || busy} onClick={() => setOrder([...order, it.i])} className="rounded-full border-2 border-violet-200 bg-white px-4 py-2 text-[15px] font-medium hover:bg-violet-50">{it.text}</button>
                ))}
              </div>
              <button disabled={isFb || busy || order.length !== q.items.length} onClick={() => void submit(order)} className="h-11 w-full rounded-lg bg-primary font-bold text-white disabled:opacity-50">Chốt đáp án</button>
            </>
          )}
        </div>

        {isFb && fb && (
          <div className={cn("g-pop mt-4 rounded-lg border p-3", fb.correct ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50")}>
            <div className={cn("flex items-center gap-2 text-base font-bold", fb.correct ? "text-emerald-700" : "text-rose-700")}>
              {fb.correct ? <><Check className="size-5" />Chính xác! 🎉</> : fb.timedOut ? <><Clock className="size-5" />Hết giờ rồi ⏰</> : <><X className="size-5" />Chưa đúng</>}
              {fb.correct && fb.streak >= 3 && <span className="ml-auto text-orange-600">🔥 {fb.streak}</span>}
            </div>
            {!fb.correct && <p className="mt-1 text-sm text-slate-700">Đáp án đúng: <b>{fb.correctText}</b></p>}
            {fb.explanation && <p className="mt-1 text-sm text-slate-600">💡 {fb.explanation}</p>}
            <button onClick={() => void next()} disabled={busy} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-bold text-white hover:bg-primary-dark disabled:opacity-60">{fb.finished ? "Xem kết quả" : "Câu tiếp theo"} <ArrowRight className="size-5" /></button>
            <p className="mt-1 text-center text-xs text-muted">Nhấn Enter để tiếp tục</p>
          </div>
        )}
      </div>
    </div>
  );
}
