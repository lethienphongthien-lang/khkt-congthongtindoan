"use server";

import { revalidatePath } from "next/cache";
import { invalidatePublic } from "@/lib/public-cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { getT } from "@/lib/i18n/server";
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
    const t = await getT();
    const admin = await requireRole(["ADMIN", "SECRETARY"]);
    const isSec = admin.role === "SECRETARY"; // Bí thư chỉ lưu bản nháp của chính mình, Admin duyệt rồi mới đăng
    const d = articleSchema.parse(input);
    d.content = cleanContent(d.content);
    if (isSec) d.published = false;
    if (d.coverPublicId && !isOwnPublicId(d.coverPublicId, "activities")) throw new UserError(t("cms.sa.1"));
    if (isSec && ADMIN_ONLY_KINDS.includes(d.kind)) throw new UserError(t("cms.sa.2"));
    // Câu chuyện đẹp gắn với Chi đoàn: bí thư luôn là Chi đoàn của mình, Admin chọn
    const departmentId = d.kind !== "STORY" ? null : isSec ? admin.departmentId ?? null : d.departmentId ?? null;
    if (departmentId && !(await db.department.findUnique({ where: { id: departmentId }, select: { id: true } }))) throw new UserError(t("cms.sa.3"));
    // Danh mục (Kế hoạch): phải đúng loại bài
    let categoryId: string | null = null;
    if (d.categoryId) {
      const cat = await db.articleCategory.findUnique({ where: { id: d.categoryId }, select: { id: true, kind: true } });
      if (!cat || cat.kind !== d.kind) throw new UserError(t("cms.sa.4"));
      categoryId = cat.id;
    }
    if (d.kind === "EVENT" && !d.eventAt) throw new UserError(t("cms.sa.5"));
    for (const f of d.attachments) {
      if (!isOwnPublicId(f.publicId, "documents") || !f.url.startsWith("https://res.cloudinary.com/")) throw new UserError(t("cms.sa.6"));
    }

    const base = {
      kind: d.kind, title: d.title, summary: d.summary ?? null, content: d.content, coverUrl: d.coverUrl ?? null, coverPublicId: d.coverPublicId ?? null,
      eventAt: d.kind === "EVENT" ? d.eventAt ?? null : null, eventLocation: d.kind === "EVENT" ? d.eventLocation ?? null : null, published: d.published,
      departmentId, categoryId,
    };
    if (id) {
      const cur = await db.article.findUnique({ where: { id } });
      if (!cur) throw new UserError(t("cms.sa.7"));
      if (isSec && (cur.authorId !== admin.id || cur.published || cur.kind !== d.kind)) throw new UserError(t("cms.sa.8"));
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
      return { data: { id }, message: isSec ? t("cms.sa.9") : t("cms.sa.10") };
    }
    const a = await db.article.create({ data: { ...base, slug: uniqueSlug(d.title), publishedAt: d.publishedAt ?? (d.published ? new Date() : null), authorId: admin.id, attachments: { create: d.attachments } } });
    const live = !a.publishedAt || a.publishedAt <= new Date(); // bài hẹn giờ chưa tới lúc thì chưa gửi thông báo, chưa báo công cụ tìm kiếm
    if (d.published && live && d.kind === "ANNOUNCEMENT") {
      const users = await db.user.findMany({ where: { status: "ACTIVE", role: { not: "EXTERNAL" }, id: { not: admin.id } }, select: { id: true } });
      await notifyUsers(users.map((u) => u.id), { type: "SYSTEM", title: "Thông báo mới từ Đoàn trường", body: d.title, link: `/bai-viet/${a.slug}` });
    }
    await audit(admin.id, "article.create", "Article", a.id, { title: d.title, kind: d.kind });
    if (isSec) {
      const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
      await notifyUsers(admins.map((u) => u.id), { type: "SYSTEM", title: "Bài viết chờ duyệt", body: `${admin.fullName}: ${d.title}`, link: `/cms/${kindSlug(d.kind)}/${a.id}` });
    }
    refreshPublic();
    if (d.published && live) pingSearchEngines(["/", KIND_PATH[d.kind], `/bai-viet/${a.slug}`]);
    return { data: { id: a.id }, message: isSec ? t("cms.sa.11") : t("cms.sa.12") };
  });
}

export async function setArticlePublishedAction(id: string, published: boolean) {
  return run(async () => {
    const t = await getT();
    const admin = await requireRole(["ADMIN"]);
    const cur = await db.article.findUnique({ where: { id } });
    if (!cur) throw new UserError(t("cms.sa.7"));
    await db.article.update({ where: { id }, data: { published, publishedAt: published ? cur.publishedAt ?? new Date() : cur.publishedAt } });
    await audit(admin.id, published ? "article.publish" : "article.unpublish", "Article", id);
    refreshPublic();
    pingSearchEngines(["/", KIND_PATH[cur.kind], `/bai-viet/${cur.slug}`]);
    revalidatePath("/cms", "layout");
    return { message: published ? t("cms.sa.13") : t("cms.sa.14") };
  });
}

export async function deleteArticleAction(id: string) {
  return run(async () => {
    const t = await getT();
    const admin = await requireRole(["ADMIN", "SECRETARY"]);
    const cur = await db.article.findUnique({ where: { id }, include: { attachments: true } });
    if (!cur) throw new UserError(t("cms.sa.7"));
    if (admin.role === "SECRETARY" && (cur.authorId !== admin.id || cur.published)) throw new UserError(t("cms.sa.15"));
    await db.article.delete({ where: { id } });
    await deleteImage(cur.coverPublicId);
    for (const f of cur.attachments) await deleteImage(f.publicId);
    await audit(admin.id, "article.delete", "Article", id, { title: cur.title });
    refreshPublic();
    if (cur.published) pingSearchEngines(["/", KIND_PATH[cur.kind], `/bai-viet/${cur.slug}`]);
    revalidatePath("/cms", "layout");
    return { message: t("cms.sa.16") };
  });
}

export async function saveSitePageAction(slug: string, input: unknown) {
  return run(async () => {
    const t = await getT();
    const admin = await requireRole(["ADMIN"]);
    if (!SITE_PAGES[slug]) throw new UserError(t("cms.sa.17"));
    const { content: raw, tabs: rawTabs, attachments: rawFiles } = sitePageSchema.parse(input);
    const tabs = rawTabs?.length ? rawTabs.map((t) => ({ title: t.title, content: cleanHtml(t.content), attachments: t.attachments })) : null;
    const content = tabs ? "" : cleanHtml(raw); // có tab thì nội dung nằm trong từng tab
    const pageFiles = tabs ? [] : rawFiles; // có tab thì tệp nằm trong từng tab
    const allFiles = [...pageFiles, ...(tabs?.flatMap((t) => t.attachments) ?? [])];
    for (const f of allFiles) {
      if (!isOwnPublicId(f.publicId, "documents") || !f.url.startsWith("https://res.cloudinary.com/")) throw new UserError(t("cms.sa.6"));
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
    return { message: t("cms.sa.18") };
  });
}

export async function saveSiteSettingsAction(input: Record<string, string>) {
  return run(async () => {
    const t = await getT();
    const admin = await requireRole(["ADMIN"]);
    const { SETTING_FIELDS, getSiteSettings } = await import("@/lib/services/site-settings");
    const before = await getSiteSettings();
    const newBanner = String(input.bannerPublicId ?? "");
    if (newBanner && (!isOwnPublicId(newBanner, "activities") || !String(input.bannerUrl ?? "").startsWith("https://res.cloudinary.com/"))) throw new UserError(t("cms.sa.19"));
    for (const f of SETTING_FIELDS) {
      const value = String(input[f.key] ?? "").trim().slice(0, 1000);
      if ((f.key === "facebook" || f.key === "youtube") && value && !/^https:\/\/[^\s]+\.[^\s]+$/.test(value)) throw new UserError(t("cms.sa.urlFull", { label: f.label }));
      if (f.key === "phone" && value && !PHONE_RE.test(value)) throw new UserError(`${f.label}: ${PHONE_MSG}`);
      if (f.key === "email" && value && !z.string().email().safeParse(value).success) throw new UserError(t("cms.sa.emailBad", { label: f.label }));
      if (f.key === "countdownLink" && value && !(value.startsWith("/") || /^https?:\/\//.test(value))) throw new UserError(t("cms.sa.20"));
      if (f.key === "countdownAt" && value && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new UserError(t("cms.sa.21"));
      if (f.key === "countdownAt" && value && new Date(`${value}:00+07:00`).getTime() <= Date.now()) throw new UserError(t("cms.sa.22"));
      if (f.key === "countdownAt" && value && !String(input.countdownTitle ?? "").trim()) throw new UserError(t("cms.sa.23"));
      await db.siteSetting.upsert({ where: { key: f.key }, update: { value }, create: { key: f.key, value } });
    }
    if (before.bannerPublicId && before.bannerPublicId !== newBanner) await deleteImage(before.bannerPublicId);
    await audit(admin.id, "site.settings", "SiteSetting", null);
    refreshPublic();
    return { message: t("cms.sa.24") };
  });
}

// ---------- Dòng chữ chạy ----------

const marqueeSchema = z.object({
  text: z.string().trim().min(2, "Nhập nội dung (tối thiểu 2 ký tự)").max(300, "Tối đa 300 ký tự"),
  link: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(300).refine((v) => v.startsWith("/") || /^https?:\/\//.test(v), "Liên kết phải bắt đầu bằng / hoặc https://").optional()),
});

export async function addMarqueeAction(input: unknown) {
  return run(async () => {
    const t = await getT();
    const admin = await requireRole(["ADMIN"]);
    const d = marqueeSchema.parse(input);
    const last = await db.marqueeItem.aggregate({ _max: { sortOrder: true } });
    await db.marqueeItem.create({ data: { text: d.text, link: d.link ?? null, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
    await audit(admin.id, "marquee.create", "MarqueeItem", null, { text: d.text });
    refreshPublic(); revalidatePath("/cms/marquee");
    return { message: t("cms.sa.25") };
  });
}

export async function toggleMarqueeAction(id: string, active: boolean) {
  return run(async () => {
    const t = await getT();
    const admin = await requireRole(["ADMIN"]);
    await db.marqueeItem.update({ where: { id }, data: { active } });
    await audit(admin.id, active ? "marquee.enable" : "marquee.disable", "MarqueeItem", id);
    refreshPublic(); revalidatePath("/cms/marquee");
    return { message: active ? t("cms.sa.26") : t("cms.sa.27") };
  });
}

export async function deleteMarqueeAction(id: string) {
  return run(async () => {
    const t = await getT();
    const admin = await requireRole(["ADMIN"]);
    await db.marqueeItem.delete({ where: { id } });
    await audit(admin.id, "marquee.delete", "MarqueeItem", id);
    refreshPublic(); revalidatePath("/cms/marquee");
    return { message: t("cms.sa.28") };
  });
}

/** Đổi vị trí với dòng liền kề (hoán đổi sortOrder). */
export async function moveMarqueeAction(id: string, dir: "up" | "down") {
  return run(async () => {
    const t = await getT();
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
    const t = await getT();
    const admin = await requireRole(["ADMIN"]);
    if (input === null) {
      await db.siteSetting.deleteMany({ where: { key: "menuConfig" } });
    } else {
      const parsed = menuConfigSchema.safeParse(input);
      if (!parsed.success) throw new UserError(parsed.error.issues[0]?.message ?? t("cms.sa.29"));
      const value = JSON.stringify(parsed.data);
      await db.siteSetting.upsert({ where: { key: "menuConfig" }, update: { value }, create: { key: "menuConfig", value } });
    }
    await audit(admin.id, "site.menu", "SiteSetting", "menuConfig");
    refreshPublic();
    return { message: input === null ? t("cms.sa.30") : t("cms.sa.31") };
  });
}
