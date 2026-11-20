"use client";
import { Printer } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  const t = useT();
  return <Button variant="secondary" size="sm" className="no-print" onClick={() => window.print()}><Printer className="size-4" />{t("dash.sch.print")}</Button>;
}
