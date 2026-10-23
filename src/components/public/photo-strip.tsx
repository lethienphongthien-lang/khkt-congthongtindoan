import Link from "next/link";
import { cdnImage } from "@/lib/image-url";
import { articleHref } from "@/lib/services/public";
import { Block } from "./blocks";

export type StripPhoto = { id: string; title: string; slug: string; coverUrl: string | null };

/** Dải ảnh hoạt động tự trượt ngang (lấy từ ảnh bìa các bài mới nhất); rê chuột để dừng, bấm vào ảnh để mở bài. Dùng lại hiệu ứng của dòng chữ chạy. */
export function PhotoStrip({ photos }: { photos: StripPhoto[] }) {
  const items = photos.filter((p) => p.coverUrl);
  if (items.length < 4) return null;
  const loop = [...items, ...items]; // lặp đôi để vòng cuộn liền mạch
  return (
    <Block title="Hình ảnh hoạt động">
      <div className="marquee">
        <div className="marquee-track gap-1.5" style={{ animationDuration: `${items.length * 5}s` }}>
          {loop.map((p, k) => (
            <Link key={`${p.id}-${k}`} href={articleHref(p.slug)} aria-hidden={k >= items.length} tabIndex={k >= items.length ? -1 : 0} title={p.title}
              className="group relative block h-32 w-48 shrink-0 overflow-hidden rounded bg-slate-200 sm:h-40 sm:w-60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cdnImage(p.coverUrl!, 720)} alt={p.title} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" draggable={false} />
              <span className="absolute inset-x-0 bottom-0 line-clamp-1 bg-gradient-to-t from-black/70 to-transparent px-2 pt-5 pb-1 text-xs font-medium text-white">{p.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </Block>
  );
}
