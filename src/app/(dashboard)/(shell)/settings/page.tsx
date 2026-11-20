import { getT } from "@/lib/i18n/server";
import { getEduPolicy } from "@/lib/services/edu-policy";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { RETENTION,storageStats } from "@/lib/services/cleanup";
import { cloudinaryUsage } from "@/lib/cloudinary";
import { DataManager } from "@/components/settings/data-manager";
import { loadConfiguredCalendars } from "@/lib/services/school-calendar";
import { SchoolYearManager } from "@/components/settings/school-year-manager";
import { CategoryTable } from "@/components/cms/category-manager";
import { GameCapForm } from "@/components/games/quiz-admin";
import { getGameCap } from "@/lib/services/games";
export async function generateMetadata(){return{title:(await getT())("cms.st.title")};}
export default async function SettingsPage({searchParams}:{searchParams:Promise<{tab?:string}>}) {
  const t=await getT();
  const user=await requireUser();
  const requested=(await searchParams).tab;
  const personal:Record<string,string>={account:"account",password:"security",passkey:"security",notifications:"notifications"};
  if(requested&&personal[requested]) redirect(`/settings/profile?tab=${personal[requested]}`);
  if(user.role!=="ADMIN") redirect("/settings/profile");
  if(requested==="leaders") redirect("/accounts?tab=personnel");
  if(requested==="classpw") redirect("/accounts?tab=security");
  if(requested==="plancats") redirect("/settings?tab=catalogs");
  if(requested==="gamecap") redirect("/settings?tab=rules");
  const tab=["schoolyear","catalogs","rules","data"].includes(requested??"")?requested!:"schoolyear";
  if(tab==="schoolyear") {
    const rows=await loadConfiguredCalendars();
    const policy=await getEduPolicy();
    return <SchoolYearManager rows={rows.map(r=>({...r,custom:true}))} canEdit={policy.years} />;
  }
  if(tab==="catalogs") {
    const cats=await db.articleCategory.findMany({where:{kind:"PLAN"},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],include:{_count:{select:{articles:true}}}});
    return <section className="space-y-3"><h2 className="text-[15px] font-semibold">{t("cms.st.planCats")}</h2><CategoryTable kind="PLAN" label={t("cms.cat.plan")} categories={cats.map(c=>({id:c.id,name:c.name,count:c._count.articles}))} /></section>;
  }
  if(tab==="rules") return <section className="space-y-3"><h2 className="text-[15px] font-semibold">{t("cms.st.gamePoints")}</h2><p className="text-sm text-muted">{t("cms.st.gameCapDesc")}</p><div className="rounded-lg border border-border bg-white/85 p-4"><GameCapForm cap={await getGameCap()} /></div></section>;
  const [storage,cloud]=await Promise.all([storageStats(),cloudinaryUsage()]);
  return <DataManager cloud={cloud} totalBytes={storage.totalBytes} tables={storage.tables} retention={RETENTION} />;
}
