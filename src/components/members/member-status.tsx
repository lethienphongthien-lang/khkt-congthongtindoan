"use client";
import { StatusBadge } from "@/components/ui/misc";
import { useT } from "@/lib/i18n/client";

export const MEMBER_STATUS_LABEL = { ACTIVE: "Đang sinh hoạt", TRANSFERRED: "Đã chuyển sinh hoạt", GRADUATED: "Đã ra trường" } as const;

export function MemberStatusBadge({ status, locked }: { status: keyof typeof MEMBER_STATUS_LABEL; locked?: boolean }) {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusBadge tone={status === "ACTIVE" ? "green" : "gray"}>{t(`members.st.${status}`)}</StatusBadge>
      {locked && <StatusBadge tone="red">{t("acc.locked")}</StatusBadge>}
    </span>
  );
}
