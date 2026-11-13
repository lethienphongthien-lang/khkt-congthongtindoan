"use client";
import { usePathname,useRouter,useSearchParams } from "next/navigation";
import type { SessionUser } from "@/lib/auth/session";
import { Tabs } from "@/components/ui/tabs";
const tabs = [["/settings?tab=schoolyear","Năm học"],["/settings?tab=catalogs","Danh mục"],["/settings?tab=rules","Quy chế"],["/cms/settings","Giao diện"],["/settings?tab=data","Hệ thống"]] as const;
const website = [["/cms/settings","Thông tin website"],["/cms/menu","Menu"],["/cms/marquee","Dòng chữ chạy"],["/cms/pages","Trang giới thiệu"]] as const;
/** One full-width content area, five primary tabs; no second sidebar. */
export function SettingsShell({ user,children }: { user: Pick<SessionUser,"role"|"superAdmin">; children: React.ReactNode }) {
  const pathname=usePathname(),sp=useSearchParams(),router=useRouter();
  if(user.role!=="ADMIN"||pathname.startsWith("/settings/profile")) return <>{children}</>;
  const isWebsite=pathname.startsWith("/cms/");
  const requested=sp.get("tab")??"schoolyear";
  const tab=["schoolyear","catalogs","rules","data"].includes(requested)?requested:"schoolyear";
  const current=isWebsite?"/cms/settings":`/settings?tab=${tab}`;
  const sub=website.find(([href])=>pathname===href||pathname.startsWith(href+"/"))?.[0]??"/cms/settings";
  return <div className="min-w-0 space-y-4"><h1 className="text-xl font-semibold">Cấu hình & Cài đặt</h1><Tabs items={tabs} current={current} label="Cấu hình & Cài đặt" />{isWebsite&&<div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-sm text-muted">Mục giao diện<select aria-label="Mục giao diện" value={sub} onChange={e=>router.push(e.target.value)} className="h-9 max-w-full rounded-md border border-border bg-white/85 px-3 text-sm text-foreground">{website.map(([href,label])=><option key={href} value={href}>{label}</option>)}</select></label></div>}<div className="min-w-0">{children}</div></div>;
}
