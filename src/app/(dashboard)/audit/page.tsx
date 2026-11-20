import { getT } from "@/lib/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { AuditLog } from "@/components/settings/audit-log";

export async function generateMetadata() { const t = await getT(); return { title: t("audit.title") }; }

/** Nhật ký hệ thống: chỉ Admin và Ban chấp hành (tài khoản quản trị) xem được. */
export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole(["ADMIN"]);
  const t = await getT();
  return (
    <>
      <PageHeader title={t("audit.title")} />
      <AuditLog searchParams={await searchParams} basePath="/audit" />
    </>
  );
}
