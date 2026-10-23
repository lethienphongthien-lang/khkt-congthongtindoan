import { requireUser } from "@/lib/auth/session";
import { AuthHeader } from "@/components/layout/auth-header";
import { ChangePasswordForm } from "@/components/members/change-password-form";

export const metadata = { title: "Đổi mật khẩu" };

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPasswordChange: true });
  return (
    <div className="w-full max-w-sm">
      <AuthHeader title={user.mustChangePassword ? "Đặt mật khẩu mới" : "Đổi mật khẩu"}
        subtitle={user.mustChangePassword ? "Đây là lần đăng nhập đầu tiên, bạn cần đổi mật khẩu tạm thời trước khi tiếp tục." : undefined} />
      <div className="rounded-lg border border-border bg-white p-6">
        <ChangePasswordForm redirectTo="/dashboard" />
      </div>
    </div>
  );
}
