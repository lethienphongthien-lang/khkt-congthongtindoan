"use server";

import { revalidatePath } from "next/cache";
import { invalidatePublic } from "@/lib/public-cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";

/** Danh mục hiện chỉ dùng cho Kế hoạch (mô hình hỗ trợ thêm loại bài khác về sau). */
const KINDS = ["PLAN"] as const;
const nameSchema = z.string().trim().min(2, "Tên danh mục tối thiểu 2 ký tự").max(60, "Tên danh mục tối đa 60 ký tự");
const refresh = () => { revalidatePath("/ke-hoach"); revalidatePath("/cms", "layout"); invalidatePublic(); };

export async function createCategoryAction(kind: string, name: string) {
  return run<{ id: string }>(async () => {
    const admin = await requireRole(["ADMIN"]);
    const k = z.enum(KINDS).parse(kind);
    const n = nameSchema.parse(name);
    if (await db.articleCategory.findUnique({ where: { kind_name: { kind: k, name: n } } })) throw new UserError("Danh mục này đã có");
    const last = await db.articleCategory.findFirst({ where: { kind: k }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const c = await db.articleCategory.create({ data: { kind: k, name: n, sortOrder: (last?.sortOrder ?? 0) + 1 } });
    await audit(admin.id, "category.create", "ArticleCategory", c.id, { name: n });
    refresh();
    return { data: { id: c.id }, message: "Đã thêm danh mục" };
  });
}

export async function renameCategoryAction(id: string, name: string) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const n = nameSchema.parse(name);
    const cur = await db.articleCategory.findUnique({ where: { id } });
    if (!cur) throw new UserError("Không tìm thấy danh mục");
    const dup = await db.articleCategory.findFirst({ where: { kind: cur.kind, name: n, NOT: { id } } });
    if (dup) throw new UserError("Đã có danh mục trùng tên");
    await db.articleCategory.update({ where: { id }, data: { name: n } });
    await audit(admin.id, "category.rename", "ArticleCategory", id, { name: n });
    refresh();
    return { message: "Đã đổi tên danh mục" };
  });
}

/** Chuyển danh mục lên (-1) hoặc xuống (+1) trong danh sách. */
export async function moveCategoryAction(id: string, dir: -1 | 1) {
  return run(async () => {
    await requireRole(["ADMIN"]);
    const cur = await db.articleCategory.findUnique({ where: { id } });
    if (!cur) throw new UserError("Không tìm thấy danh mục");
    const list = await db.articleCategory.findMany({ where: { kind: cur.kind }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    const i = list.findIndex((c) => c.id === id), j = i + dir;
    if (j < 0 || j >= list.length) return;
    const a = [...list]; [a[i], a[j]] = [a[j], a[i]];
    await db.$transaction(a.map((c, idx) => db.articleCategory.update({ where: { id: c.id }, data: { sortOrder: idx + 1 } })));
    refresh();
  });
}

export async function deleteCategoryAction(id: string) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const cur = await db.articleCategory.findUnique({ where: { id }, include: { _count: { select: { articles: true } } } });
    if (!cur) throw new UserError("Không tìm thấy danh mục");
    await db.articleCategory.delete({ where: { id } }); // các bài trong danh mục chuyển về "chưa phân loại"
    await audit(admin.id, "category.delete", "ArticleCategory", id, { name: cur.name, articles: cur._count.articles });
    refresh();
    return { message: cur._count.articles ? `Đã xóa danh mục; ${cur._count.articles} bài chuyển về "Chưa phân loại"` : "Đã xóa danh mục" };
  });
}
