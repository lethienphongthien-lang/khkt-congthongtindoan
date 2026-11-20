import { getCurrentUser } from "@/lib/auth/session";
import { PageTitle } from "@/components/public/blocks";
import { ConfessionFeed } from "@/components/confession/confession-feed";
import { listApprovedConfessions } from "@/lib/services/confessions";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT())("menu.g-confession") };
}
export const dynamic = "force-dynamic";

export default async function ConfessionPage() {
  const t = await getT();
  const [user, first] = await Promise.all([getCurrentUser(), listApprovedConfessions(0)]);
  return (
    <>
      <PageTitle title={t("menu.g-confession")} description={t("community.conf.desc")} />
      <ConfessionFeed items={first.items} hasMore={first.hasMore} isAdmin={user?.role === "ADMIN"} loggedIn={!!user} />
    </>
  );
}
