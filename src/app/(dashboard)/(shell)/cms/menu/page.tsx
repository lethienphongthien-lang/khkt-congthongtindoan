import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { MenuEditor } from "@/components/cms/menu-editor";
import { getMenuConfig } from "@/lib/services/site-settings";

export const metadata = { title: "Menu website" };

export default async function CmsMenuPage() {
  await requireRole(["ADMIN"]);
  const menu = await getMenuConfig();
  return (<><PageHeader title="Menu website" description="Đổi tên, ẩn/hiện, sắp xếp và thêm mục cho thanh menu trên và thanh bên trái của trang công khai" /><MenuEditor initial={menu} /></>);
}
