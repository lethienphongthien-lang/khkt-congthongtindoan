import { vapidPublicKey } from "@/lib/push";
import { getSessionUserId, requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { roleLabelOf } from "@/lib/nav";
import { AppShell } from "@/components/layout/app-shell";
import { VisitPing } from "@/components/dashboard/visit-ping";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Nạp người dùng và thông báo song song (1 lượt truy vấn thay vì 2 lượt nối tiếp).
  const uid = await getSessionUserId();
  const [user, rows] = await Promise.all([
    requireUser(),
    // 10 thông báo mới nhất + tổng số chưa đọc trong 1 truy vấn (window function).
    uid
      ? db.$queryRaw<{ id: string; title: string; body: string | null; link: string | null; readAt: Date | null; createdAt: Date; unread: number }[]>`
          SELECT id, title, body, link, "readAt", "createdAt",
                 (COUNT(*) FILTER (WHERE "readAt" IS NULL) OVER ())::int AS unread
          FROM "Notification" WHERE "userId" = ${uid}
          ORDER BY "createdAt" DESC LIMIT 10`
      : Promise.resolve([]),
  ]);
  const unread = rows[0]?.unread ?? 0;
  // Admin: số mục đang chờ xử lý (bài nháp của bí thư + góp ý mới) hiện ở menu "Hàng chờ duyệt"
  const pending = user.role === "ADMIN"
    ? (await db.article.count({ where: { published: false, author: { role: "SECRETARY" } } })) + (await db.feedback.count({ where: { status: "NEW" } })) + (await db.volunteerRequest.count({ where: { status: "PENDING" } }))
    : 0;
  const items = rows;
  return (
    <AppShell
      role={user.role}
      user={{ fullName: user.fullName, avatarUrl: user.avatarUrl }}
      roleLabel={roleLabelOf(user)}
      unread={unread}
      pushKey={vapidPublicKey()}
      badges={pending ? { "/approvals": pending } : undefined}
      notifications={items.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, read: !!n.readAt, createdAt: n.createdAt.toISOString() }))}
    >
      {user.memberId && <VisitPing userId={user.id} />}
      {children}
    </AppShell>
  );
}
