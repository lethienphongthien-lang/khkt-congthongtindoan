import { Suspense } from "react";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { aiConfigured } from "@/lib/ai/gemini";
import { NavigationSkeleton } from "@/components/ui/navigation-skeleton";
import { ChatWidget } from "@/components/public/chat-widget";
import { PublicSidebar } from "@/components/public/public-sidebar";
import { departmentsByGrade } from "@/lib/services/public";
import { getMarquee, getMenuConfig, getSiteSettings } from "@/lib/services/site-settings";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, groups, marquee, menu] = await Promise.all([getSiteSettings(), departmentsByGrade(), getMarquee(), getMenuConfig()]);
  const grades = groups.map(([grade, depts]) => ({ grade, depts: depts.map((d) => ({ id: d.id, name: d.name })) }));
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader address={settings.address} bannerUrl={settings.bannerUrl} phone={settings.phone} email={settings.email} facebook={settings.facebook} youtube={settings.youtube} marquee={marquee} menu={menu} />
      <div className="flex w-full flex-1 gap-2 px-1.5 py-2 lg:px-2.5">
        {/* Thanh bên trái (desktop): Giới thiệu, Báo cáo Chi đoàn theo khối/lớp, Thi đua. Trên mobile dùng menu ở đầu trang. */}
        <aside className="no-print hidden w-60 shrink-0 lg:block">
          <div className="sticky top-32"><Suspense><PublicSidebar grades={grades} menu={menu} /></Suspense></div>
        </aside>
        <main className="min-w-0 flex-1"><NavigationSkeleton variant="public" className="min-h-full">{children}</NavigationSkeleton></main>
      </div>
      {aiConfigured() && <ChatWidget />}
      <SiteFooter address={settings.address} phone={settings.phone} email={settings.email} facebook={settings.facebook} youtube={settings.youtube} />
    </div>
  );
}
