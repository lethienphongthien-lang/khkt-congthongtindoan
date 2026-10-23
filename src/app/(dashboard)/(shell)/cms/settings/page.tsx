import { requireRole } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/services/site-settings";
import { PageHeader } from "@/components/ui/misc";
import { SiteSettingsForm } from "@/components/cms/site-settings-form";

export const metadata = { title: "Thông tin website" };

export default async function CmsSettingsPage() {
  await requireRole(["ADMIN"]);
  return (
    <>
      <PageHeader title="Thông tin website" description="Địa chỉ và thông tin liên hệ hiển thị ở đầu trang và chân trang" />
      <SiteSettingsForm initial={await getSiteSettings()} />
    </>
  );
}
