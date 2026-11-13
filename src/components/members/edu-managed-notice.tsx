import { Alert } from "@/components/ui/misc";
import { eduLockedLabels, type EduPolicy } from "@/lib/edu-policy-types";

/** Báo cho admin Đoàn biết nhóm dữ liệu nào đang do EduConnect quản lý (chỉ xem). */
export function EduManagedNotice({ policy }: { policy: EduPolicy }) {
  const labels = eduLockedLabels(policy);
  if (!labels.length) return null;
  return <div className="mb-4"><Alert tone="amber">Do EduConnect quản lý (Cổng Đoàn chỉ xem): {labels.join(", ")}. Nhờ quản trị viên EduConnect thực hiện, hoặc cấp quyền ở Cấu hình → Cổng Đoàn.</Alert></div>;
}
