import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthHeader } from "@/components/layout/auth-header";
import { LoginForm } from "./login-form";

export const metadata = { title: "Đăng nhập" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return (
    <div className="w-full max-w-sm">
      <AuthHeader title="Trường THPT Sơn Hà" subtitle="Đoàn TNCS Hồ Chí Minh" />
      <div className="rounded-lg border border-border bg-white p-6">
        <LoginForm next={safeNext} />
      </div>
      <p className="mt-4 text-center"><Link href="/" className="text-sm text-blue-100 hover:text-white hover:underline">← Về trang chủ</Link></p>
    </div>
  );
}
