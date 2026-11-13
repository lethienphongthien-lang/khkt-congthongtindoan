import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { roleLabelOf } from "@/lib/nav";
import { Avatar,PageHeader } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { AvatarEditor } from "@/components/members/avatar-editor";
import { NameForm } from "@/components/members/name-form";
import { PasskeyManager } from "@/components/settings/passkey-manager";
import { NotificationControls } from "@/components/notifications/controls";
import { ChangePasswordForm } from "@/components/members/change-password-form";
const tabs=[["account","Hồ sơ"],["security","Bảo mật"],["notifications","Thông báo"]] as const;
export default async function PersonalSettings({searchParams}:{searchParams:Promise<{tab?:string}>}) {
  const user=await requireUser(),sp=await searchParams;
  const tab=tabs.some(([key])=>key===sp.tab)?sp.tab!:"account";
  const passkeys=tab==="security"?await db.passkey.findMany({where:{userId:user.id},orderBy:{createdAt:"asc"},select:{id:true,deviceName:true,createdAt:true,lastUsedAt:true}}):[];
  return <div className="space-y-4"><PageHeader title="Tài khoản cá nhân" /><Tabs current={`?tab=${tab}`} items={tabs.map(([key,label])=>[`?tab=${key}`,label])} label="Tài khoản cá nhân" />
    {tab==="account"&&<><div className="flex items-center gap-4"><Avatar name={user.fullName} src={user.avatarUrl} size={64} /><AvatarEditor label="Đổi ảnh đại diện" /></div>{user.role==="ADMIN"&&<NameForm initial={user.fullName} />}<dl className="grid max-w-xl grid-cols-[140px_1fr] gap-3 rounded-lg border border-border bg-white/85 p-4 text-sm"><dt className="text-muted">Họ tên</dt><dd>{user.fullName}</dd><dt className="text-muted">Tên đăng nhập</dt><dd>{user.username}</dd><dt className="text-muted">Vai trò</dt><dd>{roleLabelOf(user)}</dd>{user.departmentName&&<><dt className="text-muted">Chi đoàn</dt><dd>{user.departmentName}</dd></>}</dl></>}
    {tab==="security"&&<div className="grid items-start gap-5 xl:grid-cols-2"><section className="space-y-3 rounded-lg border border-border bg-white/85 p-4"><h2 className="font-semibold">Đổi mật khẩu</h2><ChangePasswordForm /></section><section className="space-y-3 rounded-lg border border-border bg-white/85 p-4"><h2 className="font-semibold">Đăng nhập nhanh</h2><PasskeyManager items={passkeys.map(p=>({...p,createdAt:p.createdAt.toISOString(),lastUsedAt:p.lastUsedAt?.toISOString()??null}))} /></section></div>}
    {tab==="notifications"&&<NotificationControls />}
  </div>;
}
