import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { ADMIN_ONLY_KINDS } from "@/lib/services/kind";
import { CMS_SLUG, KIND_ACTION, KIND_LABEL } from "@/lib/services/public";
import { PageHeader } from "@/components/ui/misc";
import { ArticleForm } from "@/components/cms/forms";

export const maxDuration = 60; // trợ lý AI có thể cần vài chục giây

export default async function NewArticlePage({ params }: { params: Promise<{ kind: string }> }) {
  const user = await requireRole(["ADMIN", "SECRETARY"]);
  const { kind: slug } = await params;
  const kind = CMS_SLUG[slug];
  if (!kind || (user.role !== "ADMIN" && ADMIN_ONLY_KINDS.includes(kind))) notFound();
  const categories = kind === "PLAN" ? await db.articleCategory.findMany({ where: { kind: "PLAN" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, name: true } }) : undefined;
  const departments = kind === "STORY" && user.role === "ADMIN" ? await db.department.findMany({ where: { graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : undefined;
  return (<><PageHeader title={KIND_ACTION[kind]} description={user.role === "ADMIN" ? `${KIND_LABEL[kind]} hiển thị trên trang công khai của Đoàn trường.` : "Lưu dưới dạng bản nháp để Admin duyệt."} /><ArticleForm kind={kind} draftOnly={user.role !== "ADMIN"} departments={departments} categories={categories} /></>);
}
