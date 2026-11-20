import Link from "next/link";
import { getLocale, getT } from "@/lib/i18n/server";
import { viewTotals } from "@/lib/services/insights";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { emulationRanking } from "@/lib/services/emulation";
import { adminOverview } from "@/lib/services/overview";
import { visitStatus, vnDay } from "@/lib/services/visits";
import { webRanking } from "@/lib/services/web-ranking";
import { loadCalendars } from "@/lib/services/school-calendar";
import { currentValue, resolvePeriod } from "@/lib/emulation-period";
import { formatDateTime, formatNumber as fmtNum } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { DataTable, EmptyState, PageHeader, Section, Stat, Td, Th } from "@/components/ui/misc";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { WebRankingSection } from "@/components/emulation/web-ranking-section";
import { ChartCard } from "@/components/charts/chart-card";
import { GradeChart, MonthBars, RankBars } from "@/components/charts/overview-charts";

export async function generateMetadata() { return { title: (await getT())("dash.overview") }; }

const DAY = 86_400_000;

/** Kỳ "tuần này" theo lịch năm học (nếu ngoài thời gian học thì là Tuần 1). */
async function thisWeek() {
  const calendars = await loadCalendars();
  return resolvePeriod("week", currentValue("week", new Date(), calendars), calendars)!;
}

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "ADMIN") return <AdminDashboard />;
  if (user.role === "SECRETARY" || user.role === "DEPARTMENT_ACCOUNT") return <SecretaryDashboard userId={user.id} departmentId={user.departmentId} name={user.departmentName} memberId={user.memberId} isAccount={user.role === "DEPARTMENT_ACCOUNT"} />;
  return <MemberDashboard user={user} />;
}

async function AdminDashboard() {
  const t = await getT();
  const locale = await getLocale();
  const formatNumber = (n: number) => fmtNum(n, locale);
  const period = await thisWeek();
  const today = vnDay();
  const days = Array.from({ length: 7 }, (_, i) => vnDay(new Date(Date.now() - (6 - i) * DAY)));
  const [o, emulation, web, perDay, activated, accounts, views, violationsThisWeek] = await Promise.all([
    adminOverview(),
    emulationRanking(period),
    webRanking("week", period.value),
    db.dailyCheckin.groupBy({ by: ["day"], where: { day: { in: days } }, _count: true }),
    db.member.count({ where: { status: "ACTIVE", department: { isTeacher: false, graduatedAt: null }, user: { mustChangePassword: false } } }),
    db.member.count({ where: { status: "ACTIVE", department: { isTeacher: false, graduatedAt: null } } }),
    viewTotals(),
    db.violation.count({ where: { recordedAt: { gte: period.from, lt: period.to } } }),
  ]);
  const pct = o.students ? Math.round((o.doanVien / o.students) * 100) : 0;
  const visitBy = new Map(perDay.map((r) => [r.day, r._count]));
  const visitsToday = visitBy.get(today) ?? 0;
  const visitTrend = days.map((d) => ({ month: `${d.slice(8, 10)}/${d.slice(5, 7)}`, value: visitBy.get(d) ?? 0 }));
  const lowRate = [...o.depts].filter((d) => d.total > 0).sort((a, b) => a.rate - b.rate || a.name.localeCompare(b.name, "vi", { numeric: true })).slice(0, 10)
    .map((d) => ({ name: d.name, value: d.rate, note: t("dash.chart.studentsNote", { a: d.doanVien, b: d.total }) }));
  const top = emulation.filter((r) => r.total > 0).slice(0, 8).map((r) => ({ name: r.name, value: Math.round(r.total * 10) / 10, note: t("dash.chart.membersNote", { n: r.members }) }));
  const gTotal = o.gender.male + o.gender.female + o.gender.other;
  const gShare = (n: number) => (gTotal ? (n / gTotal) * 100 : 0);
  return (
    <>
      <PageHeader title={t("dash.overview")} description={t("dash.admin.desc", { period: period.label })} />
      {(o.pendingArticles > 0 || o.newFeedback > 0) && (
        <div className="mb-5 flex flex-wrap gap-2 text-sm">
          {o.pendingArticles > 0 && <Link href="/approvals" className="inline-flex items-center gap-2 rounded-md bg-warning-light px-3 py-1.5 font-medium text-warning hover:opacity-90"><span className="size-2 rounded-full bg-current" />{t("dash.admin.pending", { n: o.pendingArticles })}</Link>}
          {o.newFeedback > 0 && <Link href="/feedback" className="inline-flex items-center gap-2 rounded-md bg-primary-light px-3 py-1.5 font-medium text-primary hover:opacity-90"><span className="size-2 rounded-full bg-current" />{t("dash.admin.newFeedback", { n: o.newFeedback })}</Link>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label={t("dash.stat.students")} value={formatNumber(o.students)} hint={t("dash.stat.studentsHint", { n: o.departments })} />
        <Stat label={t("dash.stat.doanVien")} value={formatNumber(o.doanVien)} hint={t("dash.stat.pctStudents", { n: pct })} />
        <Stat label={t("dash.stat.youth")} value={formatNumber(o.thanhNien)} hint={t("dash.stat.notJoined")} />
        <Stat label={t("dash.stat.visitsToday")} value={formatNumber(visitsToday)} hint={t("dash.stat.visitsTodayHint")} />
        <Stat label={t("dash.stat.activated")} value={`${formatNumber(activated)}/${formatNumber(accounts)}`} hint={t("dash.stat.activatedHint")} />
        <Stat label={t("dash.stat.articleViews")} value={formatNumber(views.total)} hint={t("dash.stat.viewsWeek", { n: formatNumber(views.thisWeek) })} />
        <Stat label={t("dash.stat.violationsWeek")} value={formatNumber(violationsThisWeek)} hint={t("dash.stat.wholeSchool")} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <ChartCard title={t("dash.chart.visit7")} subtitle={t("dash.chart.visit7Sub")} empty={visitTrend.every((v) => v.value === 0) ? t("dash.chart.visit7Empty") : undefined}>
          <MonthBars data={visitTrend} series={t("dash.chart.visitSeries")} unit={t("dash.unit.people")} />
        </ChartCard>
        <ChartCard title={t("dash.chart.grade")} subtitle={t("dash.chart.gradeSub")} empty={o.students === 0 ? t("dash.chart.noStudents") : undefined}>
          <GradeChart data={o.byGrade} />
        </ChartCard>
        <ChartCard title={t("dash.chart.low")} subtitle={t("dash.chart.lowSub")} empty={lowRate.length === 0 ? t("dash.chart.noData") : undefined}>
          <RankBars data={lowRate} unit="%" series={t("dash.chart.lowSeries")} max={100} />
        </ChartCard>
        <ChartCard title={t("dash.chart.emu")} subtitle={t("dash.chart.emuSub")} empty={top.length === 0 ? t("dash.chart.emuEmpty") : undefined}>
          <RankBars data={top} unit={t("dash.unit.points")} series={t("dash.chart.emuSeries")} color="var(--chart-2)" />
        </ChartCard>
        <ChartCard title={t("dash.chart.join")} subtitle={t("dash.chart.joinSub")} empty={o.joinTrend.every((j) => j.value === 0) ? t("dash.chart.joinEmpty") : undefined}>
          <MonthBars data={o.joinTrend} series={t("dash.chart.joinSeries")} unit={t("dash.unit.people")} />
        </ChartCard>
        <ChartCard title={t("dash.chart.gender")} subtitle={t("dash.chart.genderSub")} empty={o.gender.male + o.gender.female === 0 ? t("dash.chart.genderEmpty") : undefined}>
          <div className="space-y-4 pt-2">
            <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded-md" role="img" aria-label={t("dash.chart.genderAria", { m: o.gender.male, f: o.gender.female, o: o.gender.other })}>
              {o.gender.male > 0 && <div style={{ width: `${gShare(o.gender.male)}%`, background: "var(--chart-1)" }} />}
              {o.gender.female > 0 && <div style={{ width: `${gShare(o.gender.female)}%`, background: "var(--chart-2)" }} />}
              {o.gender.other > 0 && <div style={{ width: `${gShare(o.gender.other)}%`, background: "var(--color-slate-300)" }} />}
            </div>
            <ul className="grid grid-cols-3 gap-3 text-sm">
              {([[t("dash.gender.male"), o.gender.male, "var(--chart-1)"], [t("dash.gender.female"), o.gender.female, "var(--chart-2)"], [t("dash.gender.other"), o.gender.other, "var(--color-slate-300)"]] as const).map(([label, n, color]) => (
                <li key={label}><div className="flex items-center gap-1.5 text-xs text-muted"><span className="size-2.5 rounded-sm" style={{ background: color }} />{label}</div><div className="mt-0.5 text-xl font-semibold tabular-nums">{n}</div></li>
              ))}
            </ul>
          </div>
        </ChartCard>
      </div>
      {web && <WebRankingSection data={web} />}
    </>
  );
}

async function SecretaryDashboard({ userId, departmentId, name, memberId, isAccount }: { userId: string; departmentId: string | null; name: string | null; memberId: string | null; isAccount?: boolean }) {
  const t = await getT();
  const locale = await getLocale();
  const formatNumber = (n: number) => fmtNum(n, locale);
  if (!departmentId) {
    return <><PageHeader title={t("dash.overview")} /><EmptyState title={t("dash.sec.noDept")} description={t("dash.sec.noDeptDesc")} /></>;
  }
  const period = await thisWeek();
  const today = vnDay();
  const weekAgo = vnDay(new Date(Date.now() - 6 * DAY));
  const [members, youth, points, visitsToday, quiet, me, posts, violationsThisWeek] = await Promise.all([
    db.member.count({ where: { departmentId, status: "ACTIVE", isDoanVien: true } }),
    db.member.count({ where: { departmentId, status: "ACTIVE", isDoanVien: false } }),
    db.member.aggregate({ where: { departmentId, deletedAt: null }, _sum: { totalPoints: true } }),
    db.dailyCheckin.count({ where: { day: today, member: { departmentId } } }),
    // Đoàn viên chưa vào hệ thống trong 7 ngày gần nhất (để Bí thư nhắc)
    db.member.findMany({ where: { departmentId, status: "ACTIVE", dailyCheckins: { none: { day: { gte: weekAgo } } } }, orderBy: { fullName: "asc" }, take: 10, select: { id: true, code: true, fullName: true } }),
    memberId ? db.member.findUnique({ where: { id: memberId }, select: { avatarUrl: true } }) : Promise.resolve(null),
    db.article.count({ where: { authorId: userId } }),
    db.violation.count({ where: { departmentId, recordedAt: { gte: period.from, lt: period.to } } }),
  ]);
  const steps = [
    { label: t("dash.sec.step1"), hint: t("dash.sec.step1Hint"), href: "/profile", done: !!me?.avatarUrl },
    { label: t("dash.sec.step2"), hint: t("dash.sec.step2Hint"), href: "/members", done: members + youth > 0 },
    { label: t("dash.sec.step3"), hint: t("dash.sec.step3Hint"), href: "/cms/tin-tuc/new", done: posts > 0 },
  ];
  return (
    <>
      <PageHeader title={t("dash.sec.deptTitle", { name: name ?? "" })} description={period.label}
        actions={isAccount ? <Link href={`/departments/${departmentId}`} className={buttonClass("secondary")}>{t("dash.sec.manage")}</Link> : undefined} />
      {!isAccount && <OnboardingChecklist userId={userId} title={t("dash.sec.welcome", { name: name ?? "" })} steps={steps} />}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-5">
        <Stat label={t("dash.stat.doanVien")} value={members} hint={youth ? t("dash.sec.addYouth", { n: youth }) : undefined} />
        <Stat label={t("dash.stat.visitsToday")} value={visitsToday} hint={t("dash.sec.youVisited")} />
        <Stat label={t("dash.sec.quiet7")} value={quiet.length >= 10 ? "10+" : quiet.length} hint={t("dash.sec.needRemind")} />
        <Stat label={t("dash.sec.totalPoints")} value={formatNumber(points._sum.totalPoints ?? 0)} />
        <Stat label={t("dash.stat.violationsWeek")} value={violationsThisWeek} hint={t("dash.sec.yourDept")} />
      </div>
      <Section title={t("dash.sec.quietTitle")} className="mt-8">
        {quiet.length === 0 ? <p className="text-sm text-muted">{t("dash.sec.allVisited")}</p> : (
          <DataTable>
            <thead><tr><Th>{t("dash.sec.code")}</Th><Th>{t("dash.sec.fullName")}</Th></tr></thead>
            <tbody>{quiet.map((m) => <tr key={m.id}><Td className="font-mono text-[13px]">{m.code}</Td><Td><Link href={`/members/${m.id}`} className="font-medium hover:text-primary">{m.fullName}</Link></Td></tr>)}</tbody>
          </DataTable>
        )}
      </Section>
    </>
  );
}

async function MemberDashboard({ user }: { user: Awaited<ReturnType<typeof requireUser>> }) {
  const t = await getT();
  const locale = await getLocale();
  const period = await thisWeek();
  const isMonitor = user.role === "MONITOR";
  const [member, visit, weekPoints, history, web, violationsThisWeek] = await Promise.all([
    db.member.findUniqueOrThrow({ where: { id: user.memberId! } }),
    visitStatus(user.memberId!),
    db.pointTransaction.aggregate({ where: { memberId: user.memberId!, type: { in: ["GAME", "DAILY", "ACTIVITY"] }, createdAt: { gte: period.from, lt: period.to } }, _sum: { points: true } }),
    db.pointTransaction.findMany({ where: { memberId: user.memberId! }, orderBy: { createdAt: "desc" }, take: 6 }),
    webRanking("week", period.value),
    isMonitor ? db.violation.count({ where: { recordedAt: { gte: period.from, lt: period.to } } }) : Promise.resolve(0),
  ]);
  return (
    <>
      <PageHeader title={t("dash.mem.hello", { name: user.fullName })} description={t("dash.mem.dept", { name: user.departmentName ?? "" })}
        actions={isMonitor ? <Link href="/violations" className={buttonClass()}>{t("dash.mem.record")}</Link> : <Link href="/games" className={buttonClass()}>{t("dash.mem.play")}</Link>} />
      <div className={`grid gap-3 sm:max-w-xl sm:gap-6 ${isMonitor ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
        <Stat label={t("dash.sec.totalPoints")} value={member.totalPoints} />
        <Stat label={t("dash.mem.weekPoints")} value={weekPoints._sum.points ?? 0} />
        <Stat label={t("dash.mem.weekDays")} value={visit.daysThisWeek} />
        {isMonitor && <Stat label={t("dash.stat.violationsWeek")} value={violationsThisWeek} hint={t("dash.stat.wholeSchool")} />}
      </div>
      <Section title={t("dash.mem.recent")} className="mt-8">
        {history.length === 0 ? <EmptyState title={t("dash.mem.noPoints")} description={t("dash.mem.noPointsDesc")} /> : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-white/85">
            {history.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0"><div className="truncate">{p.reason}</div><div className="text-xs text-muted">{formatDateTime(p.createdAt, locale)}</div></div>
                <span className={`font-semibold tabular-nums ${p.points < 0 ? "text-danger" : "text-primary"}`}>{p.points > 0 ? "+" : ""}{p.points}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
      {web && <WebRankingSection data={web} />}
    </>
  );
}
