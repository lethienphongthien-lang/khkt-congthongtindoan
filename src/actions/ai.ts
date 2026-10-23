"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { generateText, aiConfigured } from "@/lib/ai/gemini";
import { takeAiQuota } from "@/lib/ai/quota";
import { SYSTEM, buildPrompt } from "@/lib/ai/prompts";
import { cleanHtml } from "@/lib/sanitize";
import { plainText, countPlaceholders } from "@/lib/rich-html";

/** Số lần dùng AI tối đa mỗi người mỗi 24 giờ (chống lạm dụng và tốn phí). */
const DAILY_LIMIT = 40;

const schema = z.object({
  mode: z.enum(["draft", "polish", "shorten", "spelling", "summary", "title"]),
  kind: z.enum(["NEWS", "PLAN", "EVENT", "ANNOUNCEMENT", "STORY", "CAREER", "DOCUMENT"]),
  title: z.string().trim().max(200).default(""),
  input: z.string().max(14000),
});

export async function aiAvailableAction() {
  return run<{ enabled: boolean }>(async () => {
    await requireRole(["ADMIN", "SECRETARY"]);
    return { data: { enabled: aiConfigured() } };
  });
}

/** Trợ lý soạn bài: viết nháp từ ý, nhuận sắc, rút gọn, sửa chính tả, tạo tóm tắt. Kết quả luôn là bản nháp để người soạn xem lại. */
export async function aiAssistAction(input: unknown) {
  return run<{ text: string; title?: string; summary?: string; remaining: number }>(async () => {
    const user = await requireRole(["ADMIN", "SECRETARY"]);
    const d = schema.parse(input);
    const raw = d.input.trim();
    if (d.mode === "draft") { if (raw.length < 8) throw new UserError("Hãy gõ vài ý chính (ít nhất 8 ký tự) để AI viết"); }
    else if (plainText(raw, 50).length < 10) throw new UserError("Chưa có nội dung để xử lý, hãy viết hoặc dán nội dung vào trình soạn thảo trước");
    if (!aiConfigured()) throw new UserError("Chưa bật trợ lý AI: quản trị hệ thống cần cấu hình GEMINI_API_KEY");

    const since = new Date(Date.now() - 24 * 3600_000);
    const used = await db.auditLog.count({ where: { userId: user.id, action: "ai.assist", createdAt: { gte: since } } });
    if (used >= DAILY_LIMIT) throw new UserError(`Bạn đã dùng hết ${DAILY_LIMIT} lượt AI trong 24 giờ, hãy quay lại sau`);

    const { prompt, maxTokens } = buildPrompt(d.mode, d.kind, raw, d.title);
    const out = await generateText(SYSTEM, prompt, { maxTokens, temperature: d.mode === "draft" ? 0.8 : 0.3, json: d.mode === "draft" });
    await audit(user.id, "ai.assist", "Article", null, { mode: d.mode, kind: d.kind, chars: raw.length });

    const strip = (t: string) => t.replace(/^```(?:json|html)?\s*/i, "").replace(/\s*```$/, "").trim();
    const toHtml = (t: string) => {
      let h = strip(t);
      // AI đôi khi trả Markdown thay vì HTML: chuyển tối thiểu, rồi lọc HTML như mọi nội dung khác
      if (!/^\s*<(p|h[1-6]|ul|ol)[\s>]/i.test(h)) h = h.split(/\n{2,}/).map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>")}</p>`).join("");
      return cleanHtml(h);
    };
    if (d.mode === "summary") return { data: { text: plainText(strip(out), 500).slice(0, 500), remaining: DAILY_LIMIT - used - 1 } };
    if (d.mode === "title") return { data: { text: plainText(strip(out), 120).replace(/^["“]|["”]$/g, "").slice(0, 120), remaining: DAILY_LIMIT - used - 1 } };
    if (d.mode === "draft") {
      try {
        const j = JSON.parse(strip(out)) as { title?: string; summary?: string; content?: string };
        if (j.content) return { data: { text: toHtml(j.content), title: plainText(j.title ?? "", 120).replace(/^["“]|["”]$/g, "") || undefined, summary: plainText(j.summary ?? "", 500).slice(0, 500) || undefined, remaining: DAILY_LIMIT - used - 1 } };
      } catch { /* AI không trả JSON hợp lệ: dùng nguyên văn làm nội dung */ }
    }
    const text = toHtml(out);
    return { data: { text, remaining: DAILY_LIMIT - used - 1 } };
  });
}

const parseJson = <T,>(t: string): T | null => { try { return JSON.parse(t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()) as T; } catch { return null; } };
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");

// ============================================================ DUYỆT BÀI
export type ReviewResult = { verdict: "ok" | "fix" | "risk"; summary: string; placeholders: number; spelling: { wrong: string; fix: string }[]; tone: string; sensitive: string[] };

/** Admin: AI soát nhanh bài chờ duyệt (chính tả, giọng văn, nội dung nhạy cảm). Chỗ còn "[ghi rõ ...]" được đếm bằng mã, không nhờ AI. */
export async function aiReviewArticleAction(articleId: string) {
  return run<ReviewResult & { remaining: number }>(async () => {
    const user = await requireRole(["ADMIN"]);
    if (!aiConfigured()) throw new UserError("Chưa bật trợ lý AI: quản trị hệ thống cần cấu hình GEMINI_API_KEY");
    const a = await db.article.findUnique({ where: { id: articleId }, select: { title: true, summary: true, content: true, kind: true } });
    if (!a) throw new UserError("Không tìm thấy bài viết");
    const text = `Tiêu đề: ${a.title}\nTóm tắt: ${plainText(a.summary ?? "", 1000)}\nNội dung: ${plainText(a.content, 11000)}`;
    const placeholders = countPlaceholders(`${a.summary ?? ""} ${a.content}`);
    const remaining = await takeAiQuota(user.id, "ai.assist", 40);
    const out = await generateText(SYSTEM, `Bạn là biên tập viên kiểm duyệt bài đăng trên cổng thông tin của trường THPT. Hãy soát bài sau (loại: ${a.kind}). Phần "Tóm tắt" là đoạn dẫn riêng, việc nó nhắc lại ý của nội dung là bình thường, KHÔNG coi là lỗi trùng lặp; chỉ báo lỗi khi chắc chắn, không bịa lỗi và trả về DUY NHẤT một đối tượng JSON:\n{"verdict": "ok" (có thể đăng) | "fix" (cần sửa nhỏ) | "risk" (có nội dung nhạy cảm cần xem kỹ),\n "summary": "một câu nhận xét tổng quát",\n "spelling": [{"wrong": "cụm từ sai", "fix": "cách sửa"}] (tối đa 8 lỗi chính tả hoặc dùng từ rõ ràng, để mảng rỗng nếu không có),\n "tone": "một câu nhận xét giọng văn có phù hợp trang chính thức của trường không",\n "sensitive": ["mô tả ngắn từng điểm nhạy cảm: thông tin cá nhân, nội dung chính trị sai lệch, xúc phạm, quảng cáo, số liệu chưa kiểm chứng"] (để rỗng nếu không có)}\n\nBài:\n"""\n${text}\n"""`, { maxTokens: 1500, temperature: 0.2, json: true });
    await audit(user.id, "ai.assist", "Article", articleId, { mode: "review" });
    const j = parseJson<{ verdict?: string; summary?: string; spelling?: { wrong?: string; fix?: string }[]; tone?: string; sensitive?: string[] }>(out);
    if (!j) throw new UserError("AI trả về kết quả không đọc được, hãy thử lại");
    const verdict = j.verdict === "risk" ? "risk" : j.verdict === "fix" || placeholders > 0 ? "fix" : "ok";
    return { data: {
      verdict: placeholders > 0 && verdict === "ok" ? "fix" : verdict, summary: clip(j.summary, 300), placeholders, tone: clip(j.tone, 300),
      spelling: (j.spelling ?? []).slice(0, 8).map((s) => ({ wrong: clip(s.wrong, 80), fix: clip(s.fix, 80) })).filter((s) => s.wrong),
      sensitive: (j.sensitive ?? []).slice(0, 6).map((s) => clip(s, 200)).filter(Boolean), remaining,
    } };
  });
}

// ============================================================ BỘ CÂU HỎI TRÒ CHƠI
export type GenQuestion = { ui: "CHOICE" | "TF" | "FILL" | "ORDER"; text: string; options: string[]; correct: number; explanation: string };
const quizGenSchema = z.object({
  topic: z.string().trim().min(3, "Nhập chủ đề (ít nhất 3 ký tự)").max(200),
  count: z.number().int().min(3, "Từ 3 đến 15 câu").max(15, "Từ 3 đến 15 câu"),
  kinds: z.array(z.enum(["CHOICE", "TF", "FILL", "ORDER"])).min(1, "Chọn ít nhất một dạng câu hỏi"),
});

/** Admin: AI sinh bộ câu hỏi cho trò chơi từ chủ đề. Kết quả được kiểm tra chặt rồi điền vào biểu mẫu để người soạn sửa. */
export async function aiGenerateQuizAction(input: unknown) {
  return run<{ title: string; description: string; questions: GenQuestion[]; remaining: number }>(async () => {
    const user = await requireRole(["ADMIN"]);
    const d = quizGenSchema.parse(input);
    if (!aiConfigured()) throw new UserError("Chưa bật trợ lý AI: quản trị hệ thống cần cấu hình GEMINI_API_KEY");
    const remaining = await takeAiQuota(user.id, "ai.assist", 40);
    const names = { CHOICE: "CHOICE (trắc nghiệm 4 lựa chọn, 1 đáp án đúng)", TF: "TF (đúng/sai: một nhận định)", FILL: "FILL (điền từ: đáp án ngắn một đến vài từ)", ORDER: "ORDER (sắp xếp 3 đến 5 mục theo đúng thứ tự)" };
    const out = await generateText(SYSTEM, `Hãy soạn bộ ${d.count} câu hỏi đố vui cho học sinh THPT về chủ đề: "${d.topic}".\nDạng câu được dùng (trộn đều): ${d.kinds.map((k) => names[k]).join("; ")}.\nChỉ dùng kiến thức chính xác, phổ thông, có thể kiểm chứng; KHÔNG bịa. Mỗi câu có lời giải thích ngắn.\nTrả về DUY NHẤT JSON: {"title": "tên bộ trò chơi hấp dẫn", "description": "mô tả 1 câu", "questions": [{"type": "CHOICE|TF|FILL|ORDER", "text": "câu hỏi", "options": [...], "correct": số,"explanation": "lời giải thích"}]}\nQuy ước: CHOICE: options là 4 lựa chọn, correct là chỉ số (0-3) của đáp án đúng, hãy xáo vị trí đáp án đúng; TF: options luôn là ["Đúng","Sai"], correct là 0 nếu nhận định đúng, 1 nếu sai; FILL: options là danh sách đáp án chấp nhận được (1-3 cách viết), correct = 0; ORDER: options là các mục theo ĐÚNG thứ tự, correct = 0.`, { maxTokens: 3500, temperature: 0.7, json: true });
    await audit(user.id, "ai.assist", "Quiz", null, { mode: "quiz", count: d.count });
    const j = parseJson<{ title?: string; description?: string; questions?: { type?: string; text?: string; options?: unknown[]; correct?: number; explanation?: string }[] }>(out);
    const qs: GenQuestion[] = [];
    for (const q of j?.questions ?? []) {
      const ui = q.type as GenQuestion["ui"]; const text = clip(q.text, 300); const opts = (q.options ?? []).map((o) => clip(o, 120)).filter(Boolean);
      const expl = clip(q.explanation, 300); let correct = Number.isInteger(q.correct) ? (q.correct as number) : 0;
      if (!d.kinds.includes(ui) || text.length < 3) continue;
      if (ui === "CHOICE") { if (opts.length < 2 || opts.length > 5 || new Set(opts.map((o) => o.toLowerCase())).size !== opts.length || correct < 0 || correct >= opts.length) continue; }
      else if (ui === "TF") { if (correct !== 0 && correct !== 1) continue; qs.push({ ui, text, options: ["Đúng", "Sai"], correct, explanation: expl }); continue; }
      else if (ui === "FILL") { if (!opts.length) continue; correct = 0; }
      else if (ui === "ORDER") { if (opts.length < 3 || opts.length > 6) continue; correct = 0; }
      else continue;
      qs.push({ ui, text, options: ui === "FILL" ? opts.slice(0, 5) : opts, correct, explanation: expl });
    }
    if (qs.length < 3) throw new UserError("AI chưa soạn được đủ câu hợp lệ, hãy thử lại hoặc đổi chủ đề cho cụ thể hơn");
    return { data: { title: clip(j?.title, 120) || d.topic, description: clip(j?.description, 300), questions: qs.slice(0, d.count), remaining } };
  });
}
