"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { loginSchema } from "@/lib/validation";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { PasskeyLogin } from "@/components/auth/passkey-login";

type Values = z.infer<typeof loginSchema>;

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [redirecting, setRedirecting] = useState(false); // đăng nhập xong: giữ trạng thái chờ cho tới khi trang mới mở ra
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(undefined);
    const res = await loginAction(values);
    if (!res.ok) return setError(res.error);
    setRedirecting(true);
    router.replace(res.data?.mustChangePassword ? "/change-password" : next);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate aria-busy={isSubmitting || redirecting}>
      {error && <Alert>{error}</Alert>}
      <Field label="Tên đăng nhập" error={errors.username?.message}>
        <Input autoComplete="username" autoFocus {...register("username")} />
      </Field>
      <Field label="Mật khẩu" error={errors.password?.message}>
        <PasswordInput aria-label="Mật khẩu" autoComplete="current-password" {...register("password")} />
      </Field>
      <Button type="submit" loading={isSubmitting || redirecting} className="w-full">{isSubmitting ? "Đang kiểm tra…" : redirecting ? "Đang vào hệ thống…" : "Đăng nhập"}</Button>
      <div className="text-center">
        <Link href="/forgot-password" className="text-[13px] text-primary hover:underline">Quên mật khẩu?</Link>
      </div>
      <PasskeyLogin next={next} />
    </form>
  );
}
