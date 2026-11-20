"use client";
import { Input,Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
export function AccountFilter({q,status}:{q:string;status:string}) {
  const t = useT();
  return <form className="flex flex-wrap gap-2"><input type="hidden" name="tab" value="accounts" /><Input name="q" defaultValue={q} placeholder={t("ui.af.search")} aria-label={t("ui.af.searchLabel")} className="min-w-48 flex-1" /><Select name="status" defaultValue={status} aria-label={t("ui.af.status")} className="w-auto"><option value="">{t("ui.af.all")}</option><option value="ACTIVE">{t("ui.af.active")}</option><option value="LOCKED">{t("ui.af.locked")}</option></Select><Button type="submit" variant="secondary">{t("ui.af.find")}</Button></form>;
}
