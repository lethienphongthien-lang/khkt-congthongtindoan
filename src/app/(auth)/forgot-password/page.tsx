import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { AuthHeader } from "@/components/layout/auth-header";

export async function generateMetadata() { return { title: (await getT())("app.auth.forgotTitle") }; }

export default async function ForgotPasswordPage() {
  const t = await getT();
  return (
    <div className="w-full max-w-sm">
      <AuthHeader title={t("app.auth.forgotTitle")} />
      <div className="space-y-3 rounded-lg border border-border bg-white p-6 text-sm">
        <p>{t("app.auth.forgot1")}</p>
        <p>{t("app.auth.forgot2a")}<b>{t("app.auth.secretary")}</b>{t("app.auth.forgot2b")}<b>{t("app.auth.bch")}</b>{t("app.auth.forgot2c")}</p>
        <Link href="/login" className="inline-block text-primary hover:underline">{t("app.auth.backLogin")}</Link>
      </div>
    </div>
  );
}
