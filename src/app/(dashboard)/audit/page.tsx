import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { AuditLog } from "@/components/settings/audit-log";

export const metadata = { title: "Nhật ký hệ thống" };

/** Nhật ký hệ thống: chỉ Admin và Ban chấp hành (tài khoản quản trị) xem được. */
export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole(["ADMIN"]);
  return (
    <>
      <PageHeader title="Nhật ký hệ thống" />
      <AuditLog searchParams={await searchParams} basePath="/audit" />
    </>
  );
}
