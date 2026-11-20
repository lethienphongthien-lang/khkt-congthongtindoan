"use client";
import { useT } from "@/lib/i18n/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { saveSiteSettingsAction } from "@/actions/cms";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";

const FIELDS = [
  { key: "address", label: "cms.ss.address" },
  { key: "phone", label: "cms.ss.phone" },
  { key: "email", label: "cms.ss.email" },
  { key: "facebook", label: "cms.ss.facebook" },
  { key: "youtube", label: "cms.ss.youtube" },
] as const;

export function SiteSettingsForm({ initial }: { initial: Record<string, string> }) {
  const router = useRouter();
  const t = useT();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<UploadedImage>(initial.bannerUrl && initial.bannerPublicId ? { imageUrl: initial.bannerUrl, publicId: initial.bannerPublicId } : null);
  return (
    <div className="w-full space-y-4">
      <Field label={t("cms.ss.banner")} hint={t("cms.ss.bannerHint")}><ImageUpload folder="activities" value={banner} onChange={setBanner} /></Field>
      {FIELDS.map((f) => (
        <Field key={f.key} label={t(f.label)}>
          <Input value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
        </Field>
      ))}
      <div className="rounded-lg border border-border bg-white/85 p-4">
        <h3 className="mb-1 font-semibold">{t("cms.ss.countdown")}</h3>
        <p className="mb-3 text-xs text-muted">{t("cms.ss.countdownNote")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("cms.ss.evName")}><Input value={v.countdownTitle ?? ""} maxLength={120} placeholder={t("cms.ss.evEx")} onChange={(e) => setV({ ...v, countdownTitle: e.target.value })} /></Field>
          <Field label={t("cms.ss.evTime")}><Input type="datetime-local" value={v.countdownAt ?? ""} onChange={(e) => setV({ ...v, countdownAt: e.target.value })} /></Field>
          <Field label={t("cms.ss.evLink")} hint={t("cms.ss.evLinkHint")} className="sm:col-span-2"><Input value={v.countdownLink ?? ""} onChange={(e) => setV({ ...v, countdownLink: e.target.value })} /></Field>
        </div>
      </div>
      <Button loading={busy} onClick={async () => {
        setBusy(true); const res = await saveSiteSettingsAction({ ...v, bannerUrl: banner?.imageUrl ?? "", bannerPublicId: banner?.publicId ?? "" }); setBusy(false);
        if (!res.ok) return void toast.error(res.error);
        toast.success(res.message); router.refresh();
      }}>{t("cms.ss.save")}</Button>
    </div>
  );
}
