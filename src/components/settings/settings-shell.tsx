"use client";
import { usePathname,useRouter,useSearchParams } from "next/navigation";
import type { SessionUser } from "@/lib/auth/session";
import { Tabs } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
const tabs = [["/settings?tab=schoolyear","ui.st.schoolyear"],["/settings?tab=catalogs","ui.st.catalogs"],["/settings?tab=rules","ui.st.rules"],["/cms/settings","ui.st.look"],["/settings?tab=data","ui.st.system"]] as const satisfies readonly (readonly [string, MessageKey])[];
const website = [["/cms/settings","ui.st.siteInfo"],["/cms/menu","ui.st.menu"],["/cms/marquee","ui.st.marquee"],["/cms/pages","ui.st.introPages"]] as const satisfies readonly (readonly [string, MessageKey])[];
/** One full-width content area, five primary tabs; no second sidebar. */
export function SettingsShell({ user,children }: { user: Pick<SessionUser,"role"|"superAdmin">; children: React.ReactNode }) {
  const t=useT();
  const pathname=usePathname(),sp=useSearchParams(),router=useRouter();
  if(user.role!=="ADMIN"||pathname.startsWith("/settings/profile")) return <>{children}</>;
  const isWebsite=pathname.startsWith("/cms/");
  const requested=sp.get("tab")??"schoolyear";
  const tab=["schoolyear","catalogs","rules","data"].includes(requested)?requested:"schoolyear";
  const current=isWebsite?"/cms/settings":`/settings?tab=${tab}`;
  const sub=website.find(([href])=>pathname===href||pathname.startsWith(href+"/"))?.[0]??"/cms/settings";
  return <div className="min-w-0 space-y-4"><h1 className="text-xl font-semibold">{t("ui.st.title")}</h1><Tabs items={tabs.map(([h,k])=>[h,t(k)] as const)} current={current} label={t("ui.st.title")} />{isWebsite&&<div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-sm text-muted">{t("ui.st.lookSection")}<select aria-label={t("ui.st.lookSection")} value={sub} onChange={e=>router.push(e.target.value)} className="h-9 max-w-full rounded-md border border-border bg-white/85 px-3 text-sm text-foreground">{website.map(([href,label])=><option key={href} value={href}>{t(label)}</option>)}</select></label></div>}<div className="min-w-0">{children}</div></div>;
}
