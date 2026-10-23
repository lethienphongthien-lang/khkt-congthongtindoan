"use client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { changePasswordSchema } from "@/lib/validation";
import { changePasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, PasswordInput } from "@/components/ui/form";

type Values = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    const res = await changePasswordAction(values);
    if (!res.ok) return toast.error(res.error);
    toast.success("Đã đổi mật khẩu");
    reset();
    if (redirectTo) { router.replace(redirectTo); router.refresh(); }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Mật khẩu hiện tại" error={errors.currentPassword?.message}>
        <PasswordInput aria-label="Mật khẩu hiện tại" autoComplete="current-password" {...register("currentPassword")} />
      </Field>
      <Field label="Mật khẩu mới" error={errors.newPassword?.message} hint="Tối thiểu 8 ký tự, gồm chữ và số">
        <PasswordInput aria-label="Mật khẩu mới" autoComplete="new-password" {...register("newPassword")} />
      </Field>
      <Field label="Nhập lại mật khẩu mới" error={errors.confirmPassword?.message}>
        <PasswordInput aria-label="Nhập lại mật khẩu mới" autoComplete="new-password" {...register("confirmPassword")} />
      </Field>
      <Button type="submit" loading={isSubmitting} className="w-full">Lưu mật khẩu</Button>
    </form>
  );
}
