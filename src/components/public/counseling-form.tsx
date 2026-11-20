"use client";

import { useState } from "react";
import { HeartHandshake, Lock, Send, ShieldCheck } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { submitFeedbackAction } from "@/actions/feedback";

export function CounselingForm() {
  const t = useT();
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
        setError(res.error || t("community.cf.errGeneric"));
      }
    } catch {
      setError(t("community.cf.errNet"));
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
          <h2 className="text-lg font-bold text-slate-800">{t("community.cf.title")}</h2>
          <p className="text-xs text-slate-500">
            {t("community.cf.sub")}
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800">
        <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
        <span>{t("community.cf.privacy")}</span>
      </div>

      {sent ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-5 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Lock className="size-6" />
          </div>
          <h3 className="font-semibold text-emerald-900">{t("community.cf.sentTitle")}</h3>
          <p className="mt-1 text-sm text-emerald-800">
            {t("community.cf.sentDesc")}
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-4 rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            {t("community.cf.sendMore")}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="counseling-content" className="mb-1 block text-sm font-medium text-slate-700">
              {t("community.cf.contentLabel")} <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="counseling-content"
              required
              rows={5}
              minLength={10}
              maxLength={2000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("community.cf.contentPh")}
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="mt-1 flex justify-between text-[11px] text-slate-400">
              <span>{t("community.cf.min")}</span>
              <span>{t("community.cf.count", { n: content.length })}</span>
            </div>
          </div>

          <div>
            <label htmlFor="counseling-contact" className="mb-1 block text-sm font-medium text-slate-700">
              {t("community.cf.contactLabel")} <span className="font-normal text-slate-400">({t("community.optional")})</span>
            </label>
            <input
              id="counseling-contact"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t("community.cf.contactPh")}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              {t("community.cf.contactHint")}
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
              {busy ? t("community.sending") : t("community.cf.submit")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

