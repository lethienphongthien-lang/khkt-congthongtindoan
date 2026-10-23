import Link from "next/link";
import { AuthHeader } from "@/components/layout/auth-header";

export const metadata = { title: "Quên mật khẩu" };

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-sm">
      <AuthHeader title="Quên mật khẩu" />
      <div className="space-y-3 rounded-lg border border-border bg-white p-6 text-sm">
        <p>Tài khoản đoàn viên do nhà trường cấp nên mật khẩu không thể tự đặt lại qua email.</p>
        <p>Vui lòng liên hệ <b>Bí thư Chi đoàn</b> hoặc <b>Ban chấp hành Đoàn trường</b> để được cấp lại mật khẩu tạm thời. Bạn sẽ được yêu cầu đổi mật khẩu ngay trong lần đăng nhập kế tiếp.</p>
        <Link href="/login" className="inline-block text-primary hover:underline">← Quay lại đăng nhập</Link>
      </div>
    </div>
  );
}
