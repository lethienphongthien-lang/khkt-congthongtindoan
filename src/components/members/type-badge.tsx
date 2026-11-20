"use client";
import { StatusBadge } from "@/components/ui/misc";
import { useT } from "@/lib/i18n/client";

/** Đoàn viên (đã vào Đoàn) hoặc thanh niên (học sinh chưa vào Đoàn). */
export function TypeBadge({ doanVien }: { doanVien: boolean }) {
  const t = useT();
  return <StatusBadge tone={doanVien ? "green" : "amber"}>{doanVien ? t("members.doanVien") : t("members.youth")}</StatusBadge>;
}
