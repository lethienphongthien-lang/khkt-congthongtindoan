"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/actions/locale";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/client";
import { cn } from "@/utils";

export function LanguageSwitcher({ className, variant = "dark" }: { className?: string; variant?: "dark" | "light" }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const pick = (l: Locale) => { if (l !== locale) start(async () => { await setLocale(l); router.refresh(); }); };
  return (
    <div className={cn("inline-flex overflow-hidden rounded border text-xs font-semibold", variant === "light" ? "border-border" : "border-white/30", pending && "opacity-60", className)} role="group" aria-label={t("lang.label")}>
      {LOCALES.map((l) => (
        <button key={l} type="button" onClick={() => pick(l)} aria-pressed={l === locale} title={LOCALE_LABELS[l]}
          className={cn("px-2 py-0.5 uppercase", l === locale ? (variant === "light" ? "bg-primary text-white" : "bg-white text-primary-dark") : (variant === "light" ? "text-slate-600 hover:bg-slate-100" : "text-white/90 hover:bg-white/10"))}>{l}</button>
      ))}
    </div>
  );
}
