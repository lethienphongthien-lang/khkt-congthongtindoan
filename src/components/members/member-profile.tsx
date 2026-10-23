import Link from "next/link";
import { TypeBadge } from "@/components/members/type-badge";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatHours } from "@/utils";
import { CompactList } from "@/components/ui/compact-list";
import { Avatar, DataTable, EmptyState, Section, Stat, Td, Th } from "@/components/ui/misc";
import { MemberStatusBadge } from "./member-status";
import { MemberDetailSection } from "@/components/members/member-detail-section";

type M = NonNullable<Awaited<ReturnType<typeof import("@/lib/services/queries").getMemberForUser>>>;

export async function MemberProfile({ member, showAudit, detail, tab = "ho-so", basePath }: { member: M; showAudit?: boolean; /** Tab đang xem: "ho-so" (thông tin và hồ sơ chi tiết) hoặc "hoat-dong" (hoạt động, thành tích, điểm). */ tab?: "ho-so" | "hoat-dong"; /** Đường dẫn trang hiện tại, dùng làm liên kết đổi tab. */ basePath: string; /** Hiện hồ sơ chi tiết (Admin hoặc chính đoàn viên); bí thư không xem phần nhạy cảm. */ detail?: boolean }) {
  const act = tab === "hoat-dong";
  const [points] = await Promise.all([
    act ? db.pointTransaction.findMany({ where: { memberId: member.id }, orderBy: { createdAt: "desc" }, take: 8, include: { createdBy: { select: { fullName: true } } } }) : Promise.resolve([]),
  ]);
  const info: [string, React.ReactNode][] = [
    ["Loại", <TypeBadge key="t" doanVien={member.isDoanVien} />],
    [member.isDoanVien ? "Mã đoàn viên" : "Mã thành viên", <span key="c" className="font-mono">{member.code}</span>],
    ["Chi đoàn", member.department.name],
    ["Khóa", member.cohort ?? "—"],
    ["Ngày sinh", formatDate(member.dateOfBirth)],
    ["Giới tính", member.gender ?? "—"],
    ["Ngày vào Đoàn", member.isDoanVien ? formatDate(member.joinedAt) : "Chưa vào Đoàn"],
    ["Trạng thái", <MemberStatusBadge key="s" status={member.status} locked={member.user.status === "LOCKED"} />],
  ];
  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar name={member.fullName} src={member.avatarUrl} size={64} />
        <div>
          <h2 className="text-lg font-semibold">{member.fullName}</h2>
          <p className="text-sm text-muted">{member.isDoanVien ? "Mã đoàn viên" : "Mã thành viên"}: <span className="font-mono">{member.code}</span></p>
        </div>
      </div>
      <nav className="mt-5 mb-4 flex gap-1 border-b border-border text-sm" aria-label="Nội dung hồ sơ">
        {([["ho-so", "Hồ sơ"], ["hoat-dong", "Hoạt động và điểm"]] as const).map(([k, label]) => (
          <Link key={k} href={k === "ho-so" ? basePath : `${basePath}?tab=${k}`} replace scroll={false} aria-current={tab === k ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 font-medium ${tab === k ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}>{label}</Link>
        ))}
      </nav>
      {tab === "ho-so" && (
        <>
      <Section>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
          {info.map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5">{v}</dd></div>)}
        </dl>
      </Section>
      {detail && <MemberDetailSection memberId={member.id} />}
        </>
      )}
      {tab === "hoat-dong" && (
        <>
      <Section>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-1">
          <Stat label="Tổng điểm" value={member.totalPoints} />
        </div>
      </Section>
      <Section title="Lịch sử điểm gần đây">
        {points.length === 0 ? <EmptyState title="Chưa có giao dịch điểm" /> : (
          <>
          <CompactList items={points.map((p) => ({
            id: p.id, title: p.reason, subtitle: formatDateTime(p.createdAt),
            value: <span className={p.points < 0 ? "text-danger" : "text-primary"}>{p.points > 0 ? "+" : ""}{p.points}</span>,
            details: [["Thời gian", formatDateTime(p.createdAt)], ["Nội dung", p.reason], ["Điểm", `${p.points > 0 ? "+" : ""}${p.points}`],
              ...(showAudit && p.createdBy ? [["Người thực hiện", p.createdBy.fullName] as [string, string]] : [])],
          }))} />
          <div className="max-sm:hidden">
          <DataTable>
            <thead><tr><Th>Thời gian</Th><Th>Nội dung</Th><Th className="text-right">Điểm</Th>{showAudit && <Th>Người thực hiện</Th>}</tr></thead>
            <tbody>{points.map((p) => (
              <tr key={p.id}>
                <Td className="whitespace-nowrap">{formatDateTime(p.createdAt)}</Td><Td>{p.reason}</Td>
                <Td className={`text-right font-medium tabular-nums ${p.points < 0 ? "text-danger" : "text-primary"}`}>{p.points > 0 ? "+" : ""}{p.points}</Td>
                {showAudit && <Td>{p.createdBy?.fullName ?? "—"}</Td>}
              </tr>
            ))}</tbody>
          </DataTable>
          </div>
          </>
        )}
      </Section>
        </>
      )}
    </>
  );
}
