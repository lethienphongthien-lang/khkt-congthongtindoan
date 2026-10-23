import "server-only";
import { db } from "@/lib/db";

/** Chính sách giữ dữ liệu (ngày). Điểm, lượt truy cập, báo cáo... là dữ liệu lâu dài nên KHÔNG bị xóa. */
export const RETENTION = {
  notificationRead: 7, // thông báo đã đọc
  notificationAny: 14, // thông báo chưa đọc quá cũ
  auditLog: 120, // nhật ký hệ thống
} as const;

const ago = (days: number) => new Date(Date.now() - days * 86400_000);

/** Xóa thông báo và nhật ký cũ để database không phình mãi. Chạy lại bao nhiêu lần cũng được. */
export async function runCleanup() {
  const [readNotif, oldNotif, audit] = await Promise.all([
    db.notification.deleteMany({ where: { readAt: { not: null, lt: ago(RETENTION.notificationRead) } } }),
    db.notification.deleteMany({ where: { createdAt: { lt: ago(RETENTION.notificationAny) } } }),
    db.auditLog.deleteMany({ where: { createdAt: { lt: ago(RETENTION.auditLog) } } }),
  ]);
  return { notifications: readNotif.count + oldNotif.count, auditLogs: audit.count };
}

/** Dung lượng database hiện tại + các bảng lớn nhất (cho Admin theo dõi). */
export async function storageStats() {
  const [total, tables] = await Promise.all([
    db.$queryRaw<{ bytes: bigint }[]>`SELECT pg_database_size(current_database()) AS bytes`,
    db.$queryRaw<{ name: string; rows: bigint; bytes: bigint }[]>`SELECT relname AS name, n_live_tup AS rows, pg_total_relation_size(relid) AS bytes FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 8`,
  ]);
  return { totalBytes: Number(total[0]?.bytes ?? 0), tables: tables.map((t) => ({ name: t.name, rows: Number(t.rows), bytes: Number(t.bytes) })) };
}
