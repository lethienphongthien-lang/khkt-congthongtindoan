import Link from "next/link";
import { emulationRanking } from "@/lib/services/emulation";
import { currentValue, resolvePeriod } from "@/lib/emulation-period";
import { loadCalendars } from "@/lib/services/school-calendar";
import { Reveal } from "@/components/public/reveal";
import { TopChapters } from "@/components/public/top-chapters";
import { TopPeople } from "@/components/emulation/web-ranking-section";
import { webRanking } from "@/lib/services/web-ranking";
import { latestArticles, latestCovers, mostViewedArticles, articleExcerpt, articleHref } from "@/lib/services/public";
import { NewsTabs, type TabItem } from "@/components/public/news-tabs";
import { CardRow, FeatureSection, LeadStory, SectionHead } from "@/components/public/home-sections";
import { PhotoStrip } from "@/components/public/photo-strip";
import { listPublicQuizzes } from "@/lib/services/games";
import { themeOf } from "@/components/games/game-meta";
import { quizHref } from "@/components/public/quiz-cards";
import { formatDate } from "@/utils";
import { EmptyPublic } from "@/components/public/blocks";
import { Countdown } from "@/components/public/countdown";
import { getSiteSettings } from "@/lib/services/site-settings";

export const revalidate = 60; // trang chủ cache 60 giây

export default async function HomePage() {
  const calendars = await loadCalendars();
  const period = resolvePeriod("week", currentValue("week", new Date(), calendars), calendars)!; // thi đua tính theo tuần
  const [allNews, announcements, plans, stories, careers, quizzes, popular, weekRanking, settings, covers, web] = await Promise.all([
    latestArticles("NEWS", 16), latestArticles("ANNOUNCEMENT", 8), latestArticles("PLAN", 8), latestArticles("STORY", 7), latestArticles("CAREER", 7), listPublicQuizzes(4), mostViewedArticles("NEWS", 6),
    emulationRanking(period), getSiteSettings(), latestCovers(24), webRanking("week", period.value),
  ]);
  const hero = allNews.filter((a) => a.coverUrl); // tin nổi bật = tin mới nhất có ảnh bìa
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

  const toTab = (a: (typeof allNews)[number]): TabItem => ({ id: a.id, title: a.title, href: articleHref(a.slug), coverUrl: a.coverUrl, attachments: a.attachments, date: a.publishedAt ? formatDate(a.publishedAt) : "", views: a.viewCount });
  const lead = hero[0] ?? allNews[0];
  // Bài chưa có tóm tắt: lấy đoạn đầu nội dung để các khối vẫn hiện mô tả
  const withExcerpt = async <T extends { id: string; summary: string | null }>(list: T[]) => { await Promise.all(list.map(async (a) => { if (!a.summary) a.summary = (await articleExcerpt(a.id)) || null; })); return list; };
  const [announcementsX, plansX, storiesX, careersX] = await Promise.all([withExcerpt(announcements.slice(0, 7)), withExcerpt(plans.slice(0, 7)), withExcerpt(stories), withExcerpt(careers), withExcerpt(lead ? [lead] : [])]);
  const rest = allNews.filter((a) => a.id !== lead?.id);
  const sideLatest = rest.slice(0, 6);
  const cardRow = rest.slice(6, 10);

  return (
    <div className="space-y-2">
      {countdownTarget && countdownTarget.getTime() > Date.now() && <Countdown title={settings.countdownTitle} target={countdownTarget.toISOString()} link={settings.countdownLink || undefined} />}
      {/* Đầu trang: tin nổi bật (2/3) + tab Tin mới / Xem nhiều (1/3), dưới là hàng 4 thẻ ảnh */}
      <section className="rounded bg-white/85 p-2 shadow-sm">
        {!lead ? <EmptyPublic text="Chưa có tin tức." /> : (
          <>
            <div className="grid gap-3 lg:grid-cols-3">
              <LeadStory a={lead} badge="Tin nổi bật" textFirst className="lg:col-span-2" imageClass="aspect-[16/9] lg:aspect-auto lg:min-h-[320px] lg:flex-1" />
              <NewsTabs latest={sideLatest.map(toTab)} popular={popular.map(toTab)} />
            </div>
            <div className="mt-3"><CardRow items={cardRow} /></div>
          </>
        )}
      </section>

      <Reveal><FeatureSection title="Thông báo" href="/thong-bao" items={announcementsX} empty="Chưa có thông báo." /></Reveal>
      <Reveal><FeatureSection title="Kế hoạch" href="/ke-hoach" items={plansX} empty="Chưa có kế hoạch." /></Reveal>

      <Reveal><PhotoStrip photos={covers} /></Reveal>

      <div className="grid gap-2 lg:grid-cols-2">
        <Reveal><section className="h-full rounded bg-white/85 p-2 shadow-sm">
          <SectionHead title={`Top 5 nổi bật · ${(web?.period.label ?? period.label).split(" · ")[0]}`} href="/thi-dua" />
          {web && web.top.length > 0 ? (
            <>
              {web.fallback && <p className="mb-1.5 text-xs text-muted">Tuần này chưa có điểm, đang hiển thị kết quả tuần gần nhất.</p>}
              <TopPeople rows={web.top} />
            </>
          ) : <EmptyPublic text="Tuần này chưa có điểm. Đăng nhập, chơi trò chơi để lên bảng!" />}
        </section></Reveal>
        <Reveal delay={80}><TopChapters title={`Chi đoàn tiêu biểu · ${rankPeriod.label.split(" · ")[0]}`} note={rankPeriod.value !== period.value ? `Tuần này chưa có điểm, đang hiển thị kết quả ${rankPeriod.label.split(" (")[0].toLowerCase()}.` : undefined} items={ranking.map((x) => ({ id: x.id, name: x.name, rank: x.rank, total: x.total }))} /></Reveal>
      </div>

      <Reveal><FeatureSection title="Câu chuyện đẹp" href="/cau-chuyen-dep" items={storiesX} empty="Chưa có câu chuyện." /></Reveal>

      <div className="grid gap-2 lg:grid-cols-3">
        <Reveal delay={80}><section className="h-full rounded bg-white/85 p-2 shadow-sm">
          <SectionHead title="Trò chơi" href="/tro-choi" />
          {quizzes.map((q) => { const th = themeOf(q.theme); return (
            <Link key={q.id} href={quizHref(q.id)} className="flex items-center gap-2 border-b border-border py-1 hover:bg-primary-light/40">
              <span className={`flex h-16 w-24 shrink-0 items-center justify-center rounded bg-gradient-to-br text-3xl text-white ${th.grad}`}>{th.emoji}</span>
              <span className="min-w-0"><span className="line-clamp-2 font-semibold">{q.title}</span><span className="block text-xs text-emerald-600">🎮 Chơi tích điểm{q.points ? ` · +${q.points} điểm` : ""}</span></span>
            </Link>); })}
          {quizzes.length === 0 && <EmptyPublic text="Chưa có trò chơi." />}
        </section></Reveal>
        <Reveal className="lg:col-span-2" delay={160}><FeatureSection title="Định hướng nghề nghiệp" href="/dinh-huong-nghe-nghiep" items={careersX} empty="Chưa có bài hướng nghiệp." /></Reveal>
      </div>
    </div>
  );
}
