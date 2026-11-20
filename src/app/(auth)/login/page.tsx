import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthHeader } from "@/components/layout/auth-header";
import { getT } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { LoginForm } from "./login-form";

export async function generateMetadata() { return { title: (await getT())("common.login") }; }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const t = await getT();
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return (
    <div className="w-full max-w-sm">
      <AuthHeader title={t("app.shell.schoolName")} subtitle={t("app.shell.union")} />
      <div className="rounded-lg border border-border bg-white p-6">
        <LoginForm next={safeNext} />
      </div>
      <p className="mt-4 text-center"><Link href="/" className="text-sm text-blue-100 hover:text-white hover:underline">{t("app.auth.backHome")}</Link></p>
      <div className="mt-3 flex justify-center"><LanguageSwitcher /></div>
    </div>
  );
}
