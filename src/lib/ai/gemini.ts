import "server-only";
import { UserError } from "@/lib/action";

// Danh sách model theo thứ tự thử: bản "lite" mới nhất trước (nhanh, ít bị quá tải), lỗi/quá tải/hết giờ thì chuyển sang model kế tiếp.
// gemini-2.5-flash đã ngừng cấp cho khóa mới. Có thể ép model đầu bằng biến GEMINI_MODEL.
const MODELS = [...new Set([process.env.GEMINI_MODEL, "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-lite-latest"].filter(Boolean) as string[])];
const BASE = process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta"; // đổi được để thử bằng máy chủ giả

export const aiConfigured = () => !!process.env.GEMINI_API_KEY;

class Retry extends Error {}

async function callModel(model: string, key: string, system: string, prompt: string, opts: { maxTokens?: number; temperature?: number; json?: boolean }): Promise<string> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 22_000);
  try {
    const res = await fetch(`${BASE}/models/${model}:generateContent`, {
      method: "POST", signal: ctl.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: opts.temperature ?? 0.7, maxOutputTokens: opts.maxTokens ?? 2048, ...(opts.json ? { responseMimeType: "application/json" } : {}) },
      }),
    });
    if (res.status === 400 || res.status === 401 || res.status === 403) throw new UserError("Khóa AI không hợp lệ hoặc chưa được cấp quyền. Hãy báo quản trị hệ thống kiểm tra GEMINI_API_KEY");
    if (!res.ok) {
      console.error(`[gemini] ${res.status} ${model}:`, (await res.text().catch(() => "")).slice(0, 500)); // không ghi khóa
      throw new Retry(String(res.status)); // 404, 429, 5xx: thử model khác
    }
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[]; promptFeedback?: { blockReason?: string } };
    if (json.promptFeedback?.blockReason) throw new UserError("Nội dung bị từ chối bởi bộ lọc an toàn của AI, hãy diễn đạt lại");
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    if (!text) throw new Retry("empty");
    return text;
  } catch (e) {
    if (e instanceof UserError || e instanceof Retry) throw e;
    console.error(`[gemini] ${model}:`, (e as Error).name === "AbortError" ? "hết giờ chờ" : (e as Error).message);
    throw new Retry("network");
  } finally { clearTimeout(timer); }
}

/** Gọi Gemini từ máy chủ (khóa API không bao giờ xuống trình duyệt). Tự thử model dự phòng khi quá tải hoặc hết giờ. */
export async function generateText(system: string, prompt: string, opts: { maxTokens?: number; temperature?: number; json?: boolean } = {}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new UserError("Chưa bật trợ lý AI: quản trị hệ thống cần cấu hình GEMINI_API_KEY");
  for (const m of MODELS) {
    try { return await callModel(m, key, system, prompt, opts); }
    catch (e) { if (!(e instanceof Retry)) throw e; }
  }
  throw new UserError("Trợ lý AI đang quá tải hoặc chưa phản hồi được, hãy thử lại sau ít phút. (Chi tiết lỗi ở nhật ký máy chủ, dòng [gemini])");
}
