import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/lib/auth/session";
import { getMemberForUser } from "@/lib/services/queries";
import { PageHeader, Section } from "@/components/ui/misc";
import { MemberProfile } from "@/components/members/member-profile";
import { MemberCard } from "@/components/members/member-card";
import { AvatarEditor } from "@/components/members/avatar-editor";
import { EditOwnProfileButton } from "@/components/members/edit-own-profile";
import { toDateInput } from "@/utils";

export async function generateMetadata() { return { title: (await getT())("dash.profile.title") }; }

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const t = await getT();
  const user = await requireUser();
  const tab = (await searchParams).tab === "hoat-dong" ? "hoat-dong" : "ho-so";
  if (!user.memberId) redirect("/dashboard");
  const member = await getMemberForUser(user, user.memberId);
  if (!member) redirect("/dashboard");
  return (
    <>
      <PageHeader title={t("dash.profile.header")} actions={<EditOwnProfileButton initial={{ fullName: member.fullName, gender: member.gender ?? "", dateOfBirth: toDateInput(member.dateOfBirth), joinedAt: toDateInput(member.joinedAt) }} doanVien={member.isDoanVien} />} />
      <MemberProfile member={member} detail tab={tab} basePath="/profile" />
      {tab === "ho-so" && <Section title={member.isDoanVien ? t("dash.profile.cardDoan") : t("dash.profile.cardYouth")} actions={<AvatarEditor />}>
        <MemberCard fullName={member.fullName} code={member.code} department={member.department.name} className={member.class.name}
          avatarUrl={member.avatarUrl} qrToken={member.qrToken} doanVien={member.isDoanVien} />
        <p className="mt-2 text-xs text-muted">{t("dash.profile.qrNote")}</p>
      </Section>}
    </>
  );
}
