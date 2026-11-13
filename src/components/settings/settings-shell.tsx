"use client";
import { usePathname,useSearchParams } from "next/navigation";
import type { SessionUser } from "@/lib/auth/session";
import { Tabs } from "@/components/ui/tabs";
const tabs = [["/settings?tab=schoolyear","Năm học"],["/settings?tab=catalogs","Danh mục"],["/settings?tab=rules","Quy chế"],["/cms/settings","Giao diện"],["/settings?tab=data","Hệ thống"]] as const;
const website = [["/cms/settings","Thông tin website"],["/cms/menu","Menu"],["/cms/marquee","Dòng chữ chạy"],["/cms/pages","Trang giới thiệu"]] as const;
/** One full-width content area, five primary tabs; no second sidebar. */
export function SettingsShell({ user,children }: { user: Pick<SessionUser,"role"|"superAdmin">; children: React.ReactNode }) {
  const pathname=usePathname(),sp=useSearchParams();
  if(user.role!=="ADMIN"||pathname.startsWith("/settings/profile")) return <>{children}</>;
  const isWebsite=pathname.startsWith("/cms/");
  const requested=sp.get("tab")??"schoolyear";
  const tab=["schoolyear","catalogs","rules","data"].includes(requested)?requested:"schoolyear";
  const current=isWebsite?"/cms/settings":`/settings?tab=${tab}`;
  const sub=website.find(([href])=>pathname===href||pathname.startsWith(href+"/"))?.[0]??"/cms/settings";
  return <div className="min-w-0 space-y-4"><h1 className="text-xl font-semibold">Cấu hình & Cài đặt</h1><Tabs items={tabs} current={current} label="Cấu hình & Cài đặt" />{isWebsite&&<Tabs items={website} current={sub} label="Cài đặt website" />}<div className="min-w-0">{children}</div></div>;
}
