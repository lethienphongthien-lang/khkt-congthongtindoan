import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { roleLabelOf } from "@/lib/nav";
import { pageParam } from "@/utils";
import { sharedTeachers } from "@/lib/services/edu-integration";
import { Tabs } from "@/components/ui/tabs";
import { Avatar,DataTable,EmptyState,PageHeader,Pagination,StatusBadge,Td,Th } from "@/components/ui/misc";
import { AccountFilter } from "@/components/settings/account-filter";
import { LeaderManager } from "@/components/settings/leader-manager";
import { ClassPasswordManager } from "@/components/settings/class-password-manager";
const tabs=["accounts","personnel","security"] as const;
export async function generateMetadata() { const t = await getT(); return { title: t("acc.title") }; }
export default async function AccountsPage({searchParams}:{searchParams:Promise<{tab?:string;q?:string;status?:string;page?:string}>}) {
  const me=await requireRole(["ADMIN"]),sp=await searchParams,t=await getT();
  const tabLabel={accounts:t("acc.tabAccounts"),personnel:t("acc.tabPersonnel"),security:t("acc.tabSecurity")};
  const tab=tabs.find((key)=>key===sp.tab)??"accounts";
  const q=sp.q?.trim()??"";
  return <div className="space-y-4"><PageHeader title={t("acc.title")} /><Tabs items={tabs.map((key)=>[`/accounts?tab=${key}`,tabLabel[key]])} current={`/accounts?tab=${tab}`} label={t("acc.title")} />
    {tab==="accounts"&&await(async()=>{
      const page=pageParam(sp.page),take=20;
      const where:Prisma.UserWhereInput={NOT:{member:{is:{deletedAt:{not:null}}}},...(q?{OR:[{fullName:{contains:q,mode:"insensitive"}},{username:{contains:q,mode:"insensitive"}}]}:{}),...(sp.status==="ACTIVE"||sp.status==="LOCKED"?{status:sp.status}:{})};
      const [rows,total]=await Promise.all([db.user.findMany({where,orderBy:{fullName:"asc"},skip:(page-1)*take,take,select:{id:true,fullName:true,username:true,role:true,superAdmin:true,position:true,status:true,member:{select:{id:true,isDoanVien:true}}}}),db.user.count({where})]);
      return <><AccountFilter q={q} status={sp.status??""} />
      <DataTable><thead><tr><Th>{t("acc.tabAccounts")}</Th><Th>{t("acc.role")}</Th><Th>{t("members.f.status")}</Th><Th className="text-right">{t("acc.details")}</Th></tr></thead><tbody>{rows.map(u=><tr key={u.id}><Td><div className="flex items-center gap-2.5"><Avatar name={u.fullName} /><div><p className="font-medium">{u.fullName}</p><p className="text-xs text-muted">{u.username}</p></div></div></Td><Td>{roleLabelOf({...u,isDoanVien:u.member?.isDoanVien})}</Td><Td><StatusBadge tone={u.status==="ACTIVE"?"green":"red"}>{u.status==="ACTIVE"?t("acc.active"):t("acc.locked")}</StatusBadge></Td><Td className="text-right">{u.superAdmin?<span className="text-xs text-muted">{t("acc.protected")}</span>:u.member?<Link className="text-sm text-primary hover:underline" href={`/members/${u.member.id}`}>{t("acc.profile")}</Link>:u.role === "EXTERNAL" ? <span className="text-xs text-muted">{t("acc.eduManaged")}</span> : u.role === "DEPARTMENT_ACCOUNT" ? <Link className="text-sm text-primary hover:underline" href="/departments">{t("members.f.dept")}</Link> : <Link className="text-sm text-primary hover:underline" href="/accounts?tab=personnel">{tabLabel.personnel}</Link>}</Td></tr>)}</tbody></DataTable>
      {!rows.length&&<EmptyState title={t("acc.notFound")} />}<Pagination page={page} pageSize={take} total={total} basePath="/accounts" params={{tab,q,status:sp.status}} /></>;
    })()}
    {tab==="personnel"&&await(async()=>{
      const [staff,leaders]=await Promise.all([sharedTeachers(),db.user.findMany({where:{role:"ADMIN",superAdmin:false},orderBy:{createdAt:"asc"},select:{id:true,fullName:true,username:true,position:true,status:true,lastLoginAt:true}})]);
      const appointed=new Set(leaders.map(l=>l.id)),available=staff.filter(s=>!appointed.has(s.accountId));
      return <div className="space-y-6">{me.superAdmin?<LeaderManager staff={staff} leaders={leaders.map(l=>({...l,lastLoginAt:l.lastLoginAt?.toISOString()??null}))} />:<section className="space-y-3"><h2 className="font-semibold">{t("acc.exec")}</h2><DataTable><thead><tr><Th>{t("acc.fullName")}</Th><Th>{t("acc.positionTitle")}</Th><Th>{t("members.f.status")}</Th></tr></thead><tbody>{leaders.map(l=><tr key={l.id}><Td>{l.fullName}</Td><Td>{l.position??"BCH"}</Td><Td><StatusBadge tone={l.status==="ACTIVE"?"green":"red"}>{l.status==="ACTIVE"?t("acc.active"):t("acc.locked")}</StatusBadge></Td></tr>)}</tbody></DataTable></section>}
      {!!available.length&&<section className="space-y-3"><h2 className="font-semibold">{t("acc.unassignedTeachers")}</h2><DataTable><thead><tr><Th>{t("acc.teacher")}</Th><Th>{t("acc.tabAccounts")}</Th><Th>{t("members.f.status")}</Th></tr></thead><tbody>{available.map(s=><tr key={s.accountId}><Td>{s.fullName}</Td><Td>{s.username}</Td><Td><StatusBadge tone={s.eligible?"green":"gray"}>{s.eligible?t("acc.active"):t("acc.locked")}</StatusBadge></Td></tr>)}</tbody></DataTable></section>}
      </div>;
    })()}
    {tab==="security"&&await(async()=>{
      const classes=await db.department.findMany({where:{graduatedAt:null},select:{id:true,name:true,account:{select:{status:true}},_count:{select:{members:{where:{status:"ACTIVE",user:{status:"ACTIVE"}}}}}}});
      const opts=classes.map(c=>({id:c.id,name:c.name,count:c._count.members,hasAccount:c.account?.status==="ACTIVE"})).sort((a,b)=>a.name.localeCompare(b.name,"vi"));
      return <div className="space-y-4"><section className="space-y-3 rounded-lg border border-border bg-white/85 p-4"><h2 className="font-semibold">{t("acc.resetMembers")}</h2><ClassPasswordManager classes={opts} /></section><section className="space-y-3 rounded-lg border border-border bg-white/85 p-4"><h2 className="font-semibold">{t("acc.resetAccounts")}</h2><ClassPasswordManager mode="account" classes={opts} /></section></div>;
    })()}
  </div>;
}
