import { getCurrentUser } from "@/lib/auth/session";
import { PageTitle } from "@/components/public/blocks";
import { ConfessionFeed } from "@/components/confession/confession-feed";
import { listApprovedConfessions } from "@/lib/services/confessions";

export const metadata = { title: "Sơn Hà Confession" };
export const dynamic = "force-dynamic";

export default async function ConfessionPage() {
  const [user, first] = await Promise.all([getCurrentUser(), listApprovedConfessions(0)]);
  return (
    <>
      <PageTitle title="Sơn Hà Confession" description="Chia sẻ tâm tư, câu chuyện của bạn một cách ẩn danh. Confession được Ban chấp hành Đoàn trường duyệt trước khi hiện công khai." />
      <ConfessionFeed items={first.items} hasMore={first.hasMore} isAdmin={user?.role === "ADMIN"} loggedIn={!!user} />
    </>
  );
}
