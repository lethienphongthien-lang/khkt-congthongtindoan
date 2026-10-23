import { StatusBadge } from "@/components/ui/misc";

/** Đoàn viên (đã vào Đoàn) hoặc thanh niên (học sinh chưa vào Đoàn). */
export function TypeBadge({ doanVien }: { doanVien: boolean }) {
  return <StatusBadge tone={doanVien ? "green" : "amber"}>{doanVien ? "Đoàn viên" : "Thanh niên"}</StatusBadge>;
}
