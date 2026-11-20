"use client";
import { useT } from "@/lib/i18n/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eraser, Heading, Scissors, Sparkles, SpellCheck, TextQuote, Wand2 } from "lucide-react";
import { aiAssistAction, aiAvailableAction } from "@/actions/ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import type { MessageKey } from "@/lib/i18n/translate";
import { Modal } from "@/components/ui/modal";
import { plainText } from "@/lib/rich-html";
import type { UploadedImage } from "@/components/ui/image-upload";
import { Select } from "@/components/ui/form";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { aiReviewArticleAction, type ReviewResult } from "@/actions/ai";

type Kind = "NEWS" | "PLAN" | "EVENT" | "ANNOUNCEMENT" | "STORY" | "CAREER" | "DOCUMENT";
const WORKING = { draft: "cms.ai.w.draft", polish: "cms.ai.w.polish", shorten: "cms.ai.w.shorten", spelling: "cms.ai.w.spelling", summary: "cms.ai.w.summary", title: "cms.ai.w.title" } as const;
const HINT: Record<Kind, MessageKey> = {
  NEWS: "cms.ai.h.NEWS", // Lễ chào cờ tuần 7, chủ đề an toàn giao thông, có phần thi tìm hiểu của Chi đoàn 11B2, có 120 em tham gia.",
  PLAN: "cms.ai.h.PLAN", // Kế hoạch tổ chức Ngày Chủ nhật xanh tháng 11, dọn vệ sinh sân trường, các Chi đoàn khối 10 tham gia, 7 giờ sáng.",
  EVENT: "cms.ai.h.EVENT", // Hội thi Rung chuông vàng tìm hiểu về Đoàn, ngày 26/3, hội trường, mỗi Chi đoàn cử 3 đội viên.",
  ANNOUNCEMENT: "cms.ai.h.ANNOUNCEMENT", // Thông báo nộp báo cáo Chi đoàn tháng 10 trước ngày 25, gửi qua hệ thống.",
  STORY: "cms.ai.h.STORY", // Bạn Lan lớp 11B1 nhặt được ví và trả lại người mất, các bạn trong lớp cùng quyên góp giúp bạn khó khăn.",
  DOCUMENT: "cms.ai.h.DOCUMENT", // Chủ đề sinh hoạt tháng 11 về an toàn mạng xã hội, thời lượng 30 phút, có 3 câu hỏi thảo luận.",
  CAREER: "cms.ai.h.CAREER", // Giới thiệu ngành Công nghệ thông tin: cần học tốt Toán, Tin, các trường đào tạo, cơ hội việc làm.",
};

/** Thanh "Trợ lý AI" cho biểu mẫu soạn bài: viết nháp từ ý, nhuận sắc, rút gọn, sửa chính tả, tạo tóm tắt. */
export function AiAssist({ kind, title, content, onContent, onSummary, onTitle, summary, onBusy }: { kind: Kind; title: string; content: string; summary: string; onContent: (html: string) => void; onSummary: (text: string) => void; onTitle: (text: string) => void; /** Báo cho biểu mẫu biết AI đang làm việc (để khóa nhập liệu và hiện hiệu ứng). */ onBusy: (label: string | null) => void }) {
  const t = useT();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [ideas, setIdeas] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => { aiAvailableAction().then((r) => setEnabled(r.ok ? !!r.data?.enabled : false)); }, []);
  if (enabled === null) return null;

  const empty = plainText(content, 20).length < 10;
  async function go(mode: "draft" | "polish" | "shorten" | "spelling" | "summary" | "title", input: string) {
    setBusy(mode); onBusy(t(WORKING[mode]));
    let r: Awaited<ReturnType<typeof aiAssistAction>>;
    try { r = await aiAssistAction({ mode, kind, title, input }); }
    catch { setBusy(null); onBusy(null); toast.error(t("cms.ai.lost")); return false; }
    setBusy(null); onBusy(null);
    if (!r.ok || !r.data) { toast.error(r.ok ? t("cms.ai.noAnswer") : r.error); return false; }
    setLeft(r.data.remaining);
    if (mode === "summary") { onSummary(r.data.text); toast.success(t("cms.ai.filledSummary")); }
    else if (mode === "title") { onTitle(r.data.text); toast.success(t("cms.ai.filledTitle")); }
    else {
      onContent(r.data.text);
      if (mode === "draft") { if (r.data.title) onTitle(r.data.title); if (r.data.summary) onSummary(r.data.summary); }
      toast.success(mode === "draft" ? t("cms.ai.draftDone") : t("cms.ai.updated")); }
    return true;
  }
  const act = (mode: "polish" | "shorten" | "spelling" | "summary" | "title", label: string, Icon: typeof Wand2) => (
    // Không khóa nút khi chưa có nội dung (nhìn như bị hỏng): bấm vào sẽ nhắc cần viết nội dung trước
    <Button type="button" size="sm" variant="secondary" disabled={!!busy} loading={busy === mode} title={t("cms.ai.useOn")}
      onClick={() => { if (empty) return void toast.info(t("cms.ai.needContent")); void go(mode, content); }}><Icon className="size-3.5" />{label}</Button>
  );

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/70 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 font-semibold text-violet-700"><Sparkles className="size-4" />{t("cms.ai.assistant")}</span>
        {enabled ? (
          <>
            <Button type="button" size="sm" disabled={!!busy} onClick={() => setOpen(true)}><Wand2 className="size-3.5" />{t("cms.ai.write")}</Button>
            {act("polish", t("cms.ai.polish"), TextQuote)}{act("shorten", t("cms.ai.shorten"), Scissors)}{act("spelling", t("cms.ai.spelling"), SpellCheck)}{act("title", t("cms.ai.suggestTitle"), Heading)}{act("summary", t("cms.ai.makeSummary"), Eraser)}
            {empty && <span className="text-xs text-muted max-sm:hidden">{t("cms.ai.othersLater")}</span>}
            {left !== null && <span className="ml-auto text-xs text-muted">{t("cms.ai.left", { n: left })}</span>}
          </>
        ) : <span className="text-muted">{t("cms.ai.disabled")}</span>}
      </div>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title={t("cms.ai.draftTitle")} className="max-w-lg">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{t("cms.ai.draftIntro1")}<b>{t("cms.ai.draftIntroB")}</b> {empty ? "" : <b>{t("cms.ai.draftReplace")}</b>}{t("cms.ai.draftIntro2")}<b>{t("cms.ai.noMakeUp")}</b>.</p>
          <Textarea className="min-h-32" value={ideas} maxLength={3000} placeholder={t(HINT[kind])} onChange={(e) => setIdeas(e.target.value)} />
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{t("cms.ai.privacy")}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={!!busy} onClick={() => setOpen(false)}>{t("cms.c.cancel")}</Button>
            <Button type="button" loading={busy === "draft"} disabled={ideas.trim().length < 8} onClick={async () => { const text = ideas; setOpen(false); /* đóng hộp thoại ngay, biểu mẫu hiện hiệu ứng AI đang viết */ if (await go("draft", text)) setIdeas(""); else setOpen(true); /* lỗi: mở lại, giữ nguyên ý đã gõ */ }}><Wand2 className="size-4" />{t("cms.ai.writeForMe")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** Lớp phủ khi AI đang làm việc: chặn mọi thao tác trên biểu mẫu và hiện hiệu ứng "đang viết". */
export function AiWorkingOverlay({ label }: { label: string }) {
  const t = useT();
  return (
    <div role="status" aria-live="polite" className="ai-overlay absolute inset-0 z-30 rounded-lg bg-white/75 backdrop-blur-[2px]">
      <div className="sticky top-28 mx-auto mt-24 flex w-fit max-w-[90%] flex-col items-center gap-3 rounded-2xl border border-violet-200 bg-white px-8 py-6 text-center shadow-xl">
        <span className="ai-orb relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white"><Sparkles className="size-7" /></span>
        <div className="text-base font-semibold text-violet-700">{label}<span className="ai-dots" aria-hidden><i>.</i><i>.</i><i>.</i></span></div>
        <div className="flex w-56 flex-col gap-1.5" aria-hidden>
          <span className="ai-line h-2 w-full rounded-full" /><span className="ai-line h-2 w-5/6 rounded-full" /><span className="ai-line h-2 w-2/3 rounded-full" />
        </div>
        <p className="text-xs text-muted">{t("cms.ai.pleaseWait")}</p>
      </div>
    </div>
  );
}

// ============================================================ SOÁT BÀI CHỜ DUYỆT

/** Bảng "AI soát bài" cho Admin khi duyệt: chính tả, giọng văn, chỗ còn để trống, nội dung nhạy cảm. Chỉ là gợi ý, Admin vẫn là người quyết định. */
export function AiReviewPanel({ articleId }: { articleId: string }) {
  const t = useT();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<(ReviewResult & { remaining: number }) | null>(null);
  useEffect(() => { aiAvailableAction().then((r) => setEnabled(r.ok ? !!r.data?.enabled : false)); }, []);
  if (!enabled) return null;
  async function run() {
    setBusy(true);
    try { const r = await aiReviewArticleAction(articleId); if (!r.ok || !r.data) toast.error(r.ok ? t("cms.ai.noAnswer") : r.error); else setRes(r.data); }
    catch { toast.error(t("cms.ai.lostReview")); }
    finally { setBusy(false); }
  }
  const V = { ok: { Icon: CheckCircle2, cls: "border-emerald-300 bg-emerald-50 text-emerald-800", label: t("cms.ai.v.ok") }, fix: { Icon: AlertTriangle, cls: "border-amber-300 bg-amber-50 text-amber-800", label: t("cms.ai.v.fix") }, risk: { Icon: ShieldAlert, cls: "border-red-300 bg-red-50 text-red-800", label: t("cms.ai.v.risk") } };
  return (
    <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50/60 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 font-semibold text-violet-700"><Sparkles className="size-4" />{t("cms.ai.reviewer")}</span>
        <Button type="button" size="sm" loading={busy} onClick={run}><Wand2 className="size-3.5" />{res ? t("cms.ai.recheck") : t("cms.ai.reviewThis")}</Button>
        {!res && <span className="text-xs text-muted">{t("cms.ai.reviewHint")}</span>}
        {res && <span className="ml-auto text-xs text-muted">{t("cms.ai.left", { n: res.remaining })}</span>}
      </div>
      {res && (() => { const v = V[res.verdict]; return (
        <div className="mt-3 space-y-2">
          <div className={`flex items-start gap-2 rounded-md border px-3 py-2 ${v.cls}`}><v.Icon className="mt-0.5 size-4 shrink-0" /><div><b>{v.label}.</b> {res.summary}</div></div>
          {res.placeholders > 0 && <p className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-yellow-900">{t("cms.ai.blanksA")}<b>{res.placeholders}{t("cms.ai.blanksB")}</b>{t("cms.ai.blanksC")}<span className="rounded bg-yellow-200 px-1 font-semibold">[ghi rõ ...]</span>{t("cms.ai.blanksD")}</p>}
          {res.spelling.length > 0 && <div><div className="mb-1 font-medium">{t("cms.ai.spellHeading", { n: res.spelling.length })}</div><ul className="space-y-0.5">{res.spelling.map((s, i) => <li key={i} className="flex flex-wrap gap-1.5"><span className="rounded bg-red-100 px-1.5 text-red-700 line-through">{s.wrong}</span>→<span className="rounded bg-emerald-100 px-1.5 text-emerald-800">{s.fix}</span></li>)}</ul></div>}
          {res.tone && <p><b>{t("cms.ai.tone")}</b> {res.tone}</p>}
          {res.sensitive.length > 0 && <div><div className="mb-1 font-medium text-red-700">{t("cms.ai.sensitive")}</div><ul className="list-disc space-y-0.5 pl-5">{res.sensitive.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
          {res.spelling.length === 0 && res.sensitive.length === 0 && res.placeholders === 0 && <p className="text-muted">{t("cms.ai.allClear")}</p>}
          <p className="text-xs text-muted">{t("cms.ai.suggestOnly")}</p>
        </div>
      ); })()}
    </div>
  );
}

