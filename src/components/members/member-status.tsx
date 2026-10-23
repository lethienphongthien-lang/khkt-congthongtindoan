import { StatusBadge } from "@/components/ui/misc";

export const MEMBER_STATUS_LABEL = { ACTIVE: "Đang sinh hoạt", TRANSFERRED: "Đã chuyển sinh hoạt", GRADUATED: "Đã ra trường" } as const;

export function MemberStatusBadge({ status, locked }: { status: keyof typeof MEMBER_STATUS_LABEL; locked?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusBadge tone={status === "ACTIVE" ? "green" : "gray"}>{MEMBER_STATUS_LABEL[status]}</StatusBadge>
      {locked && <StatusBadge tone="red">Đã khóa</StatusBadge>}
    </span>
  );
}
