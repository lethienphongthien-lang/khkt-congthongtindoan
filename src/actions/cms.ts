"use server";

import { revalidatePath } from "next/cache";
import { invalidatePublic } from "@/lib/public-cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { articleSchema, sitePageSchema } from "@/lib/validation";
import { PHONE_MSG, PHONE_RE } from "@/lib/validation/rules";
import { menuConfigSchema } from "@/lib/menu-config";
import { SITE_PAGES } from "@/lib/services/public";
import { uniqueSlug } from "@/lib/slug";
import { deleteImage, isOwnPublicId } from "@/lib/cloudinary";
import { notifyUsers } from "@/lib/notify";
import { ADMIN_ONLY_KINDS, kindSlug } from "@/lib/services/kind";
import { cleanContent, cleanHtml } from "@/lib/sanitize";
import { pingSearchEngines } from "@/lib/seo";
import { KIND_PATH } from "@/lib/services/public";

const refreshPublic = () => invalidatePublic();

export async function saveArticleAction(id: string | null, input: unknown) {
  return run<{ id: string }>(async () => {
    const admin = await requireRole(["ADMIN", "SECRETARY"]);
    const isSec = admin.role === "SECRETARY"; // Bí thư chỉ lưu bản nháp của chính mình, Admin duyệt rồi mới đăng
    const d = articleSchema.parse(input);
    d.content = cleanContent(d.content);
    if (isSec) d.published = false;
    if (d.coverPublicId && !isOwnPublicId(d.coverPublicId, "activities")) throw new UserError("Ảnh không hợp lệ");
    if (isSec && ADMIN_ONLY_KINDS.includes(d.kind)) throw new UserError("Chuyên mục này do Ban chấp hành Đoàn trường đăng");
    // Câu chuyện đẹp gắn với Chi đoàn: bí thư luôn là Chi đoàn của mình, Admin chọn
    const departmentId = d.kind !== "STORY" ? null : isSec ? admin.departmentId ?? null : d.departmentId ?? null;
    if (departmentId && !(await db.department.findUnique({ where: { id: departmentId }, select: { id: true } }))) throw new UserError("Chi đoàn không tồn tại");
    // Danh mục (Kế hoạch): phải đúng loại bài
    let categoryId: string | null = null;
    if (d.categoryId) {
      const cat = await db.articleCategory.findUnique({ where: { id: d.categoryId }, select: { id: true, kind: true } });
      if (!cat || cat.kind !== d.kind) throw new UserError("Danh mục không hợp lệ");
      categoryId = cat.id;
    }
    if (d.kind === "EVENT" && !d.eventAt) throw new UserError("Sự kiện cần có thời gian diễn ra");
    for (const f of d.attachments) {
      if (!isOwnPublicId(f.publicId, "documents") || !f.url.startsWith("https://res.cloudinary.com/")) throw new UserError("Tệp đính kèm không hợp lệ");
    }

    const base = {
      kind: d.kind, title: d.title, summary: d.summary ?? null, content: d.content, coverUrl: d.coverUrl ?? null, coverPublicId: d.coverPublicId ?? null,
      eventAt: d.kind === "EVENT" ? d.eventAt ?? null : null, eventLocation: d.kind === "EVENT" ? d.eventLocation ?? null : null, published: d.published,
      departmentId, categoryId,
    };
    if (id) {
      const cur = await db.article.findUnique({ where: { id } });
      if (!cur) throw new UserError("Không tìm thấy bài viết");
      if (isSec && (cur.authorId !== admin.id || cur.published || cur.kind !== d.kind)) throw new UserError("Bạn chỉ sửa được bản nháp của mình");
      // Ngày đăng do người soạn chọn; để trống thì giữ ngày cũ (hoặc bây giờ nếu bài vừa chuyển sang hiển thị)
      const publishedAt = d.publishedAt ?? (d.published ? cur.publishedAt ?? new Date() : cur.publishedAt);
      const existing = await db.articleAttachment.findMany({ where: { articleId: id } });
      const keep = new Set(d.attachments.map((f) => f.publicId));
      const removed = existing.filter((f) => !keep.has(f.publicId));
      const known = new Set(existing.map((f) => f.publicId));
      await db.$transaction([
        db.article.update({ where: { id }, data: { ...base, publishedAt } }),
        db.articleAttachment.deleteMany({ where: { id: { in: removed.map((f) => f.id) } } }),
        db.articleAttachment.createMany({ data: d.attachments.filter((f) => !known.has(f.publicId)).map((f) => ({ ...f, articleId: id })) }),
      ]);
      for (const f of removed) await deleteImage(f.publicId);
      if (cur.coverPublicId && cur.coverPublicId !== base.coverPublicId) await deleteImage(cur.coverPublicId);
      await audit(admin.id, "article.update", "Article", id, { title: d.title });
      refreshPublic();
      if ((d.published || cur.published) && (!publishedAt || publishedAt <= new Date())) pingSearchEngines(["/", KIND_PATH[d.kind], `/bai-viet/${cur.slug}`]);
      return { data: { id }, message: isSec ? "Đã lưu bản nháp" : "Đã cập nhật bài viết" };
    }
    const a = await db.article.create({ data: { ...base, slug: uniqueSlug(d.title), publishedAt: d.publishedAt ?? (d.published ? new Date() : null), authorId: admin.id, attachments: { create: d.attachments } } });
    const live = !a.publishedAt || a.publishedAt <= new Date(); // bài hẹn giờ chưa tới lúc thì chưa gửi thông báo, chưa báo công cụ tìm kiếm
    if (d.published && live && d.kind === "ANNOUNCEMENT") {
      const users = await db.user.findMany({ where: { status: "ACTIVE", id: { not: admin.id } }, select: { id: true } });
      await notifyUsers(users.map((u) => u.id), { type: "SYSTEM", title: "Thông báo mới từ Đoàn trường", body: d.title, link: `/bai-viet/${a.slug}` });
    }
    await audit(admin.id, "article.create", "Article", a.id, { title: d.title, kind: d.kind });
    if (isSec) {
      const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
      await notifyUsers(admins.map((u) => u.id), { type: "SYSTEM", title: "Bài viết chờ duyệt", body: `${admin.fullName}: ${d.title}`, link: `/cms/${kindSlug(d.kind)}/${a.id}` });
    }
    refreshPublic();
    if (d.published && live) pingSearchEngines(["/", KIND_PATH[d.kind], `/bai-viet/${a.slug}`]);
    return { data: { id: a.id }, message: isSec ? "Đã lưu bản nháp, chờ Admin duyệt" : "Đã đăng bài viết" };
  });
}

export async function setArticlePublishedAction(id: string, published: boolean) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const cur = await db.article.findUnique({ where: { id } });
    if (!cur) throw new UserError("Không tìm thấy bài viết");
    await db.article.update({ where: { id }, data: { published, publishedAt: published ? cur.publishedAt ?? new Date() : cur.publishedAt } });
    await audit(admin.id, published ? "article.publish" : "article.unpublish", "Article", id);
    refreshPublic();
    pingSearchEngines(["/", KIND_PATH[cur.kind], `/bai-viet/${cur.slug}`]);
    revalidatePath("/cms", "layout");
    return { message: published ? "Đã hiển thị bài viết" : "Đã ẩn bài viết" };
  });
}

export async function deleteArticleAction(id: string) {
  return run(async () => {
    const admin = await requireRole(["ADMIN", "SECRETARY"]);
    const cur = await db.article.findUnique({ where: { id }, include: { attachments: true } });
    if (!cur) throw new UserError("Không tìm thấy bài viết");
    if (admin.role === "SECRETARY" && (cur.authorId !== admin.id || cur.published)) throw new UserError("Bạn chỉ xóa được bản nháp của mình");
    await db.article.delete({ where: { id } });
    await deleteImage(cur.coverPublicId);
    for (const f of cur.attachments) await deleteImage(f.publicId);
    await audit(admin.id, "article.delete", "Article", id, { title: cur.title });
    refreshPublic();
    if (cur.published) pingSearchEngines(["/", KIND_PATH[cur.kind], `/bai-viet/${cur.slug}`]);
    revalidatePath("/cms", "layout");
    return { message: "Đã xóa bài viết" };
  });
}

export async function saveSitePageAction(slug: string, input: unknown) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    if (!SITE_PAGES[slug]) throw new UserError("Trang không tồn tại");
    const { content: raw, tabs: rawTabs, attachments: rawFiles } = sitePageSchema.parse(input);
    const tabs = rawTabs?.length ? rawTabs.map((t) => ({ title: t.title, content: cleanHtml(t.content), attachments: t.attachments })) : null;
    const content = tabs ? "" : cleanHtml(raw); // có tab thì nội dung nằm trong từng tab
    const pageFiles = tabs ? [] : rawFiles; // có tab thì tệp nằm trong từng tab
    const allFiles = [...pageFiles, ...(tabs?.flatMap((t) => t.attachments) ?? [])];
    for (const f of allFiles) {
      if (!isOwnPublicId(f.publicId, "documents") || !f.url.startsWith("https://res.cloudinary.com/")) throw new UserError("Tệp đính kèm không hợp lệ");
    }
    // Tệp có trước mà không còn trong bản lưu mới thì xóa khỏi Cloudinary
    const before = await db.sitePage.findUnique({ where: { slug }, select: { tabs: true, attachments: true } });
    const idsOf = (v: unknown): string[] => (Array.isArray(v) ? v.flatMap((x) => (x && typeof x === "object" && "publicId" in x && typeof x.publicId === "string" ? [x.publicId] : [])) : []);
    const oldIds = [...idsOf(before?.attachments), ...(Array.isArray(before?.tabs) ? (before.tabs as unknown[]).flatMap((t) => idsOf(t && typeof t === "object" ? (t as { attachments?: unknown }).attachments : null)) : [])];
    const keepIds = new Set(allFiles.map((f) => f.publicId));
    const tabsValue = tabs ?? Prisma.DbNull;
    const filesValue = pageFiles.length ? pageFiles : Prisma.DbNull;
    await db.sitePage.upsert({ where: { slug }, update: { content, tabs: tabsValue, attachments: filesValue, updatedById: admin.id }, create: { slug, title: SITE_PAGES[slug], content, tabs: tabsValue, attachments: filesValue, updatedById: admin.id } });
    for (const id of new Set(oldIds)) if (!keepIds.has(id)) await deleteImage(id);
    await audit(admin.id, "sitepage.update", "SitePage", slug);
    refreshPublic();
    pingSearchEngines([`/gioi-thieu/${slug}`]);
    return { message: "Đã lưu trang" };
  });
}

export async function saveSiteSettingsAction(input: Record<string, string>) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const { SETTING_FIELDS, getSiteSettings } = await import("@/lib/services/site-settings");
    const before = await getSiteSettings();
    const newBanner = String(input.bannerPublicId ?? "");
    if (newBanner && (!isOwnPublicId(newBanner, "activities") || !String(input.bannerUrl ?? "").startsWith("https://res.cloudinary.com/"))) throw new UserError("Ảnh banner không hợp lệ");
    for (const f of SETTING_FIELDS) {
      const value = String(input[f.key] ?? "").trim().slice(0, 1000);
      if ((f.key === "facebook" || f.key === "youtube") && value && !/^https:\/\/[^\s]+\.[^\s]+$/.test(value)) throw new UserError(`${f.label} phải là đường dẫn đầy đủ bắt đầu bằng https://`);
      if (f.key === "phone" && value && !PHONE_RE.test(value)) throw new UserError(`${f.label}: ${PHONE_MSG}`);
      if (f.key === "email" && value && !z.string().email().safeParse(value).success) throw new UserError(`${f.label} không hợp lệ (ví dụ ten@gmail.com)`);
      if (f.key === "countdownLink" && value && !(value.startsWith("/") || /^https?:\/\//.test(value))) throw new UserError("Liên kết phải bắt đầu bằng / hoặc https://");
      if (f.key === "countdownAt" && value && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new UserError("Thời điểm đếm ngược không hợp lệ");
      if (f.key === "countdownAt" && value && new Date(`${value}:00+07:00`).getTime() <= Date.now()) throw new UserError("Thời điểm đếm ngược phải ở tương lai");
      if (f.key === "countdownAt" && value && !String(input.countdownTitle ?? "").trim()) throw new UserError("Nhập tên sự kiện đếm ngược");
      await db.siteSetting.upsert({ where: { key: f.key }, update: { value }, create: { key: f.key, value } });
    }
    if (before.bannerPublicId && before.bannerPublicId !== newBanner) await deleteImage(before.bannerPublicId);
    await audit(admin.id, "site.settings", "SiteSetting", null);
    refreshPublic();
    return { message: "Đã lưu thông tin website" };
  });
}

// ---------- Dòng chữ chạy ----------

const marqueeSchema = z.object({
  text: z.string().trim().min(2, "Nhập nội dung (tối thiểu 2 ký tự)").max(300, "Tối đa 300 ký tự"),
  link: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(300).refine((v) => v.startsWith("/") || /^https?:\/\//.test(v), "Liên kết phải bắt đầu bằng / hoặc https://").optional()),
});

export async function addMarqueeAction(input: unknown) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const d = marqueeSchema.parse(input);
    const last = await db.marqueeItem.aggregate({ _max: { sortOrder: true } });
    await db.marqueeItem.create({ data: { text: d.text, link: d.link ?? null, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
    await audit(admin.id, "marquee.create", "MarqueeItem", null, { text: d.text });
    refreshPublic(); revalidatePath("/cms/marquee");
    return { message: "Đã thêm dòng chữ chạy" };
  });
}

export async function toggleMarqueeAction(id: string, active: boolean) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    await db.marqueeItem.update({ where: { id }, data: { active } });
    await audit(admin.id, active ? "marquee.enable" : "marquee.disable", "MarqueeItem", id);
    refreshPublic(); revalidatePath("/cms/marquee");
    return { message: active ? "Đã bật" : "Đã tắt" };
  });
}

export async function deleteMarqueeAction(id: string) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    await db.marqueeItem.delete({ where: { id } });
    await audit(admin.id, "marquee.delete", "MarqueeItem", id);
    refreshPublic(); revalidatePath("/cms/marquee");
    return { message: "Đã xóa" };
  });
}

/** Đổi vị trí với dòng liền kề (hoán đổi sortOrder). */
export async function moveMarqueeAction(id: string, dir: "up" | "down") {
  return run(async () => {
    await requireRole(["ADMIN"]);
    const items = await db.marqueeItem.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    const i = items.findIndex((x) => x.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= items.length) return;
    const reordered = [...items];
    [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
    await db.$transaction(reordered.map((x, idx) => db.marqueeItem.update({ where: { id: x.id }, data: { sortOrder: idx } })));
    refreshPublic(); revalidatePath("/cms/marquee");
  });
}

// ---------- Menu công khai ----------

/** Lưu cấu hình menu (thanh trên + thanh bên trái). Truyền null để khôi phục mặc định. */
export async function saveMenuConfigAction(input: unknown) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    if (input === null) {
      await db.siteSetting.deleteMany({ where: { key: "menuConfig" } });
    } else {
      const parsed = menuConfigSchema.safeParse(input);
      if (!parsed.success) throw new UserError(parsed.error.issues[0]?.message ?? "Cấu hình menu không hợp lệ");
      const value = JSON.stringify(parsed.data);
      await db.siteSetting.upsert({ where: { key: "menuConfig" }, update: { value }, create: { key: "menuConfig", value } });
    }
    await audit(admin.id, "site.menu", "SiteSetting", "menuConfig");
    refreshPublic();
    return { message: input === null ? "Đã khôi phục menu mặc định" : "Đã lưu menu website" };
  });
}
