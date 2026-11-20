"use client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { changePasswordSchema } from "@/lib/validation";
import { changePasswordAction } from "@/actions/auth";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, PasswordInput } from "@/components/ui/form";

type Values = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm({ redirectTo }: { redirectTo?: string }) {
  const t = useT();
  const router = useRouter();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    const res = await changePasswordAction(values);
    if (!res.ok) return toast.error(res.error);
    toast.success(t("members.pwChanged"));
    reset();
    if (redirectTo) { router.replace(redirectTo); router.refresh(); }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label={t("members.pwCurrent")} error={errors.currentPassword?.message}>
        <PasswordInput aria-label={t("members.pwCurrent")} autoComplete="current-password" {...register("currentPassword")} />
      </Field>
      <Field label={t("members.pwNew")} error={errors.newPassword?.message} hint={t("members.pwHint")}>
        <PasswordInput aria-label={t("members.pwNew")} autoComplete="new-password" {...register("newPassword")} />
      </Field>
      <Field label={t("members.pwConfirm")} error={errors.confirmPassword?.message}>
        <PasswordInput aria-label={t("members.pwConfirm")} autoComplete="new-password" {...register("confirmPassword")} />
      </Field>
      <Button type="submit" loading={isSubmitting} className="w-full">{t("members.pwSave")}</Button>
    </form>
  );
}
