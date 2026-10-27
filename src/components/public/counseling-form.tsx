"use client";

import { useState } from "react";
import { HeartHandshake, Lock, Send, ShieldCheck } from "lucide-react";
import { submitFeedbackAction } from "@/actions/feedback";

export function CounselingForm() {
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await submitFeedbackAction({
        category: "TƯ VẤN TÂM LÝ",
        content: content.trim(),
        contact: contact.trim() || undefined,
      });
      if (res.ok) {
        setSent(true);
        setContent("");
        setContact("");
      } else {
        setError(res.error || "Có lỗi xảy ra, vui lòng thử lại sau.");
      }
    } catch {
      setError("Không thể gửi vào lúc này. Vui lòng kiểm tra lại kết nối mạng.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/40 p-5 shadow-sm sm:p-7">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HeartHandshake className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Hòm thư chia sẻ & Tư vấn tâm lý học đường</h2>
          <p className="text-xs text-slate-500">
            Nơi bạn có thể trải lòng về áp lực học tập, chuyện bạn bè, gia đình hoặc bất kỳ tâm tư nào.
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800">
        <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
        <span>Cam kết bảo mật 100%: Thầy cô Tổ tư vấn tâm lý luôn tôn trọng và giữ bí mật tuyệt đối danh tính của bạn.</span>
      </div>

      {sent ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-5 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Lock className="size-6" />
          </div>
          <h3 className="font-semibold text-emerald-900">Tâm sự của bạn đã được gửi an toàn</h3>
          <p className="mt-1 text-sm text-emerald-800">
            Cảm ơn bạn đã tin tưởng chia sẻ. Thầy cô phụ trách tư vấn tâm lý sẽ đọc và đồng hành cùng bạn.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-4 rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            Gửi thêm chia sẻ khác
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="counseling-content" className="mb-1 block text-sm font-medium text-slate-700">
              Nội dung tâm sự hoặc vấn đề bạn muốn được tư vấn <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="counseling-content"
              required
              rows={5}
              minLength={10}
              maxLength={2000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Bạn đang cảm thấy thế nào? Hãy viết bất kỳ điều gì bạn muốn chia sẻ..."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="mt-1 flex justify-between text-[11px] text-slate-400">
              <span>Tối thiểu 10 ký tự</span>
              <span>{content.length}/2000 ký tự</span>
            </div>
          </div>

          <div>
            <label htmlFor="counseling-contact" className="mb-1 block text-sm font-medium text-slate-700">
              Cách liên hệ để thầy cô phản hồi riêng <span className="font-normal text-slate-400">(không bắt buộc)</span>
            </label>
            <input
              id="counseling-contact"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Số điện thoại, Zalo hoặc Email cá nhân (để trống nếu muốn ẩn danh)"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Nếu bạn muốn nhận câu trả lời hoặc hẹn gặp riêng, hãy để lại thông tin để thầy cô liên lạc nhé.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busy || content.trim().length < 10}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-50"
            >
              <Send className="size-4" />
              {busy ? "Đang gửi..." : "Gửi tâm sự an toàn"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

