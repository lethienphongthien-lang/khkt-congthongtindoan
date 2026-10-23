import Link from "next/link";
import { emulationRanking } from "@/lib/services/emulation";
import { currentValue, resolvePeriod } from "@/lib/emulation-period";
import { loadCalendars } from "@/lib/services/school-calendar";
import { Reveal } from "@/components/public/reveal";
import { TopChapters } from "@/components/public/top-chapters";
import { TopPeople } from "@/components/emulation/web-ranking-section";
import { webRanking } from "@/lib/services/web-ranking";
import { latestArticles, latestCovers, articleHref } from "@/lib/services/public";
import { HeroSlider } from "@/components/public/hero-slider";
import { PhotoStrip } from "@/components/public/photo-strip";
import { listPublicQuizzes } from "@/lib/services/games";
import { themeOf } from "@/components/games/game-meta";
import { quizHref } from "@/components/public/quiz-cards";
import { formatDate } from "@/utils";
import { ArticleGrid, ArticleRow, Block, EmptyPublic, SideArticleList } from "@/components/public/blocks";
import { Thumb } from "@/components/public/thumb";
import { Countdown } from "@/components/public/countdown";
import { getSiteSettings } from "@/lib/services/site-settings";

export const revalidate = 60; // trang chủ cache 60 giây

export default async function HomePage() {
  const calendars = await loadCalendars();
  const period = resolvePeriod("week", currentValue("week", new Date(), calendars), calendars)!; // thi đua tính theo tuần
  const [allNews, announcements, plans, stories, careers, quizzes, weekRanking, settings, covers, web] = await Promise.all([
    latestArticles("NEWS", 16), latestArticles("ANNOUNCEMENT", 8), latestArticles("PLAN", 8), latestArticles("STORY", 4), latestArticles("CAREER", 4), listPublicQuizzes(4),
    emulationRanking(period), getSiteSettings(), latestCovers(24), webRanking("week", period.value),
  ]);
  // 5 tin mới nhất có ảnh bìa chạy ở đầu trang; khối Tin tức bên dưới lấy các tin còn lại để không lặp
  const hero = allNews.filter((a) => a.coverUrl).slice(0, 5);
  const heroIds = new Set(hero.map((a) => a.id));
  const news = allNews.filter((a) => !heroIds.has(a.id)).slice(0, 6);
  // Tuần này chưa ai có điểm thi đua thì dùng tuần gần nhất đã có điểm (lùi tối đa 4 tuần) để xếp hạng
  let ranking = weekRanking;
  let rankPeriod = period;
  if (!ranking.some((r) => r.total > 0)) {
    const m = period.value.match(/^(\d{4})-T(\d+)$/);
    for (let w = m ? +m[2] - 1 : 0; m && w >= Math.max(1, +m[2] - 4); w--) {
      const p = resolvePeriod("week", `${m[1]}-T${String(w).padStart(2, "0")}`, calendars);
      if (!p) continue;
      const rk = await emulationRanking(p);
      if (rk.some((r) => r.total > 0)) { ranking = rk; rankPeriod = p; break; }
    }
  }
  // countdownAt nhập theo giờ Việt Nam (UTC+7)
  const countdownTarget = settings.countdownTitle && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(settings.countdownAt) ? new Date(`${settings.countdownAt}:00+07:00`) : null;
  const restNews = news;

  return (
    <div className="space-y-2">
      {countdownTarget && countdownTarget.getTime() > Date.now() && <Countdown title={settings.countdownTitle} target={countdownTarget.toISOString()} link={settings.countdownLink || undefined} />}
      <div className="grid gap-2 xl:grid-cols-3">
        <div className="space-y-2 xl:col-span-2">
          <Block title="Tin tức" href="/tin-tuc">
            {allNews.length === 0 ? <EmptyPublic text="Chưa có tin tức." /> : (
              // Ảnh bìa tự trượt (5 tin mới nhất có ảnh) bên trái + danh sách các tin còn lại bên phải
              <div className="grid gap-2 md:grid-cols-5">
                <HeroSlider className="md:col-span-3" slides={hero.map((a) => ({ id: a.id, title: a.title, href: articleHref(a.slug), coverUrl: a.coverUrl!, date: [a.publishedAt ? formatDate(a.publishedAt) : "", `${a.viewCount.toLocaleString("vi-VN")} lượt xem`].filter(Boolean).join(" · ") }))} />
                <div className={hero.length ? "md:col-span-2" : "md:col-span-5"}><SideArticleList items={restNews} thumbClass="h-16 w-24" /></div>
              </div>
            )}
          </Block>

          <div className="grid gap-2">
            <Reveal><Block title="Kế hoạch" href="/ke-hoach">
              {plans.length === 0 ? <EmptyPublic text="Chưa có kế hoạch." /> : plans.map((a) => <ArticleRow key={a.id} a={a} />)}
            </Block></Reveal>
          </div>
        </div>

        <aside className="space-y-2">
          <Block title="Thông báo" href="/thong-bao">
            {announcements.length === 0 ? <EmptyPublic text="Chưa có thông báo." /> : (
              <ul className="divide-y divide-border">
                {announcements.map((a) => (
                  <li key={a.id} className="flex gap-1 py-[3px]">
                    <Thumb a={a} className="size-14" />
                    <div className="min-w-0">
                      <Link href={articleHref(a.slug)} className="line-clamp-2 text-sm font-medium hover:text-primary">{a.title}</Link>
                      <span className="text-xs text-muted">{a.publishedAt && formatDate(a.publishedAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Reveal><Block title={`Top 5 nổi bật · ${(web?.period.label ?? period.label).split(" · ")[0]}`} href="/thi-dua">
            {web && web.top.length > 0 ? (
              <>
                {web.fallback && <p className="mb-1.5 text-xs text-muted">Tuần này chưa có điểm, đang hiển thị kết quả tuần gần nhất.</p>}
                <TopPeople rows={web.top} />
              </>
            ) : <EmptyPublic text="Tuần này chưa có điểm. Đăng nhập, chơi trò chơi để lên bảng!" />}
          </Block></Reveal>

          <Reveal><TopChapters title={`Chi đoàn tiêu biểu · ${rankPeriod.label.split(" · ")[0]}`} note={rankPeriod.value !== period.value ? `Tuần này chưa có điểm, đang hiển thị kết quả ${rankPeriod.label.split(" (")[0].toLowerCase()}.` : undefined} items={ranking.map((x) => ({ id: x.id, name: x.name, rank: x.rank, total: x.total }))} /></Reveal>
        </aside>
      </div>
      <Reveal><PhotoStrip photos={covers} /></Reveal>
      <div className="grid gap-2 lg:grid-cols-3">
        <Reveal className="lg:col-span-3"><Block title="Câu chuyện đẹp" href="/cau-chuyen-dep">
          {stories.length === 0 ? <EmptyPublic text="Chưa có câu chuyện." /> : <ArticleGrid items={stories} cols="sm:grid-cols-2 lg:grid-cols-4" />}
        </Block></Reveal>
        <Reveal delay={80}><Block title="Trò chơi" href="/tro-choi" className="h-full">
          {quizzes.map((q) => { const th = themeOf(q.theme); return (
            <Link key={q.id} href={quizHref(q.id)} className="flex items-center gap-2 border-b border-border py-1 hover:bg-primary-light/40">
              <span className={`flex h-16 w-24 shrink-0 items-center justify-center rounded bg-gradient-to-br text-3xl text-white ${th.grad}`}>{th.emoji}</span>
              <span className="min-w-0"><span className="line-clamp-2 font-semibold">{q.title}</span><span className="block text-xs text-emerald-600">🎮 Chơi tích điểm{q.points ? ` · +${q.points} điểm` : ""}</span></span>
            </Link>); })}
          {quizzes.length === 0 && <EmptyPublic text="Chưa có trò chơi." />}
        </Block></Reveal>
        <Reveal className="lg:col-span-2" delay={160}><Block title="Định hướng nghề nghiệp" href="/dinh-huong-nghe-nghiep" className="h-full">
          {careers.length === 0 ? <EmptyPublic text="Chưa có bài hướng nghiệp." /> : careers.map((a) => <ArticleRow key={a.id} a={a} />)}
        </Block></Reveal>
      </div>
    </div>
  );
}
