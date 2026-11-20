import Link from "next/link";
import { Globe, LogIn, Mail, MapPin, Phone, PlayCircle } from "lucide-react";
import { DoanLogo } from "@/components/layout/logo";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";

const GROUPS: { title: MessageKey; links: [MessageKey, string][] }[] = [
  { title: "footer.intro", links: [["menu.gt-doan-truong", "/gioi-thieu/doan-truong"], ["menu.gt-co-cau", "/gioi-thieu/co-cau-to-chuc"], ["menu.gt-co-do", "/gioi-thieu/co-do"], ["menu.gt-noi-quy", "/gioi-thieu/noi-quy"]] },
  { title: "footer.info", links: [["menu.tin-tuc", "/tin-tuc"], ["menu.ke-hoach", "/ke-hoach"], ["menu.thong-bao", "/thong-bao"], ["menu.dien-dan", "/dien-dan"], ["footer.schedule", "/lich-cong-tac"], ["menu.bao-cao", "/bao-cao-chi-doan"]] },
  { title: "footer.students", links: [["menu.thi-dua", "/thi-dua"], ["footer.entertainment", "/tro-choi"], ["menu.dinh-huong", "/dinh-huong-nghe-nghiep"], ["menu.g-tu-van", "/tu-van-tam-ly"], ["footer.materials", "/tai-lieu-sinh-hoat"], ["footer.anonymous", "/gop-y"], ["menu.g-confession", "/confession"]] },
];

type Props = { address: string; phone: string; email: string; facebook?: string; youtube?: string };

export async function SiteFooter({ address, phone, email, facebook, youtube }: Props) {
  const t = await getT();
  const contact = [
    address && { icon: MapPin, text: address, href: undefined as string | undefined },
    phone && { icon: Phone, text: phone, href: `tel:${phone.replace(/\s/g, "")}` },
    email && { icon: Mail, text: email, href: `mailto:${email}` },
  ].filter(Boolean) as { icon: typeof MapPin; text: string; href?: string }[];
  const social = [facebook && { label: "Facebook", href: facebook, icon: Globe }, youtube && { label: "Youtube", href: youtube, icon: PlayCircle }].filter(Boolean) as { label: string; href: string; icon: typeof Globe }[];
  return (
    <footer className="no-print mt-12 bg-primary-dark text-blue-100">
      <div className="h-1 bg-gradient-to-r from-[#ffd400] via-[#ffd400]/60 to-transparent" />
      <div className="grid w-full gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-4">
          <div className="flex items-center gap-3">
            <DoanLogo className="h-14 shrink-0 drop-shadow-lg" />
            <div>
              <div className="text-xs tracking-wider text-blue-200 uppercase">{t("site.org")}</div>
              <div className="text-lg leading-tight font-bold text-white uppercase">{t("site.name")}</div>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {contact.map(({ icon: Icon, text, href }) => (
              <li key={text} className="flex items-start gap-2">
                <Icon className="mt-0.5 size-4 shrink-0 text-[#ffd400]" />
                {href ? <a href={href} className="break-all hover:text-white hover:underline">{text}</a> : <span>{text}</span>}
              </li>
            ))}
          </ul>
          {social.length > 0 && (
            <div className="mt-4 flex gap-2">
              {social.map(({ label, href, icon: Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-sm text-white transition-colors hover:bg-white/20"><Icon className="size-4" />{label}</a>
              ))}
            </div>
          )}
        </div>
        {GROUPS.map((g) => (
          <nav key={g.title} aria-label={t(g.title)} className="lg:col-span-2">
            <h3 className="mb-3 border-l-4 border-[#ffd400] pl-2.5 text-sm font-bold tracking-wide text-white uppercase">{t(g.title)}</h3>
            <ul className="space-y-2 text-sm">
              {g.links.map(([label, href]) => <li key={href}><Link href={href} className="hover:text-white hover:underline">{t(label)}</Link></li>)}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="flex w-full flex-col items-center justify-between gap-2 px-4 py-3 text-xs text-blue-200 sm:flex-row lg:px-8">
          <span>© {new Date().getFullYear()} {t("site.name")}. {t("site.copyright")}</span>
          <Link href="/login" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-medium text-white transition-colors hover:bg-white/20"><LogIn className="size-3.5" />{t("common.loginAdmin")}</Link>
        </div>
      </div>
    </footer>
  );
}
