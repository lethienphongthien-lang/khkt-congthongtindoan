import Link from "next/link";
import { Eye } from "lucide-react";
import { FadeImage } from "@/components/public/fade-image";
import { cdnImage } from "@/lib/image-url";
import { articleHref } from "@/lib/services/public";
import { formatDate, cn } from "@/utils";
import { Thumb } from "./thumb";
import type { CardArticle } from "./blocks";

/** Tiêu đề chuyên mục kiểu cổng tin: vạch xanh đậm phía trên, chữ in hoa, liên kết "Xem tất cả" bên phải. */
export function SectionHead({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between border-t-2 border-primary-dark pt-1">
      <h2 className="text-[17px] font-bold tracking-wide text-primary-dark uppercase">{title}</h2>
      {href && <Link href={href} className="text-[13px] font-medium text-primary hover:underline">Xem tất cả</Link>}
    </div>
  );
}

/** Bài nổi bật: tiêu đề + tóm tắt ở trên, ảnh lớn ở dưới (đầu trang) hoặc ảnh trên - chữ dưới (trong chuyên mục). */
export function LeadStory({ a, badge, textFirst, className, imageClass = "aspect-[16/10]", fill }: { a: CardArticle; badge?: string; textFirst?: boolean; /** Ảnh giãn cho vừa chiều cao hàng (bằng các cột bên cạnh) từ cỡ md trở lên */ fill?: boolean; className?: string; imageClass?: string }) {
  const text = (
    <div className={textFirst ? "mb-1.5" : "mt-1.5"}>
      <h3 className={cn("font-bold leading-snug transition-colors group-hover:text-primary", textFirst ? "font-serif text-xl sm:text-2xl lg:text-[26px]" : "line-clamp-2 text-base sm:text-lg")}>{a.title}</h3>
      {a.summary && <p className={cn("mt-1 text-sm text-slate-600", textFirst ? "line-clamp-3" : "line-clamp-3")}>{a.summary}</p>}
      {!textFirst && <p className="mt-0.5 text-xs text-muted">{a.publishedAt && formatDate(a.publishedAt)}</p>}
    </div>
  );
  return (
    <Link href={articleHref(a.slug)} className={cn("group block", (textFirst || fill) && "lg:flex lg:flex-col", fill && "md:flex md:flex-col", className)}>
      {textFirst && text}
      <div className={cn("relative w-full overflow-hidden rounded bg-slate-200", imageClass, fill && "md:aspect-auto md:min-h-[180px] md:flex-1")}>
        {a.coverUrl ? <div className="absolute inset-0"><FadeImage src={cdnImage(a.coverUrl, 1280)} wrapperClassName="size-full" className="object-top transition-transform duration-500 group-hover:scale-[1.03]" /></div> : <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary-light to-white"><Thumb a={a} always className="size-24 border-0" /></div>}
        {badge && <span className="absolute top-2 left-2 rounded bg-danger px-2 py-0.5 text-xs font-bold text-white shadow">{badge}</span>}
      </div>
      {!textFirst && text}
    </Link>
  );
}

/** Dòng bài gọn: ảnh nhỏ bên trái, tiêu đề + ngày bên phải. */
export function ThumbItem({ a, thumbClass = "h-[72px] w-28", showViews, className }: { className?: string; a: CardArticle; thumbClass?: string; showViews?: boolean }) {
  return (
    <article className={cn("group flex gap-2 border-b border-border py-1.5 first:pt-0 last:border-0 last:pb-0", className)}>
      <Thumb a={a} always className={thumbClass} />
      <div className="min-w-0 flex-1">
        <Link href={articleHref(a.slug)} className="line-clamp-3 text-sm leading-snug font-semibold group-hover:text-primary">{a.title}</Link>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
          {a.publishedAt && formatDate(a.publishedAt)}
          {showViews && a.viewCount !== undefined && <span className="inline-flex items-center gap-1"><Eye className="size-3" />{a.viewCount.toLocaleString("vi-VN")}</span>}
        </p>
      </div>
    </article>
  );
}

/** Chuyên mục: 1 bài nổi bật bên trái (1/3), các bài còn lại xếp 2 cột có ảnh nhỏ bên phải. */
export function FeatureSection({ title, href, items, empty }: { title: string; href: string; items: CardArticle[]; empty: string }) {
  const [lead, ...rest] = items;
  return (
    <section className="rounded bg-white/85 p-2 shadow-sm">
      <SectionHead title={title} href={href} />
      {!lead ? <p className="py-6 text-center text-sm text-muted">{empty}</p> : (
        <div className={cn("grid gap-x-3 gap-y-2", rest.length > 4 ? "md:grid-cols-3" : "md:grid-cols-2")}>
          <LeadStory a={lead} fill />
          {rest.length > 0 && (() => {
            // Từ 5 bài nhỏ: chia đều hai cột (1/3 + 2/3); ít hơn: bài lớn chiếm nửa trái, danh sách 1 cột nửa phải để không bị giãn thưa
            const two = rest.length > 4;
            const cols = two ? [rest.slice(0, Math.ceil(rest.length / 2)), rest.slice(Math.ceil(rest.length / 2))] : [rest];
            return (
              <div className={cn("grid gap-x-3", rest.length > 4 && "md:col-span-2", two && "md:grid-cols-2")}>
                {cols.map((col, k) => <div key={k} className="flex flex-col">{col.map((a) => <ThumbItem key={a.id} a={a} className={rest.length > 4 ? "flex-1 items-center" : "py-2"} />)}</div>)}
              </div>
            );
          })()}
        </div>
      )}
    </section>
  );
}

/** Hàng thẻ ảnh (4 cột) ngay dưới tin nổi bật. */
export function CardRow({ items }: { items: CardArticle[] }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {items.map((a) => (
        <Link key={a.id} href={articleHref(a.slug)} className="group block">
          <div className="aspect-[16/10] w-full overflow-hidden rounded bg-slate-200">
            {a.coverUrl ? <FadeImage src={cdnImage(a.coverUrl, 640)} wrapperClassName="size-full" className="transition-transform duration-500 group-hover:scale-105" /> : <Thumb a={a} always className="size-full border-0" />}
          </div>
          <h3 className="mt-1 line-clamp-2 font-serif text-[15px] leading-snug font-semibold group-hover:text-primary">{a.title}</h3>
        </Link>
      ))}
    </div>
  );
}
