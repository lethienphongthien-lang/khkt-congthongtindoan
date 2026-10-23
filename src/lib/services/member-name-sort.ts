import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const collator = new Intl.Collator("vi", { sensitivity: "accent", numeric: true });

/** So sánh theo cách sắp danh sách của người Việt: theo TÊN (từ cuối) trước, rồi họ và tên đệm; không phân biệt hoa/thường, đúng thứ tự bảng chữ cái tiếng Việt (A, Ă, Â, B…). */
export function compareVietnameseNames(a: string, b: string) {
  const split = (s: string) => { const w = s.trim().split(/\s+/); return { given: w[w.length - 1] ?? "", rest: w.slice(0, -1).join(" ") }; };
  const x = split(a), y = split(b);
  return collator.compare(x.given, y.given) || collator.compare(x.rest, y.rest) || collator.compare(a, b);
}

/** Danh sách id đoàn viên (theo bộ lọc) đã xếp theo tên A→Z (hoặc Z→A). Nhẹ: chỉ lấy id và họ tên. */
export async function memberIdsByName(where: Prisma.MemberWhereInput, desc = false): Promise<string[]> {
  const rows = await db.member.findMany({ where, select: { id: true, fullName: true }, take: 5000 });
  rows.sort((p, q) => (desc ? -1 : 1) * compareVietnameseNames(p.fullName, q.fullName));
  return rows.map((r) => r.id);
}

/** Đưa các bản ghi đã lấy theo `id in (...)` về đúng thứ tự trang. */
export function inOrder<T extends { id: string }>(rows: T[], ids: string[]): T[] {
  const m = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => (m.has(id) ? [m.get(id)!] : []));
}
