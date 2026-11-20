import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { AuthHeader } from "@/components/layout/auth-header";
import { ChangePasswordForm } from "@/components/members/change-password-form";

export async function generateMetadata() { return { title: (await getT())("app.auth.changeTitle") }; }

export default async function ChangePasswordPage() {
  const t = await getT();
  const user = await requireUser({ allowPasswordChange: true });
  return (
    <div className="w-full max-w-sm">
      <AuthHeader title={user.mustChangePassword ? t("app.auth.newTitle") : t("app.auth.changeTitle")}
        subtitle={user.mustChangePassword ? t("app.auth.firstLogin") : undefined} />
      <div className="rounded-lg border border-border bg-white p-6">
        <ChangePasswordForm redirectTo="/dashboard" />
      </div>
    </div>
  );
}
