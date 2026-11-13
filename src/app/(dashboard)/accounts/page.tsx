import Link from "next/link";
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
const tabs=[["accounts","Tài khoản"],["personnel","Nhân sự & BCH"],["security","Bảo mật"]] as const;
export const metadata={title:"Tài khoản & Nhân sự"};
export default async function AccountsPage({searchParams}:{searchParams:Promise<{tab?:string;q?:string;status?:string;page?:string}>}) {
  const me=await requireRole(["ADMIN"]),sp=await searchParams;
  const tab=tabs.some(([key])=>key===sp.tab)?sp.tab!:"accounts";
  const q=sp.q?.trim()??"";
  return <div className="space-y-4"><PageHeader title="Tài khoản & Nhân sự" /><Tabs items={tabs.map(([key,label])=>[`/accounts?tab=${key}`,label])} current={`/accounts?tab=${tab}`} label="Tài khoản & Nhân sự" />
    {tab==="accounts"&&await(async()=>{
      const page=pageParam(sp.page),take=20;
      const where:Prisma.UserWhereInput={NOT:{member:{is:{deletedAt:{not:null}}}},...(q?{OR:[{fullName:{contains:q,mode:"insensitive"}},{username:{contains:q,mode:"insensitive"}}]}:{}),...(sp.status==="ACTIVE"||sp.status==="LOCKED"?{status:sp.status}:{})};
      const [rows,total]=await Promise.all([db.user.findMany({where,orderBy:{fullName:"asc"},skip:(page-1)*take,take,select:{id:true,fullName:true,username:true,role:true,superAdmin:true,position:true,status:true,member:{select:{id:true,isDoanVien:true}}}}),db.user.count({where})]);
      return <><AccountFilter q={q} status={sp.status??""} />
      <DataTable><thead><tr><Th>Tài khoản</Th><Th>Vai trò</Th><Th>Trạng thái</Th><Th className="text-right">Chi tiết</Th></tr></thead><tbody>{rows.map(u=><tr key={u.id}><Td><div className="flex items-center gap-2.5"><Avatar name={u.fullName} /><div><p className="font-medium">{u.fullName}</p><p className="text-xs text-muted">{u.username}</p></div></div></Td><Td>{roleLabelOf({...u,isDoanVien:u.member?.isDoanVien})}</Td><Td><StatusBadge tone={u.status==="ACTIVE"?"green":"red"}>{u.status==="ACTIVE"?"Hoạt động":"Đã khóa"}</StatusBadge></Td><Td className="text-right">{u.superAdmin?<span className="text-xs text-muted">Quyền được bảo vệ</span>:u.member?<Link className="text-sm text-primary hover:underline" href={`/members/${u.member.id}`}>Hồ sơ</Link>:u.role === "EXTERNAL" ? <span className="text-xs text-muted">Quản lý tại EduConnect</span> : u.role === "DEPARTMENT_ACCOUNT" ? <Link className="text-sm text-primary hover:underline" href="/departments">Chi đoàn</Link> : <Link className="text-sm text-primary hover:underline" href="/accounts?tab=personnel">Nhân sự & BCH</Link>}</Td></tr>)}</tbody></DataTable>
      {!rows.length&&<EmptyState title="Không tìm thấy tài khoản" />}<Pagination page={page} pageSize={take} total={total} basePath="/accounts" params={{tab,q,status:sp.status}} /></>;
    })()}
    {tab==="personnel"&&await(async()=>{
      const [staff,leaders]=await Promise.all([sharedTeachers(),db.user.findMany({where:{role:"ADMIN",superAdmin:false},orderBy:{createdAt:"asc"},select:{id:true,fullName:true,username:true,position:true,status:true,lastLoginAt:true}})]);
      const appointed=new Set(leaders.map(l=>l.id)),available=staff.filter(s=>!appointed.has(s.accountId));
      return <div className="space-y-6">{me.superAdmin?<LeaderManager staff={staff} leaders={leaders.map(l=>({...l,lastLoginAt:l.lastLoginAt?.toISOString()??null}))} />:<section className="space-y-3"><h2 className="font-semibold">Ban chấp hành Đoàn trường</h2><DataTable><thead><tr><Th>Họ tên</Th><Th>Chức danh</Th><Th>Trạng thái</Th></tr></thead><tbody>{leaders.map(l=><tr key={l.id}><Td>{l.fullName}</Td><Td>{l.position??"BCH"}</Td><Td><StatusBadge tone={l.status==="ACTIVE"?"green":"red"}>{l.status==="ACTIVE"?"Hoạt động":"Đã khóa"}</StatusBadge></Td></tr>)}</tbody></DataTable></section>}
      {!!available.length&&<section className="space-y-3"><h2 className="font-semibold">Giáo viên chưa phân công BCH</h2><DataTable><thead><tr><Th>Giáo viên</Th><Th>Tài khoản</Th><Th>Trạng thái</Th></tr></thead><tbody>{available.map(s=><tr key={s.accountId}><Td>{s.fullName}</Td><Td>{s.username}</Td><Td><StatusBadge tone={s.eligible?"green":"gray"}>{s.eligible?"Hoạt động":"Đã khóa"}</StatusBadge></Td></tr>)}</tbody></DataTable></section>}
      </div>;
    })()}
    {tab==="security"&&await(async()=>{
      const classes=await db.department.findMany({where:{graduatedAt:null},select:{id:true,name:true,_count:{select:{members:{where:{status:"ACTIVE",user:{status:"ACTIVE"}}}}}}});
      return <section className="space-y-3 rounded-lg border border-border bg-white/85 p-4"><h2 className="font-semibold">Cấp lại mật khẩu theo lớp</h2><ClassPasswordManager classes={classes.map(c=>({id:c.id,name:c.name,count:c._count.members})).sort((a,b)=>a.name.localeCompare(b.name,"vi"))} /></section>;
    })()}
  </div>;
}
