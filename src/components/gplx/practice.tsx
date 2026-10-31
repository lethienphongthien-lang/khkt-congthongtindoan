"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Bike, Bookmark, BookmarkCheck, Bus, Car, Check, CheckCircle2, ChevronLeft, Clock, ClipboardCheck, Dices, Dumbbell, Flame, Frown, Grid3x3, Handshake, Layers, Motorbike, PartyPopper, Route, ScrollText, Star, Trophy, TrafficCone, Truck, Van, Volume2, VolumeX, Wrench, X, XCircle, Zap, type LucideIcon } from "lucide-react";
import data from "@/data/gplx-600.json";
import { Confetti, useSound } from "@/components/games/quiz-player";
import { cn } from "@/utils";

type Q = { number: number; chapter: number; text: string; options: string[]; correct: number; images: string[]; critical: boolean; forA: boolean; forB1: boolean };
const ALL = data as Q[];
const BY_NUM = new Map(ALL.map((q) => [q.number, q]));

const LETTER_COLORS = ["bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];
const CHAPTERS = [
  { id: 1, name: "Quy định chung và quy tắc giao thông", icon: ScrollText, grad: "from-sky-500 to-blue-600" },
  { id: 2, name: "Văn hóa giao thông, đạo đức, PCCC, cứu hộ", icon: Handshake, grad: "from-emerald-500 to-green-600" },
  { id: 3, name: "Kỹ thuật lái xe", icon: Car, grad: "from-amber-400 to-orange-500" },
  { id: 4, name: "Cấu tạo và sửa chữa", icon: Wrench, grad: "from-violet-500 to-purple-600" },
  { id: 5, name: "Báo hiệu đường bộ", icon: TrafficCone, grad: "from-rose-500 to-pink-600" },
  { id: 6, name: "Giải thế sa hình, xử lý tình huống", icon: Route, grad: "from-cyan-500 to-teal-600" },
];

/** Cấu trúc đề theo Công văn 2262/CSGT-P5: số câu mỗi chương [1..6], chưa tính 1 câu điểm liệt riêng. Mô tô: 1 câu "kỹ thuật lái xe hoặc cấu tạo sửa chữa" lấy ở chương 3. */
const EXAMS = [
  { id: "A", label: "Hạng A1, A", sub: "Mô tô", n: 25, icon: Bike, grad: "from-amber-400 to-orange-500", pool: "forA", parts: [8, 1, 1, 0, 8, 6] },
  { id: "B1", label: "Hạng B1", sub: "Mô tô", n: 25, icon: Motorbike, grad: "from-orange-500 to-red-500", pool: "forB1", parts: [8, 1, 1, 0, 8, 6] },
  { id: "B", label: "Hạng B", sub: "Ô tô", n: 30, icon: Car, grad: "from-sky-500 to-blue-600", pool: "all", parts: [8, 1, 1, 1, 9, 9] },
  { id: "C1", label: "Hạng C1", sub: "Ô tô tải nhẹ", n: 35, icon: Van, grad: "from-emerald-500 to-green-600", pool: "all", parts: [10, 1, 2, 1, 10, 10] },
  { id: "C", label: "Hạng C", sub: "Ô tô tải", n: 40, icon: Truck, grad: "from-violet-500 to-purple-600", pool: "all", parts: [10, 1, 2, 1, 14, 11] },
  { id: "D", label: "Hạng D, D1, D2, BE, CE…", sub: "Ô tô khách, đầu kéo", n: 45, icon: Bus, grad: "from-rose-500 to-pink-600", pool: "all", parts: [10, 1, 2, 1, 16, 14] },
] as const;

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function buildExam(id: string): Q[] {
  const ex = EXAMS.find((e) => e.id === id)!;
  const pool = ALL.filter((q) => (ex.pool === "all" ? true : q[ex.pool]));
  const picked: Q[] = [shuffle(pool.filter((q) => q.critical))[0]];
  ex.parts.forEach((n, i) => picked.push(...shuffle(pool.filter((q) => q.chapter === i + 1 && !q.critical)).slice(0, n)));
  return shuffle(picked);
}

// ===== Lưu tiến độ trên máy người dùng (không cần đăng nhập) =====
type Progress = { flags: number[]; done: Record<number, boolean> }; // done[số câu] = lần trả lời gần nhất đúng/sai
const KEY = "gplx:progress:v1";
function load(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (p && Array.isArray(p.flags) && p.done) return p;
  } catch { /* trình duyệt chặn lưu trữ: dùng tạm trong phiên */ }
  return { flags: [], done: {} };
}
function useProgress() {
  const [p, setP] = useState<Progress>({ flags: [], done: {} });
  useEffect(() => { setP(load()); }, []);
  const update = useCallback((fn: (p: Progress) => Progress) => {
    setP((cur) => {
      const next = fn(cur);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* bỏ qua */ }
      return next;
    });
  }, []);
  return [p, update] as const;
}

type Session = { title: string; icon: LucideIcon; grad: string; mode: "study" | "exam"; qs: Q[]; desc: string; retry?: () => Session };

// ===== Trang chọn =====
function Home({ progress, onStart }: { progress: Progress; onStart: (s: Session) => void }) {
  const wrong = Object.entries(progress.done).filter(([, ok]) => !ok).map(([n]) => BY_NUM.get(+n)!).filter(Boolean);
  const flagged = progress.flags.map((n) => BY_NUM.get(n)!).filter(Boolean);
  const doneCount = Object.keys(progress.done).length;
  const rightCount = Object.values(progress.done).filter(Boolean).length;
  const study = (title: string, icon: LucideIcon, grad: string, qs: Q[], desc: string) => qs.length && onStart({ title, icon, grad, mode: "study", qs, desc });
  const examSession = (e: (typeof EXAMS)[number]): Session => ({ title: `Thi thử ${e.label}`, icon: e.icon, grad: e.grad, mode: "exam", qs: buildExam(e.id), desc: `${e.n} câu ngẫu nhiên đúng cấu trúc đề của Cục Cảnh sát giao thông, trong đó có 1 câu điểm liệt.`, retry: () => examSession(e) });
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-primary-dark to-primary p-4 text-white shadow-sm">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm opacity-90">Tiến độ của bạn</div>
            <div className="text-3xl font-extrabold">{doneCount}<span className="text-lg font-semibold opacity-80">/600 câu đã làm</span></div>
          </div>
          <div className="text-right text-sm"><div className="flex items-center justify-end gap-1"><CheckCircle2 className="size-4" />Đúng {rightCount}</div><div className="flex items-center justify-end gap-1"><XCircle className="size-4" />Sai {doneCount - rightCount}</div></div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-[#ffd400]" style={{ width: `${doneCount / 6}%` }} /></div>
        <div className="mt-1.5 text-xs opacity-80">Tiến độ được lưu ngay trên thiết bị này.</div>
      </div>

      <section>
        <SectionTitle icon={ClipboardCheck} text="Thi thử theo hạng" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {EXAMS.map((e) => (
            <button key={e.id} onClick={() => onStart(examSession(e))} className="group flex flex-col overflow-hidden rounded border border-border bg-white/90 text-left transition-shadow hover:shadow-md">
              <div className={cn("flex items-center gap-2 bg-gradient-to-br px-3 py-3 text-white", e.grad)}><e.icon className="size-8" /><span className="text-xs opacity-90">{e.sub}</span></div>
              <div className="p-2.5"><div className="text-sm leading-tight font-bold group-hover:text-primary">{e.label}</div><div className="text-xs text-muted">{e.n} câu · có điểm liệt</div></div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle icon={Layers} text="Ôn theo chương" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {CHAPTERS.map((c) => {
            const qs = ALL.filter((q) => q.chapter === c.id);
            const done = qs.filter((q) => q.number in progress.done).length;
            const right = qs.filter((q) => progress.done[q.number]).length;
            return (
              <button key={c.id} onClick={() => study(`Chương ${c.id}: ${c.name}`, c.icon, c.grad, qs, `${qs.length} câu của chương. Chọn đáp án là biết đúng sai ngay, có thể đánh dấu câu khó và quay lại câu trước.`)}
                className="group flex flex-col overflow-hidden rounded border border-border bg-white/90 text-left transition-shadow hover:shadow-md">
                <div className={cn("flex items-center gap-3 bg-gradient-to-br px-3 py-4 text-white", c.grad)}>
                  <c.icon className="size-10 shrink-0" />
                  <div className="min-w-0"><div className="text-xs opacity-90">Chương {c.id}</div><div className="line-clamp-2 leading-tight font-bold">{c.name}</div></div>
                </div>
                <div className="p-2.5">
                  <div className="flex justify-between text-xs text-muted"><span>{qs.length} câu</span><span>Làm {done} · đúng {right}</span></div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="flex h-full"><div className="bg-emerald-500" style={{ width: `${(right / qs.length) * 100}%` }} /><div className="bg-rose-400" style={{ width: `${((done - right) / qs.length) * 100}%` }} /></div></div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle icon={Zap} text="Ôn nhanh" />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Quick icon={Flame} title="60 câu điểm liệt" sub="Sai là rớt ngay" grad="from-red-500 to-rose-600" onClick={() => study("60 câu điểm liệt", Flame, "from-red-500 to-rose-600", ALL.filter((q) => q.critical), "Nhóm câu tình huống mất an toàn giao thông nghiêm trọng. Mỗi đề thi có 1 câu, sai là không đạt.")} />
          <Quick icon={Dices} title="Ngẫu nhiên 20 câu" sub="Luyện nhanh" grad="from-sky-500 to-blue-600" onClick={() => study("Ngẫu nhiên 20 câu", Dices, "from-sky-500 to-blue-600", shuffle(ALL).slice(0, 20), "20 câu bất kỳ trong bộ 600 câu.")} />
          <Quick icon={Bookmark} title="Câu đã đánh dấu" sub={`${flagged.length} câu`} grad="from-amber-400 to-orange-500" disabled={!flagged.length} onClick={() => study("Câu đã đánh dấu", Bookmark, "from-amber-400 to-orange-500", flagged, "Những câu bạn đã đánh dấu để ôn lại.")} />
          <Quick icon={XCircle} title="Câu làm sai" sub={`${wrong.length} câu`} grad="from-slate-500 to-slate-700" disabled={!wrong.length} onClick={() => study("Câu làm sai", XCircle, "from-slate-500 to-slate-700", wrong, "Những câu lần làm gần nhất của bạn bị sai.")} />
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-primary-dark"><Icon className="size-5" />{text}</h2>;
}

function Quick({ icon: Icon, title, sub, grad, onClick, disabled }: { icon: LucideIcon; title: string; sub: string; grad: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex items-center gap-3 overflow-hidden rounded border border-border bg-white/90 text-left transition-shadow hover:shadow-md disabled:opacity-45 disabled:hover:shadow-none">
      <span className={cn("grid size-14 shrink-0 place-items-center bg-gradient-to-br text-white", grad)}><Icon className="size-6" /></span>
      <span className="min-w-0 pr-2"><span className="block text-sm leading-tight font-bold">{title}</span><span className="text-xs text-muted">{sub}</span></span>
    </button>
  );
}

// ===== Làm bài: từng câu một =====
function Player({ session, progress, update, onExit, onRetry }: { session: Session; progress: Progress; update: (fn: (p: Progress) => Progress) => void; onExit: () => void; onRetry: (() => void) | null }) {
  const { qs, mode } = session;
  const sound = useSound();
  const startAt = mode === "study" ? Math.max(0, qs.findIndex((x) => !(x.number in progress.done))) : 0;
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [idx, setIdx] = useState(startAt);
  const [ans, setAns] = useState<Record<number, number>>({});
  const [review, setReview] = useState(false);
  const [grid, setGrid] = useState(false);
  const [secs, setSecs] = useState(0);
  const [streak, setStreak] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== "exam" || phase !== "play" || review) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [mode, phase, review]);
  useEffect(() => { root.current?.scrollTo({ top: 0 }); }, [idx, phase, review]);
  const firstIdx = useRef(true);
  useEffect(() => { if (firstIdx.current) { firstIdx.current = false; return; } if (phase === "play") sound.move(); }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = qs[idx];
  const answered = q.number in ans;
  const showAnswer = review || (mode === "study" && answered);
  const flagged = (n: number) => progress.flags.includes(n);
  const toggleFlag = (n: number) => update((p) => ({ ...p, flags: p.flags.includes(n) ? p.flags.filter((x) => x !== n) : [...p.flags, n] }));

  const choose = (i: number) => {
    if (review) return;
    if (mode === "study") {
      if (answered) return;
      const ok = i === q.correct;
      update((p) => ({ ...p, done: { ...p.done, [q.number]: ok } }));
      setStreak((s) => (ok ? s + 1 : 0));
      if (ok) sound.ok(); else sound.bad();
    }
    else sound.tick();
    setAns((a) => ({ ...a, [q.number]: i }));
  };

  const finish = () => {
    if (mode === "exam") update((p) => ({ ...p, done: { ...p.done, ...Object.fromEntries(qs.map((x) => [x.number, ans[x.number] === x.correct])) } }));
    setPhase("done");
    const okCount = qs.filter((x) => ans[x.number] === x.correct).length;
    const failedNow = mode === "exam" && qs.some((x) => x.critical && ans[x.number] !== x.correct);
    if (!failedNow && okCount / qs.length >= 0.6) sound.win(); else sound.lose();
  };
  const askFinish = () => { const left = qs.length - Object.keys(ans).length; if (left === 0 || confirm(`Còn ${left} câu chưa làm. Vẫn nộp bài?`)) { setGrid(false); finish(); } };
  const next = () => {
    if (idx < qs.length - 1) setIdx(idx + 1);
    else if (review) setPhase("done"), setReview(false);
    else if (mode === "study") finish();
    else setGrid(true);
  };

  useEffect(() => {
    if (phase !== "play") return;
    const h = (e: KeyboardEvent) => {
      if (grid) return;
      if (/^[1-4]$/.test(e.key) && q.options[Number(e.key) - 1] !== undefined) choose(Number(e.key) - 1);
      else if ((e.key === "Enter" || e.key === "ArrowRight") && (answered || mode === "exam" || review)) { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft" && idx > 0) setIdx(idx - 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const right = qs.filter((x) => ans[x.number] === x.correct).length;
  const doneCount = Object.keys(ans).length;
  const critFail = qs.some((x) => x.critical && ans[x.number] !== x.correct);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0"), ss = String(secs % 60).padStart(2, "0");
  let best = 0, run = 0;
  for (const x of qs) { run = ans[x.number] === x.correct ? run + 1 : 0; best = Math.max(best, run); }

  // ---- Giới thiệu
  if (phase === "intro") {
    const critCount = qs.filter((x) => x.critical).length;
    return (
      <div className="g-pop mx-auto max-w-xl overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className={cn("bg-gradient-to-br px-6 py-8 text-center text-white", session.grad)}>
          <session.icon className="mx-auto size-16" />
          <h2 className="mt-2 text-2xl font-bold">{session.title}</h2>
          <p className="mt-1 text-sm opacity-90">{mode === "exam" ? "Thi thử" : "Ôn tập"}</p>
        </div>
        <div className="space-y-3 p-5 text-sm">
          <p className="text-slate-700">{session.desc}</p>
          <ul className="grid grid-cols-3 gap-2 text-center">
            <li className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{qs.length}</div><div className="text-xs text-muted">câu hỏi</div></li>
            <li className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold text-red-600">{critCount}</div><div className="text-xs text-muted">câu điểm liệt</div></li>
            <li className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{mode === "exam" ? "Nộp bài" : "Ngay"}</div><div className="text-xs text-muted">{mode === "exam" ? "mới biết kết quả" : "biết đúng sai"}</div></li>
          </ul>
          <ul className="list-disc space-y-1 pl-5 text-slate-600">
            <li>Câu hỏi hiện <b>lần lượt từng câu</b>, có thể <b>quay lại câu trước</b> và <b>đánh dấu</b> câu khó.</li>
            {mode === "exam" ? <li>Được đổi đáp án đến khi nộp bài. <b>Sai câu điểm liệt là không đạt.</b></li> : <li>Phím tắt: 1 đến 4 chọn đáp án, Enter sang câu tiếp.</li>}
            {startAt > 0 && <li className="font-medium text-amber-700">Bạn đã làm {startAt} câu đầu: bấm tiếp tục để làm từ câu {startAt + 1}.</li>}
          </ul>
          <button onClick={() => setPhase("play")} className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-base font-bold text-white shadow hover:bg-primary-dark">
            {startAt > 0 ? "Tiếp tục" : "Bắt đầu"} <ArrowRight className="size-5" />
          </button>
          <button onClick={onExit} className="block w-full text-center text-sm text-muted hover:text-primary">← Chọn bài khác</button>
        </div>
      </div>
    );
  }

  // ---- Kết quả
  if (phase === "done") {
    const pct = qs.length ? right / qs.length : 0;
    const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct > 0 ? 1 : 0;
    const failed = mode === "exam" && critFail;
    const ResultIcon = failed ? Frown : pct >= 0.8 ? Trophy : pct >= 0.5 ? PartyPopper : Dumbbell;
    const msg = failed ? "Sai câu điểm liệt, bài thi không đạt" : pct === 1 ? "Xuất sắc! Điểm tuyệt đối!" : pct >= 0.8 ? "Giỏi quá, gần như hoàn hảo!" : pct >= 0.6 ? "Khá lắm, cố gắng thêm chút nữa!" : "Đừng nản, xem lại các câu sai rồi thử lại nhé!";
    return (
      <div className="g-pop mx-auto max-w-xl space-y-3">
        {pct >= 0.6 && !failed && <Confetti />}
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className={cn("bg-gradient-to-br px-6 py-6 text-center text-white", failed ? "from-red-600 to-rose-500" : session.grad)}>
            <ResultIcon className="mx-auto size-14" />
            <div className="mt-2 text-xl font-bold">{msg}</div>
            <div className="mt-2 flex justify-center gap-1">{[0, 1, 2].map((i) => <Star key={i} className={cn("size-8", i < stars ? "fill-[#ffd400] text-[#ffd400]" : "opacity-30")} />)}</div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border border-b border-border text-center">
            <div className="p-3"><div className="text-2xl font-bold text-primary-dark">{right}/{qs.length}</div><div className="text-xs text-muted">câu đúng</div></div>
            <div className="p-3"><div className="flex items-center justify-center gap-1 text-2xl font-bold text-orange-500"><Flame className="size-6" />{best}</div><div className="text-xs text-muted">chuỗi đúng dài nhất</div></div>
            <div className="p-3"><div className="text-2xl font-bold text-slate-700">{mode === "exam" ? `${mm}:${ss}` : qs.length - doneCount}</div><div className="text-xs text-muted">{mode === "exam" ? "thời gian làm bài" : "câu bỏ qua"}</div></div>
          </div>
          <div className="space-y-3 p-4">
            {mode === "exam" && !failed && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">Bạn không sai câu điểm liệt. Hãy đối chiếu số câu đúng tối thiểu theo quy định cho hạng giấy phép của bạn.</p>}
            <p className="text-xs text-muted">Bấm số câu để xem lại. Xanh là đúng, đỏ là sai, xám là chưa làm, chấm vàng là câu đã đánh dấu.</p>
            <Navigator qs={qs} ans={ans} idx={-1} flagged={flagged} showResult onPick={(i) => { setIdx(i); setReview(true); setPhase("play"); }} />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border p-4">
            <button onClick={() => { setIdx(0); setReview(true); setPhase("play"); }} className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark">Xem lại bài làm</button>
            {onRetry && <button onClick={onRetry} className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm hover:bg-slate-50">Làm đề khác</button>}
            <button onClick={onExit} className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm hover:bg-slate-50">Về trang chọn</button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Làm bài
  const isOk = answered && ans[q.number] === q.correct;
  return (
    // Điện thoại: toàn màn hình như app (che thanh trang, chân trang, thanh dưới); màn lớn: nằm trong trang
    <div ref={root} className="fixed inset-0 z-[60] space-y-3 overflow-y-auto bg-background px-3 pb-28 lg:static lg:z-auto lg:overflow-visible lg:bg-transparent lg:p-0 lg:pb-0">
      <div className="sticky top-0 z-10 -mx-3 flex items-center gap-3 border-b border-border bg-background px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
        <button onClick={() => (review ? (setReview(false), setPhase("done")) : confirm("Thoát? Bài đang làm sẽ không được lưu lại (tiến độ các câu đã trả lời vẫn giữ).") && onExit())} aria-label="Thoát" className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X className="size-5" /></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-1.5 truncate font-semibold"><session.icon className="size-4 shrink-0" />{review ? "Xem lại · " : ""}<span className="truncate">{session.title}</span></span>
            <span className="shrink-0 text-muted">Câu {idx + 1}/{qs.length}</span>
          </div>
          {qs.length <= 60 ? (
            <div className="mt-1.5 flex gap-1">{qs.map((x, i) => {
              const a = ans[x.number], st = a === undefined ? "" : (mode === "study" || review) ? (a === x.correct ? "ok" : "bad") : "picked";
              return <button key={x.number} onClick={() => setIdx(i)} aria-label={`Tới câu ${i + 1}`} className={cn("h-2 flex-1 rounded-full", st === "ok" ? "bg-emerald-500" : st === "bad" ? "bg-rose-400" : st === "picked" ? "bg-primary/60" : "bg-slate-200", i === idx && "ring-2 ring-primary ring-offset-1")} />;
            })}</div>
          ) : <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((idx + 1) / qs.length) * 100}%` }} /></div>}
        </div>
        {mode === "study" && streak >= 2 && <span key={streak} title={`${streak} câu đúng liên tiếp`} className="g-pop flex shrink-0 items-center gap-0.5 rounded-full bg-orange-500 px-2.5 py-1 text-sm font-bold text-white tabular-nums"><Flame className="size-4" />{streak}</span>}
        {mode === "exam" && !review && <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-sm font-bold tabular-nums"><Clock className="size-4" />{mm}:{ss}</span>}
        <button onClick={() => setGrid(true)} aria-label="Danh sách câu" className="rounded-md lg:hidden p-2 text-slate-500 hover:bg-slate-100"><Grid3x3 className="size-5" /></button>
        <button onClick={sound.toggle} aria-label={sound.on ? "Tắt âm thanh" : "Bật âm thanh"} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">{sound.on ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}</button>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-3">
      <div key={q.number} className={cn("g-slide rounded-xl border border-border bg-white p-4 shadow-sm lg:flex lg:h-[calc(100dvh-19rem)] lg:min-h-[26rem] lg:flex-col lg:p-6", mode === "study" && answered && !isOk && "g-shake")}>
        <div className="mb-2 flex items-center gap-2 text-xs lg:shrink-0">
          <span className="text-muted">Mã câu {q.number}</span>
          {q.critical && <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-700"><Flame className="size-3" />Điểm liệt</span>}
          <button onClick={() => toggleFlag(q.number)} className={cn("ml-auto flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold", flagged(q.number) ? "border-amber-500 bg-amber-50 text-amber-700" : "border-border text-slate-600 hover:bg-slate-50")}>
            {flagged(q.number) ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}{flagged(q.number) ? "Đã đánh dấu" : "Đánh dấu"}
          </button>
        </div>
        <h3 className="text-lg leading-snug font-semibold lg:shrink-0 lg:text-xl">{q.text}</h3>
        {q.images.map((f) => (
          // eslint-disable-next-line @next/next/no-img-element -- ảnh tĩnh webp
          <img key={f} src={`/gplx/${f}`} alt={`Hình minh họa câu ${q.number}`} className="mx-auto mt-3 max-h-72 w-full rounded-lg object-contain lg:max-h-60 lg:shrink-0" />
        ))}
        <div className="mt-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
        <div className="space-y-2">
          {q.options.map((o, i) => {
            const picked = ans[q.number] === i;
            const isRight = showAnswer && i === q.correct;
            const isWrong = showAnswer && picked && i !== q.correct;
            return (
              <button key={i} disabled={review || (mode === "study" && answered)} onClick={() => choose(i)}
                className={cn("flex w-full items-center gap-3 rounded-lg border-2 px-3 py-3 text-left text-[15px] font-medium transition active:scale-[.99] lg:px-4 lg:text-base",
                  showAnswer ? (isRight ? "border-emerald-500 bg-emerald-50" : isWrong ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-white opacity-70") : picked ? "border-primary bg-primary-light" : "border-slate-200 bg-white hover:border-primary/50")}>
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white", showAnswer ? (isRight ? "bg-emerald-500" : isWrong ? "bg-rose-500" : "bg-slate-400") : picked ? "bg-primary" : LETTER_COLORS[i % 4])}>
                  {showAnswer && isRight ? <Check className="size-4" /> : showAnswer && isWrong ? <X className="size-4" /> : i + 1}
                </span>
                <span className="flex-1">{o}</span>
              </button>
            );
          })}
        </div>

        {showAnswer && (
          <div className={cn("g-pop mt-4 rounded-lg border p-3", !answered ? "border-slate-200 bg-slate-50" : isOk ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50")}>
            <div className={cn("flex items-center gap-2 text-base font-bold", !answered ? "text-slate-700" : isOk ? "text-emerald-700" : "text-rose-700")}>
              {!answered ? <>Bạn chưa trả lời câu này</> : isOk ? <><PartyPopper className="size-5" />Chính xác!</> : <><X className="size-5" />Chưa đúng</>}
            </div>
            {!isOk && <p className="mt-1 text-sm text-slate-700">Đáp án đúng: <b>{q.correct + 1}. {q.options[q.correct]}</b></p>}
          </div>
        )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[61] flex gap-2 border-t border-border bg-background px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:static lg:z-auto lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
        <button disabled={idx === 0} onClick={() => setIdx(idx - 1)} className="flex h-12 items-center justify-center gap-1 rounded-lg border-2 border-slate-200 bg-white px-4 font-bold disabled:opacity-40"><ChevronLeft className="size-5" />Câu trước</button>
        <button onClick={next} className={cn("flex h-12 flex-1 items-center justify-center gap-2 rounded-lg font-bold text-white hover:opacity-95", mode === "study" && !review && !answered ? "bg-slate-400" : "bg-primary")}>
          {idx < qs.length - 1 ? (mode === "study" && !review && !answered ? "Bỏ qua câu này" : "Câu tiếp theo") : review ? "Về kết quả" : mode === "study" ? "Xem kết quả" : "Danh sách và nộp bài"} <ArrowRight className="size-5" />
        </button>
      </div>
      {mode === "study" && !review && <p className="hidden text-center text-xs text-muted lg:block">Phím tắt: 1 đến 4 chọn đáp án, Enter sang câu tiếp</p>}
      </div>
      <aside className="sticky top-4 hidden rounded-xl border border-border bg-white p-4 shadow-sm lg:block">
        <h3 className="mb-3 text-sm font-bold text-primary-dark">Danh sách câu ({doneCount}/{qs.length} đã làm)</h3>
        <div className="max-h-[60vh] overflow-y-auto p-1"><Navigator qs={qs} ans={ans} idx={idx} flagged={flagged} showResult={review || mode === "study"} onPick={setIdx} cols="grid-cols-5" /></div>
        {mode === "exam" && !review && <button onClick={askFinish} className="mt-4 h-11 w-full rounded-lg bg-emerald-600 font-bold text-white hover:bg-emerald-700">Nộp bài</button>}
        {mode === "study" && !review && <button onClick={finish} className="mt-4 h-11 w-full rounded-lg border-2 border-slate-200 font-bold hover:bg-slate-50">Kết thúc và xem kết quả</button>}
      </aside>
      </div>

      {grid && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setGrid(false)}>
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-primary-dark">Danh sách câu hỏi ({doneCount}/{qs.length} đã làm)</h3><button onClick={() => setGrid(false)} aria-label="Đóng"><X className="size-5" /></button></div>
            <Navigator qs={qs} ans={ans} idx={idx} flagged={flagged} showResult={review || mode === "study"} onPick={(i) => { setIdx(i); setGrid(false); }} />
            {mode === "exam" && !review && <button onClick={askFinish} className="mt-4 h-12 w-full rounded-lg bg-emerald-600 font-bold text-white hover:bg-emerald-700">Nộp bài</button>}
            {mode === "study" && !review && <button onClick={() => { setGrid(false); finish(); }} className="mt-4 h-12 w-full rounded-lg border-2 border-slate-200 font-bold">Kết thúc và xem kết quả</button>}
          </div>
        </div>
      )}
    </div>
  );
}

/** Lưới số câu: xanh dương = đã chọn, xanh lá/đỏ = đúng/sai (khi được phép hiện đáp án), chấm vàng = đã đánh dấu. */
function Navigator({ qs, ans, idx, flagged, showResult, onPick, cols = "grid-cols-6 sm:grid-cols-8" }: { cols?: string; qs: Q[]; ans: Record<number, number>; idx: number; flagged: (n: number) => boolean; showResult: boolean; onPick: (i: number) => void }) {
  return (
    <div className={cn("grid gap-2", cols)}>
      {qs.map((x, i) => {
        const a = ans[x.number];
        const cls = a === undefined ? (showResult ? "bg-slate-200 text-slate-500" : "bg-slate-100 text-slate-700") : !showResult ? "bg-primary text-white" : a === x.correct ? "bg-emerald-500 text-white" : "bg-rose-500 text-white";
        return (
          <button key={x.number} onClick={() => onPick(i)} className={cn("relative grid h-10 place-items-center rounded-lg text-sm font-bold", cls, i === idx && "ring-2 ring-primary ring-offset-2")}>
            {i + 1}
            {flagged(x.number) && <span className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-white bg-amber-400" />}
          </button>
        );
      })}
    </div>
  );
}

export function GplxPractice() {
  const [progress, update] = useProgress();
  const [session, setSession] = useState<Session | null>(null);
  const [run, setRun] = useState(0);
  const start = (s: Session) => { setRun((r) => r + 1); setSession(s); window.scrollTo({ top: 0 }); };
  return session ? (
    <Player key={run} session={session} progress={progress} update={update} onExit={() => { setSession(null); window.scrollTo({ top: 0 }); }} onRetry={session.retry ? () => start(session.retry!()) : null} />
  ) : (
    <Home progress={progress} onStart={start} />
  );
}
