import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { MarqueeManager } from "@/components/cms/marquee-manager";

export const metadata = { title: "Dòng chữ chạy" };

export default async function CmsMarqueePage() {
  await requireRole(["ADMIN"]);
  const items = await db.marqueeItem.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, text: true, link: true, active: true } });
  return (<><PageHeader title="Dòng chữ chạy" description="Thông điệp chạy ngang ở đầu trang công khai" /><MarqueeManager items={items} /></>);
}
