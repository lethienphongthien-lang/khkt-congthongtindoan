import Link from "next/link";
import { Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { SITE_PAGES } from "@/lib/services/public";
import { formatDate } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { DataTable, PageHeader, Td, Th } from "@/components/ui/misc";

export const metadata = { title: "Trang giới thiệu" };

export default async function CmsPagesPage() {
  await requireRole(["ADMIN"]);
  const pages = await db.sitePage.findMany();
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  return (
    <>
      <PageHeader title="Trang giới thiệu" description="Nội dung các trang trong mục Giới thiệu. Trang nào cũng có thể chia thành nhiều tab (mở Sửa, bấm “Chia thành nhiều tab”)." />
      <DataTable>
        <thead><tr><Th>Trang</Th><Th>Cấu trúc</Th><Th>Cập nhật</Th><Th /></tr></thead>
        <tbody>{Object.entries(SITE_PAGES).map(([slug, title]) => (
          <tr key={slug}>
            <Td className="font-medium">{title}</Td>
            <Td className="text-muted">{(() => { const t = bySlug.get(slug)?.tabs; return Array.isArray(t) && t.length ? `${t.length} tab` : "Một nội dung"; })()}</Td>
            <Td>{bySlug.get(slug) ? formatDate(bySlug.get(slug)!.updatedAt) : "Chưa có nội dung"}</Td>
            <Td className="text-right"><Link href={`/cms/pages/${slug}`} className={buttonClass("secondary", "sm")}><Pencil className="size-3.5" />Sửa</Link></Td>
          </tr>
        ))}</tbody>
      </DataTable>
    </>
  );
}
