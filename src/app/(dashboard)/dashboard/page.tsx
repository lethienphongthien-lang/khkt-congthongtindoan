import Link from "next/link";
import { viewTotals } from "@/lib/services/insights";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { emulationRanking } from "@/lib/services/emulation";
import { adminOverview } from "@/lib/services/overview";
import { visitStatus, vnDay } from "@/lib/services/visits";
import { webRanking } from "@/lib/services/web-ranking";
import { loadCalendars } from "@/lib/services/school-calendar";
import { currentValue, resolvePeriod } from "@/lib/emulation-period";
import { formatDateTime, formatNumber } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { DataTable, EmptyState, PageHeader, Section, Stat, Td, Th } from "@/components/ui/misc";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { WebRankingSection } from "@/components/emulation/web-ranking-section";
import { ChartCard } from "@/components/charts/chart-card";
import { GradeChart, MonthBars, RankBars } from "@/components/charts/overview-charts";

export const metadata = { title: "Tổng quan" };

const DAY = 86_400_000;

/** Kỳ "tuần này" theo lịch năm học (nếu ngoài thời gian học thì là Tuần 1). */
async function thisWeek() {
  const calendars = await loadCalendars();
  return resolvePeriod("week", currentValue("week", new Date(), calendars), calendars)!;
}

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "ADMIN") return <AdminDashboard />;
  if (user.role === "SECRETARY") return <SecretaryDashboard userId={user.id} departmentId={user.departmentId} name={user.departmentName} memberId={user.memberId} />;
  return <MemberDashboard user={user} />;
}

async function AdminDashboard() {
  const period = await thisWeek();
  const today = vnDay();
  const days = Array.from({ length: 7 }, (_, i) => vnDay(new Date(Date.now() - (6 - i) * DAY)));
  const [o, emulation, web, perDay, activated, accounts, views] = await Promise.all([
    adminOverview(),
    emulationRanking(period),
    webRanking("week", period.value),
    db.dailyCheckin.groupBy({ by: ["day"], where: { day: { in: days } }, _count: true }),
    db.member.count({ where: { status: "ACTIVE", department: { isTeacher: false, graduatedAt: null }, user: { mustChangePassword: false } } }),
    db.member.count({ where: { status: "ACTIVE", department: { isTeacher: false, graduatedAt: null } } }),
    viewTotals(),
  ]);
  const pct = o.students ? Math.round((o.doanVien / o.students) * 100) : 0;
  const visitBy = new Map(perDay.map((r) => [r.day, r._count]));
  const visitsToday = visitBy.get(today) ?? 0;
  const visitTrend = days.map((d) => ({ month: `${d.slice(8, 10)}/${d.slice(5, 7)}`, value: visitBy.get(d) ?? 0 }));
  const lowRate = [...o.depts].filter((d) => d.total > 0).sort((a, b) => a.rate - b.rate || a.name.localeCompare(b.name, "vi", { numeric: true })).slice(0, 10)
    .map((d) => ({ name: d.name, value: d.rate, note: `${d.doanVien}/${d.total} học sinh` }));
  const top = emulation.filter((r) => r.total > 0).slice(0, 8).map((r) => ({ name: r.name, value: Math.round(r.total * 10) / 10, note: `${r.members} đoàn viên` }));
  const gTotal = o.gender.male + o.gender.female + o.gender.other;
  const gShare = (n: number) => (gTotal ? (n / gTotal) * 100 : 0);
  return (
    <>
      <PageHeader title="Tổng quan" description={`Số liệu toàn trường · ${period.label}`} />
      {(o.pendingArticles > 0 || o.newFeedback > 0) && (
        <div className="mb-5 flex flex-wrap gap-2 text-sm">
          {o.pendingArticles > 0 && <Link href="/approvals" className="inline-flex items-center gap-2 rounded-md bg-warning-light px-3 py-1.5 font-medium text-warning hover:opacity-90"><span className="size-2 rounded-full bg-current" />{o.pendingArticles} bài chờ duyệt</Link>}
          {o.newFeedback > 0 && <Link href="/feedback" className="inline-flex items-center gap-2 rounded-md bg-primary-light px-3 py-1.5 font-medium text-primary hover:opacity-90"><span className="size-2 rounded-full bg-current" />{o.newFeedback} góp ý mới</Link>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Học sinh" value={formatNumber(o.students)} hint={`${o.departments} Chi đoàn đang học`} />
        <Stat label="Đoàn viên" value={formatNumber(o.doanVien)} hint={`${pct}% học sinh`} />
        <Stat label="Thanh niên" value={formatNumber(o.thanhNien)} hint="Chưa vào Đoàn" />
        <Stat label="Truy cập hôm nay" value={formatNumber(visitsToday)} hint="Số đoàn viên đã vào hệ thống" />
        <Stat label="Tài khoản đã kích hoạt" value={`${formatNumber(activated)}/${formatNumber(accounts)}`} hint="Đã đổi mật khẩu tạm" />
        <Stat label="Lượt xem bài viết" value={formatNumber(views.total)} hint={`${formatNumber(views.thisWeek)} lượt trong tuần này`} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Truy cập 7 ngày gần nhất" subtitle="Số đoàn viên vào hệ thống mỗi ngày (mỗi ngày được +1 điểm)" empty={visitTrend.every((v) => v.value === 0) ? "Chưa có lượt truy cập nào" : undefined}>
          <MonthBars data={visitTrend} series="Đoàn viên truy cập" unit=" người" />
        </ChartCard>
        <ChartCard title="Cơ cấu theo khối" subtitle="Số đoàn viên và thanh niên của từng khối" empty={o.students === 0 ? "Chưa có học sinh" : undefined}>
          <GradeChart data={o.byGrade} />
        </ChartCard>
        <ChartCard title="Chi đoàn cần phát triển đoàn viên" subtitle="10 Chi đoàn có tỷ lệ đoàn viên thấp nhất (đoàn viên / học sinh)" empty={lowRate.length === 0 ? "Chưa có dữ liệu" : undefined}>
          <RankBars data={lowRate} unit="%" series="Tỷ lệ đoàn viên" max={100} />
        </ChartCard>
        <ChartCard title="Thi đua tuần này" subtitle="Chi đoàn dẫn đầu theo điểm thi đua do Ban chấp hành ghi nhận" empty={top.length === 0 ? "Chưa có điểm thi đua trong tuần" : undefined}>
          <RankBars data={top} unit=" điểm" series="Điểm thi đua" color="var(--chart-2)" />
        </ChartCard>
        <ChartCard title="Kết nạp đoàn viên mới" subtitle="Số đoàn viên có ngày vào Đoàn trong từng tháng" empty={o.joinTrend.every((j) => j.value === 0) ? "Chưa có ai kết nạp trong 6 tháng qua" : undefined}>
          <MonthBars data={o.joinTrend} series="Đoàn viên mới" unit=" người" />
        </ChartCard>
        <ChartCard title="Cơ cấu giới tính" subtitle="Toàn bộ học sinh đang sinh hoạt" empty={o.gender.male + o.gender.female === 0 ? "Chưa ghi giới tính trong hồ sơ đoàn viên" : undefined}>
          <div className="space-y-4 pt-2">
            <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded-md" role="img" aria-label={`Nam ${o.gender.male}, nữ ${o.gender.female}, khác hoặc chưa ghi ${o.gender.other}`}>
              {o.gender.male > 0 && <div style={{ width: `${gShare(o.gender.male)}%`, background: "var(--chart-1)" }} />}
              {o.gender.female > 0 && <div style={{ width: `${gShare(o.gender.female)}%`, background: "var(--chart-2)" }} />}
              {o.gender.other > 0 && <div style={{ width: `${gShare(o.gender.other)}%`, background: "var(--color-slate-300)" }} />}
            </div>
            <ul className="grid grid-cols-3 gap-3 text-sm">
              {([["Nam", o.gender.male, "var(--chart-1)"], ["Nữ", o.gender.female, "var(--chart-2)"], ["Khác / chưa ghi", o.gender.other, "var(--color-slate-300)"]] as const).map(([label, n, color]) => (
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

async function SecretaryDashboard({ userId, departmentId, name, memberId }: { userId: string; departmentId: string | null; name: string | null; memberId: string | null }) {
  if (!departmentId) {
    return <><PageHeader title="Tổng quan" /><EmptyState title="Bạn chưa được phân công Chi đoàn" description="Liên hệ quản trị viên để được phân công." /></>;
  }
  const period = await thisWeek();
  const today = vnDay();
  const weekAgo = vnDay(new Date(Date.now() - 6 * DAY));
  const [members, youth, points, visitsToday, quiet, me, posts] = await Promise.all([
    db.member.count({ where: { departmentId, status: "ACTIVE", isDoanVien: true } }),
    db.member.count({ where: { departmentId, status: "ACTIVE", isDoanVien: false } }),
    db.member.aggregate({ where: { departmentId }, _sum: { totalPoints: true } }),
    db.dailyCheckin.count({ where: { day: today, member: { departmentId } } }),
    // Đoàn viên chưa vào hệ thống trong 7 ngày gần nhất (để Bí thư nhắc)
    db.member.findMany({ where: { departmentId, status: "ACTIVE", dailyCheckins: { none: { day: { gte: weekAgo } } } }, orderBy: { fullName: "asc" }, take: 10, select: { id: true, code: true, fullName: true } }),
    memberId ? db.member.findUnique({ where: { id: memberId }, select: { avatarUrl: true } }) : Promise.resolve(null),
    db.article.count({ where: { authorId: userId } }),
  ]);
  const steps = [
    { label: "Cập nhật ảnh đại diện", hint: "Để đoàn viên nhận ra bạn", href: "/profile", done: !!me?.avatarUrl },
    { label: "Kiểm tra danh sách đoàn viên", hint: "Xem Chi đoàn đã đủ thành viên chưa", href: "/members", done: members + youth > 0 },
    { label: "Đăng bài đầu tiên", hint: "Bài sẽ chờ Admin duyệt rồi hiện ở cổng thông tin", href: "/cms/tin-tuc/new", done: posts > 0 },
  ];
  return (
    <>
      <PageHeader title={`Chi đoàn ${name}`} description={period.label} />
      <OnboardingChecklist userId={userId} title={`Chào bạn! Bắt đầu với Chi đoàn ${name}`} steps={steps} />
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Stat label="Đoàn viên" value={members} hint={youth ? `Thêm ${youth} thanh niên` : undefined} />
        <Stat label="Truy cập hôm nay" value={visitsToday} hint="Số bạn đã vào hệ thống" />
        <Stat label="Chưa vào 7 ngày" value={quiet.length >= 10 ? "10+" : quiet.length} hint="Bạn cần nhắc" />
        <Stat label="Tổng điểm" value={formatNumber(points._sum.totalPoints ?? 0)} />
      </div>
      <Section title="Bạn chưa vào hệ thống trong 7 ngày qua" className="mt-8">
        {quiet.length === 0 ? <p className="text-sm text-muted">Tất cả đoàn viên đã vào hệ thống trong 7 ngày qua.</p> : (
          <DataTable>
            <thead><tr><Th>Mã</Th><Th>Họ tên</Th></tr></thead>
            <tbody>{quiet.map((m) => <tr key={m.id}><Td className="font-mono text-[13px]">{m.code}</Td><Td><Link href={`/members/${m.id}`} className="font-medium hover:text-primary">{m.fullName}</Link></Td></tr>)}</tbody>
          </DataTable>
        )}
      </Section>
    </>
  );
}

async function MemberDashboard({ user }: { user: Awaited<ReturnType<typeof requireUser>> }) {
  const period = await thisWeek();
  const [member, visit, weekPoints, history, web] = await Promise.all([
    db.member.findUniqueOrThrow({ where: { id: user.memberId! } }),
    visitStatus(user.memberId!),
    db.pointTransaction.aggregate({ where: { memberId: user.memberId!, type: { in: ["GAME", "DAILY", "ACTIVITY"] }, createdAt: { gte: period.from, lt: period.to } }, _sum: { points: true } }),
    db.pointTransaction.findMany({ where: { memberId: user.memberId! }, orderBy: { createdAt: "desc" }, take: 6 }),
    webRanking("week", period.value),
  ]);
  return (
    <>
      <PageHeader title={`Xin chào, ${user.fullName}`} description={`Chi đoàn ${user.departmentName}`}
        actions={<Link href="/games" className={buttonClass()}>Chơi trò chơi tích điểm</Link>} />
      <div className="grid grid-cols-3 gap-3 sm:max-w-xl sm:gap-6">
        <Stat label="Tổng điểm" value={member.totalPoints} />
        <Stat label="Điểm tuần này" value={weekPoints._sum.points ?? 0} />
        <Stat label="Ngày truy cập tuần này" value={visit.daysThisWeek} />
      </div>
      <Section title="Điểm gần đây" className="mt-8">
        {history.length === 0 ? <EmptyState title="Chưa có điểm" description="Chơi trò chơi hoặc vào hệ thống mỗi ngày để tích điểm." /> : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-white/85">
            {history.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0"><div className="truncate">{p.reason}</div><div className="text-xs text-muted">{formatDateTime(p.createdAt)}</div></div>
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
