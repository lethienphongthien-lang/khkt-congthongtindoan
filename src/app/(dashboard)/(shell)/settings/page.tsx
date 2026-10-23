import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { roleLabelOf } from "@/lib/nav";
import { formatDateTime } from "@/utils";
import { DataTable, PageHeader, Td, Th } from "@/components/ui/misc";
import { settingsGroups } from "@/components/settings/settings-shell";
import { Avatar } from "@/components/ui/misc";
import { AvatarEditor } from "@/components/members/avatar-editor";
import { NameForm } from "@/components/members/name-form";
import { Award, BookOpen, Globe, Megaphone, Puzzle, Bell, CalendarRange, Database, FolderCog, Fingerprint, History, KeyRound, ListChecks, ShieldCheck, UserRound } from "lucide-react";
import { RETENTION, storageStats } from "@/lib/services/cleanup";
import { cloudinaryUsage } from "@/lib/cloudinary";
import { DataManager } from "@/components/settings/data-manager";
import { loadCalendars } from "@/lib/services/school-calendar";
import { LeaderManager } from "@/components/settings/leader-manager";
import { PasskeyManager } from "@/components/settings/passkey-manager";
import { ClassPasswordManager } from "@/components/settings/class-password-manager";
import { SchoolYearManager } from "@/components/settings/school-year-manager";
import { NotificationControls } from "@/components/notifications/controls";
import { ChangePasswordForm } from "@/components/members/change-password-form";
import { CategoryTable } from "@/components/cms/category-manager";
import { GameCapForm } from "@/components/games/quiz-admin";
import { getGameCap } from "@/lib/services/games";

export const metadata = { title: "Cài đặt" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const admin = user.role === "ADMIN";
  const groups = settingsGroups(user);
  const tabs = groups.flatMap((g) => g.items).filter((i) => i.key) as { key: string; label: string }[];
  const requested = (await searchParams).tab;
  const tab = tabs.some((t) => t.key === requested) ? requested! : "account";

  // Chỉ nạp dữ liệu của tab đang mở.
  const planCats = admin && tab === "plancats" ? await db.articleCategory.findMany({ where: { kind: "PLAN" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { articles: true } } } }) : [];
  const gameCap = admin && tab === "gamecap" ? await getGameCap() : 10;
  const customYears = admin && tab === "schoolyear" ? new Set((await db.schoolYear.findMany({ select: { startYear: true } })).map((r) => r.startYear)) : new Set<number>();
  const calendars = admin && tab === "schoolyear" ? await loadCalendars() : [];
  const passkeys = tab === "passkey" ? await db.passkey.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, select: { id: true, deviceName: true, createdAt: true, lastUsedAt: true } }) : [];
  const leaders = user.superAdmin && tab === "leaders" ? await db.user.findMany({ where: { role: "ADMIN", superAdmin: false }, orderBy: { createdAt: "asc" }, select: { id: true, fullName: true, username: true, position: true, status: true, lastLoginAt: true } }) : [];
  const classes = admin && tab === "classpw" ? await db.department.findMany({ where: { graduatedAt: null }, select: { id: true, name: true, _count: { select: { members: { where: { status: "ACTIVE", user: { status: "ACTIVE" } } } } } } }) : [];
  const [storage, cloud] = admin && tab === "data" ? await Promise.all([storageStats(), cloudinaryUsage()]) : [null, null];

  return (
    <>
      <PageHeader title="Cài đặt" />

      {tab === "account" && (
        <>
        <div className="mb-5 flex items-center gap-4">
          <Avatar name={user.fullName} src={user.avatarUrl} size={72} />
          <div>
            <p className="mb-2 font-semibold">{user.fullName}</p>
            <AvatarEditor label="Đổi ảnh đại diện" />
          </div>
        </div>
        {admin && <NameForm initial={user.fullName} />}
        <dl className="grid max-w-md grid-cols-[130px_1fr] gap-y-2 text-sm">
          {!admin && <><dt className="text-muted">Họ tên</dt><dd>{user.fullName}</dd></>}
          <dt className="text-muted">Tên đăng nhập</dt><dd className="font-mono">{user.username}</dd>
          {user.memberCode && <><dt className="text-muted">Mã đoàn viên</dt><dd className="font-mono">{user.memberCode}</dd></>}
          <dt className="text-muted">Vai trò</dt><dd>{roleLabelOf(user)}</dd>
          {user.departmentName && <><dt className="text-muted">Chi đoàn</dt><dd>{user.departmentName}</dd></>}
        </dl>
        </>
      )}

      {tab === "notifications" && <div className="max-w-sm"><NotificationControls /></div>}

      {tab === "password" && <div className="max-w-sm"><ChangePasswordForm /></div>}

      {tab === "leaders" && user.superAdmin && <LeaderManager leaders={leaders.map((l) => ({ ...l, lastLoginAt: l.lastLoginAt?.toISOString() ?? null }))} />}

      {tab === "passkey" && <PasskeyManager items={passkeys.map((p) => ({ id: p.id, deviceName: p.deviceName, createdAt: p.createdAt.toISOString(), lastUsedAt: p.lastUsedAt?.toISOString() ?? null }))} />}

      {tab === "classpw" && admin && <ClassPasswordManager classes={classes.map((c) => ({ id: c.id, name: c.name, count: c._count.members })).sort((a, b) => a.name.localeCompare(b.name, "vi", { numeric: true }))} />}

      {tab === "schoolyear" && <SchoolYearManager rows={calendars.map((c) => ({ ...c, custom: customYears.has(c.startYear) }))} />}

      {tab === "plancats" && admin && <CategoryTable kind="PLAN" label="Kế hoạch" categories={planCats.map((c) => ({ id: c.id, name: c.name, count: c._count.articles }))} />}

      {tab === "gamecap" && admin && (
        <>
          <p className="mb-3 text-sm text-muted">Quy định cách tính điểm khi đoàn viên chơi trò chơi tích điểm (soạn trò chơi ở mục Thi đua & trò chơi → Trò chơi tích điểm).</p>
          <div className="rounded-lg border border-border bg-white/85 p-4"><GameCapForm cap={gameCap} /></div>
        </>
      )}

      {tab === "data" && storage && <DataManager cloud={cloud ?? { error: "" }} totalBytes={storage.totalBytes} tables={storage.tables} retention={RETENTION} />}

    </>
  );
}
