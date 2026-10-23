import ExcelJS from "exceljs";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { gradeOf } from "@/lib/member-sort";
import { formatDate } from "@/utils";

const STATUS: Record<string, string> = { ACTIVE: "Đang sinh hoạt", TRANSFERRED: "Đã chuyển sinh hoạt", GRADUATED: "Đã ra trường" };
const nat = (a: string, b: string) => a.localeCompare(b, "vi", { numeric: true });
const sheetName = (name: string, used: Set<string>) => {
  let n = name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Chi đoàn";
  while (used.has(n.toLowerCase())) n = `${n.slice(0, 28)}_${used.size}`;
  used.add(n.toLowerCase()); return n;
};

/** Xuất danh sách đoàn viên/thanh niên ra Excel theo Chi đoàn, áp dụng đúng các bộ lọc đang chọn. Một Chi đoàn: một sheet; nhiều Chi đoàn: sheet "Tổng hợp" + mỗi Chi đoàn một sheet. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword || user.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const q = new URL(req.url).searchParams;
  const obj = q.get("obj"), dept = q.get("dept") || "", khoi = gradeOf(q.get("khoi") ?? undefined), kind = q.get("kind"), status = q.get("status"), cohort = q.get("cohort"), text = (q.get("q") ?? "").trim().slice(0, 100);
  const where: Prisma.MemberWhereInput = {
    AND: [
      obj === "gv" ? { department: { isTeacher: true } } : obj === "hs" ? { department: { isTeacher: false } } : {},
      dept ? { departmentId: dept } : {},
      khoi ? { department: { name: { contains: khoi, mode: "insensitive" } } } : {},
      cohort ? { cohort: Number(cohort) || -1 } : {},
      kind === "doanvien" ? { isDoanVien: true } : kind === "thanhnien" ? { isDoanVien: false } : {},
      status === "LOCKED" ? { user: { status: "LOCKED" } } : status && STATUS[status] ? { status: status as "ACTIVE" } : {},
      text ? { OR: [{ fullName: { contains: text, mode: "insensitive" } }, { code: { contains: text, mode: "insensitive" } }] } : {},
    ],
  };
  const members = await db.member.findMany({ where, orderBy: [{ code: "asc" }], include: { department: { select: { id: true, name: true } }, user: { select: { status: true } } }, take: 5000 });

  const byDept = new Map<string, { name: string; rows: typeof members }>();
  for (const m of members) { const e = byDept.get(m.departmentId) ?? { name: m.department.name, rows: [] }; e.rows.push(m); byDept.set(m.departmentId, e); }
  const groups = [...byDept.values()].sort((a, b) => nat(a.name, b.name));

  const wb = new ExcelJS.Workbook();
  const used = new Set<string>();
  const header = ["STT", "Mã đoàn viên", "Họ tên", "Giới tính", "Ngày sinh", "Chi đoàn", "Khóa", "Loại", "Ngày vào Đoàn", "Trạng thái", "Điểm"];
  const widths = [6, 16, 28, 10, 12, 12, 8, 14, 14, 20, 8];
  const fill = (ws: ExcelJS.Worksheet, rows: typeof members) => {
    ws.columns = header.map((h, i) => ({ header: h, width: widths[i] }));
    rows.forEach((m, i) => ws.addRow([i + 1, m.code, m.fullName, m.gender ?? "", m.dateOfBirth ? formatDate(m.dateOfBirth) : "", m.department.name, m.cohort ?? "", m.isDoanVien ? "Đoàn viên" : "Thanh niên", m.isDoanVien && m.joinedAt ? formatDate(m.joinedAt) : "", m.user.status === "LOCKED" ? "Tài khoản bị khóa" : STATUS[m.status] ?? m.status, m.totalPoints]));
    ws.getRow(1).font = { bold: true }; ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: header.length } };
  };
  if (groups.length > 1) {
    const sum = wb.addWorksheet(sheetName("Tổng hợp", used));
    sum.columns = [{ header: "STT", width: 6 }, { header: "Chi đoàn", width: 16 }, { header: "Học sinh", width: 12 }, { header: "Đoàn viên", width: 12 }, { header: "Thanh niên", width: 12 }];
    groups.forEach((g, i) => sum.addRow([i + 1, g.name, g.rows.length, g.rows.filter((m) => m.isDoanVien).length, g.rows.filter((m) => !m.isDoanVien).length]));
    const t = sum.addRow(["", "Tổng", members.length, members.filter((m) => m.isDoanVien).length, members.filter((m) => !m.isDoanVien).length]);
    t.font = { bold: true }; sum.getRow(1).font = { bold: true };
  }
  if (groups.length === 0) fill(wb.addWorksheet(sheetName("Danh sách", used)), []);
  for (const g of groups) fill(wb.addWorksheet(sheetName(g.name, used)), g.rows);

  const buf = await wb.xlsx.writeBuffer();
  const tag = groups.length === 1 ? `-${groups[0].name.replace(/[^\w-]/g, "")}` : "";
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="danh-sach-doan-vien${tag}.xlsx"`,
    },
  });
}
