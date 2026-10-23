import Link from "next/link";
import { FadeImage } from "@/components/public/fade-image";
import { cdnImage } from "@/lib/image-url";
import { CalendarDays, Compass, Eye, FileText, Gamepad2, HeartHandshake, MapPin } from "lucide-react";
import { formatDate, formatDateTime } from "@/utils";
import { KIND_LABEL, articleHref } from "@/lib/services/public";
import type { ArticleKind } from "@prisma/client";
import { cn } from "@/utils";
import { Thumb } from "./thumb";

/** Tiêu đề khối có vạch xanh bên trái, giống bố cục trang trường. */
export function Block({ title, href, children, className }: { title: string; href?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded border border-primary/20 bg-white/85 shadow-sm transition-shadow duration-300 hover:shadow-md max-sm:border-slate-200 max-sm:shadow-none", className)}>
      <div className="flex items-center justify-between bg-gradient-to-r from-primary-dark to-primary px-1.5 py-[3px] max-sm:border-b max-sm:border-slate-100 max-sm:bg-white max-sm:bg-none max-sm:px-1 max-sm:py-1">
        <h2 className="border-l-4 border-[#ffd400] pl-3 text-[15px] font-bold tracking-wide text-white uppercase max-sm:text-primary-dark">{title}</h2>
        {href && <Link href={href} className="text-[13px] font-medium text-[#ffd400] hover:underline max-sm:text-primary">Xem tất cả</Link>}
      </div>
      <div className="p-1.5 max-sm:p-1">{children}</div>
    </section>
  );
}

/** `actions`: bộ lọc/nút đặt cùng hàng với tiêu đề (ở màn hình lớn), xuống dưới tiêu đề khi chật. */
export function PageTitle({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b-2 border-primary pb-1">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-primary-dark">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="max-lg:w-full">{actions}</div>}
    </div>
  );
}

export type CardArticle = { id: string; kind: ArticleKind; title: string; slug: string; summary: string | null; coverUrl: string | null; attachments?: { url: string; name: string }[]; publishedAt: Date | null; viewCount?: number; eventAt: Date | null; eventLocation: string | null; department?: { name: string } | null; category?: { id: string; name: string } | null };

export function ArticleRow({ a, showKind, compact }: { a: CardArticle; showKind?: boolean; /** Khối hẹp (nửa chiều ngang): thumbnail nhỏ, meta một dòng, không tóm tắt. */ compact?: boolean }) {
  return (
    <article className="group flex gap-1 border-b border-border py-1 last:border-0">
      <Thumb a={a} always={a.kind === "PLAN"} className={compact ? "h-16 w-24" : "h-20 w-28 sm:h-24 sm:w-36"} />
      <div className="min-w-0 flex-1">
        <Link href={articleHref(a.slug)} className="line-clamp-2 font-semibold group-hover:text-primary">{a.title}</Link>
        {compact ? (
          <div className="mt-0.5 truncate text-xs text-muted">
            {a.kind === "EVENT" && a.eventAt ? formatDateTime(a.eventAt) : a.publishedAt && formatDate(a.publishedAt)}
            {a.viewCount !== undefined && <> · {a.viewCount.toLocaleString("vi-VN")} lượt xem</>}
            {a.kind === "EVENT" && a.eventLocation && <> · {a.eventLocation}</>}
          </div>
        ) : (
          <>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
              {showKind && <span className="rounded bg-primary-light px-1.5 py-0.5 font-medium text-primary-dark">{KIND_LABEL[a.kind]}</span>}
              {a.category && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">{a.category.name}</span>}
              {a.publishedAt && <span>{formatDate(a.publishedAt)}</span>}
              {a.viewCount !== undefined && <span className="inline-flex items-center gap-1"><Eye className="size-3" />{a.viewCount.toLocaleString("vi-VN")}</span>}
              {a.kind === "EVENT" && a.eventAt && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3" />{formatDateTime(a.eventAt)}</span>}
              {a.kind === "EVENT" && a.eventLocation && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{a.eventLocation}</span>}
            </div>
            {a.summary && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{a.summary}</p>}
          </>
        )}
      </div>
    </article>
  );
}

/** Danh sách bài gọn (ảnh nhỏ + tiêu đề + ngày) cho cột bên. */
export function SideArticleList({ items, thumbClass = "size-14" }: { items: CardArticle[]; thumbClass?: string }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((a) => (
        <li key={a.id} className="group flex gap-1 py-[3px] first:pt-0 last:pb-0">
          <Thumb a={a} className={thumbClass} />
          <div className="min-w-0">
            <Link href={articleHref(a.slug)} className="line-clamp-2 text-sm font-medium group-hover:text-primary">{a.title}</Link>
            <span className="text-xs text-muted">{a.publishedAt && formatDate(a.publishedAt)}{a.viewCount !== undefined && <span className="ml-2 inline-flex items-center gap-1 align-middle"><Eye className="size-3" />{a.viewCount.toLocaleString("vi-VN")}</span>}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

const KIND_ICON = { STORY: HeartHandshake, GAME: Gamepad2, CAREER: Compass, DOCUMENT: FileText } as const;
const KIND_TINT: Record<string, string> = { STORY: "from-rose-100 to-rose-50 text-rose-500", GAME: "from-amber-100 to-amber-50 text-amber-500", CAREER: "from-emerald-100 to-emerald-50 text-emerald-600", DOCUMENT: "from-sky-100 to-sky-50 text-sky-600" };

/** Lưới thẻ có ảnh lớn cho các chuyên mục "Câu chuyện đẹp", "Trò chơi", "Định hướng nghề nghiệp". */
export function ArticleGrid({ items, cols = "sm:grid-cols-2 lg:grid-cols-3" }: { items: CardArticle[]; cols?: string }) {
  return (
    <div className={cn("grid gap-2", cols)}>
      {items.map((a) => {
        const Icon = KIND_ICON[a.kind as keyof typeof KIND_ICON] ?? CalendarDays;
        return (
          <Link key={a.id} href={articleHref(a.slug)} className="group flex flex-col overflow-hidden rounded border border-border bg-white/90 transition duration-300 hover:-translate-y-1 hover:shadow-lg">
            {a.coverUrl ? (
              <FadeImage src={cdnImage(a.coverUrl, 1000)} wrapperClassName="aspect-[16/10] w-full" className="transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className={cn("flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br", KIND_TINT[a.kind] ?? "from-primary-light to-white text-primary")}><Icon className="size-12" /></div>
            )}
            <div className="flex flex-1 flex-col gap-1 p-2">
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                {a.department && <span className="rounded bg-primary-light px-1.5 py-0.5 font-medium text-primary-dark">Chi đoàn {a.department.name}</span>}
                {a.publishedAt && <span>{formatDate(a.publishedAt)}</span>}
                {a.viewCount !== undefined && <span className="inline-flex items-center gap-1"><Eye className="size-3" />{a.viewCount.toLocaleString("vi-VN")}</span>}
              </div>
              <h3 className="line-clamp-2 font-semibold group-hover:text-primary">{a.title}</h3>
              {a.summary && <p className="line-clamp-3 text-sm text-slate-600">{a.summary}</p>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function EmptyPublic({ text = "Chưa có nội dung." }: { text?: string }) {
  return <p className="py-8 text-center text-sm text-muted">{text}</p>;
}
