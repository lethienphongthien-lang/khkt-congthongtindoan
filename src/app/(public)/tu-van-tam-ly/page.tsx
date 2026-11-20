import type { Metadata } from "next";
import { PageTitle } from "@/components/public/blocks";
import { CounselingForm } from "@/components/public/counseling-form";
import { getSiteSettings } from "@/lib/services/site-settings";
import { getT } from "@/lib/i18n/server";
import { Heart, Lightbulb, Phone, Shield, Sparkles, UserCheck } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("community.psy.title"), description: t("community.psy.metaDesc") };
}

export default async function TuVanTamLyPage() {
  const t = await getT();
  const settings = await getSiteSettings();

  return (
    <div className="space-y-6">
      <PageTitle
        title={t("community.psy.title")}
        description={t("community.psy.desc")}
      />

      {/* Thông điệp mở đầu */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-white/80 p-4 shadow-xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <Heart className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{t("community.psy.c1t")}</h3>
            <p className="mt-1 text-xs text-slate-600">
              {t("community.psy.c1d")}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-border bg-white/80 p-4 shadow-xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Shield className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{t("community.psy.c2t")}</h3>
            <p className="mt-1 text-xs text-slate-600">
              {t("community.psy.c2d")}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-border bg-white/80 p-4 shadow-xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
            <UserCheck className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{t("community.psy.c3t")}</h3>
            <p className="mt-1 text-xs text-slate-600">
              {t("community.psy.c3d")}
            </p>
          </div>
        </div>
      </div>

      {/* Form gửi tâm sự bảo mật */}
      <CounselingForm />

      {/* Kênh liên hệ trực tiếp & Cẩm nang */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white/85 p-5 shadow-xs">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Phone className="size-4" />
            <span>{t("community.psy.directTitle")}</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            {t("community.psy.directDesc")}
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              <span><strong>{t("community.psy.place")}:</strong> {t("community.psy.placeValue")}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              <span><strong>{t("community.psy.hotline")}:</strong> {settings.phone || t("community.psy.hotlineFallback")}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              <span><strong>{t("community.psy.email")}:</strong> {settings.email || "doantruong.thptsonha@gmail.com"}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-white/85 p-5 shadow-xs">
          <div className="flex items-center gap-2 text-amber-600 font-semibold">
            <Lightbulb className="size-4" />
            <span>{t("community.psy.tipsTitle")}</span>
          </div>
          <ul className="mt-3 space-y-2.5 text-xs text-slate-600 leading-relaxed">
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
              <span><strong>{t("community.psy.tip1t")}:</strong> {t("community.psy.tip1d")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
              <span><strong>{t("community.psy.tip2t")}:</strong> {t("community.psy.tip2d")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
              <span><strong>{t("community.psy.tip3t")}:</strong> {t("community.psy.tip3d")}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

