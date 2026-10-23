import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { formatDate, formatDateTime, formatHours, pageParam } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { CompactList } from "@/components/ui/compact-list";
import { DataTable, EmptyState, PageHeader, Pagination, StatusBadge, Td, Th, type Tone } from "@/components/ui/misc";
import { VolunteerApprovedActions, VolunteerRequestActions } from "@/components/volunteer/request-actions";

export const metadata = { title: "Tình nguyện" };
const PAGE_SIZE = 15;
const STATUS: Record<string, { label: string; tone: Tone }> = { PENDING: { label: "Chờ duyệt", tone: "amber" }, APPROVED: { label: "Đã duyệt, chờ hoàn thành", tone: "blue" }, COMPLETED: { label: "Đã hoàn thành", tone: "green" }, REJECTED: { label: "Bị từ chối", tone: "red" } };

/** Các đăng ký tình nguyện: bí thư xem của Chi đoàn mình (chờ duyệt, đã duyệt, bị từ chối); Admin xem của mọi Chi đoàn và duyệt ngay tại đây hoặc ở Hàng chờ duyệt. */
export default async function VolunteerPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireRole(["ADMIN", "SECRETARY"]);
  const admin = user.role === "ADMIN";
  const page = pageParam((await searchParams).page);
  const where = admin ? {} : { departmentId: user.departmentId ?? "__none__" };
  const [rows, total] = await Promise.all([
    db.volunteerRequest.findMany({ where, orderBy: [{ createdAt: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { department: { select: { name: true } } } }),
    db.volunteerRequest.count({ where }),
  ]);
  const detail = (r: (typeof rows)[number]) => r.status === "REJECTED" && r.rejectReason ? `Lý do: ${r.rejectReason}` : "";
  const action = (r: (typeof rows)[number]) => r.status === "PENDING" ? <VolunteerRequestActions id={r.id} task={r.task} admin={admin} />
    : r.status === "APPROVED" ? <VolunteerApprovedActions id={r.id} task={r.task} points={r.points} /> : null;
  return (
    <>
      <PageHeader title="Tình nguyện" description={admin ? "Đăng ký tình nguyện của các Chi đoàn" : `Đăng ký tình nguyện của Chi đoàn ${user.departmentName}. Ban chấp hành duyệt xong thì hiện lên lịch; sau buổi làm việc bạn bấm Hoàn thành để cộng điểm cho cả Chi đoàn.`}
        actions={<Link href="/volunteer/new" className={buttonClass()}><Plus className="size-4" />Đăng ký tình nguyện</Link>} />
      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-white/85"><EmptyState title="Chưa có đăng ký tình nguyện nào" description="Đăng ký công việc như quét sân, vệ sinh khu vực cho cả Chi đoàn. Sau khi Ban chấp hành duyệt và buổi làm việc xong, bạn bấm Hoàn thành để cộng điểm cho cả Chi đoàn."
          action={<Link href="/volunteer/new" className={buttonClass()}>Đăng ký tình nguyện đầu tiên</Link>} /></div>
      ) : (
        <>
          <CompactList items={rows.map((r) => ({ id: r.id, title: r.task, subtitle: `${formatDate(r.startAt)} · Chi đoàn ${r.department.name}`, badge: <StatusBadge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</StatusBadge>,
            details: [["Thời gian", formatDateTime(r.startAt)], ["Địa điểm", r.location], ["Giờ tình nguyện", formatHours(Math.round(r.hours * 60))], ["Điểm", r.points], ["Trạng thái", STATUS[r.status].label], ...(detail(r) ? [["Ghi chú", detail(r)] as [string, string]] : [])],
            actions: action(r) ?? undefined }))} />
          <div className="max-sm:hidden">
            <DataTable>
              <thead><tr><Th>Công việc</Th>{admin && <Th>Chi đoàn</Th>}<Th>Thời gian</Th><Th>Địa điểm</Th><Th className="text-right">Giờ</Th><Th className="text-right">Điểm</Th><Th>Trạng thái</Th><Th /></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium">{r.task}{detail(r) && <div className="text-xs font-normal text-danger">{detail(r)}</div>}{r.note && <div className="text-xs font-normal text-muted">{r.note}</div>}</Td>
                  {admin && <Td>{r.department.name}</Td>}
                  <Td className="whitespace-nowrap">{formatDateTime(r.startAt)}</Td><Td>{r.location}</Td>
                  <Td className="text-right tabular-nums">{r.hours}</Td><Td className="text-right tabular-nums">{r.points}</Td>
                  <Td><StatusBadge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</StatusBadge></Td>
                  <Td className="text-right">{action(r)}</Td>
                </tr>
              ))}</tbody>
            </DataTable>
          </div>
        </>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/volunteer" params={{}} />
    </>
  );
}
