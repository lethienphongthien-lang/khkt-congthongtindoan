"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { memberDetailSchema, memberSchema } from "@/lib/validation";
import { MIN_BIRTH, nameOnly, todayVN } from "@/lib/validation/rules";
import { downloadCsv } from "@/components/members/credentials";
import { createMemberAction, updateMemberAction, type Credential } from "@/actions/members";
import { useT } from "@/lib/i18n/client";
import { HeaderActions } from "@/components/ui/header-actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";
import { Modal } from "@/components/ui/modal";
import { DetailFields, type DetailValues } from "@/components/members/member-detail-fields";
import { ALL_DETAIL_FIELDS } from "@/lib/member-detail-fields";
import { Alert } from "@/components/ui/misc";

type In = z.input<typeof memberSchema>;
type Initial = Partial<Record<keyof In, string | number | boolean>> & { avatar?: UploadedImage };

export function MemberForm({ id, departments, initial, detail, lock }: { id?: string; /** Nhóm dữ liệu dùng chung đang do EduConnect quản lý (chỉ xem). */ lock?: { profile?: boolean; placement?: boolean }; departments: { id: string; name: string }[]; initial?: Initial; /** Hồ sơ chi tiết (Sổ đoàn viên điện tử) đã có của đoàn viên khi sửa. */ detail?: DetailValues }) {
  const t = useT();
  const router = useRouter();
  const [avatar, setAvatar] = useState<UploadedImage>(initial?.avatar ?? null);
  const [d, setD] = useState<DetailValues>(() => detail ?? Object.fromEntries(ALL_DETAIL_FIELDS.map((f) => [f.key, f.type === "bool" ? false : ""])));
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<Credential | null>(null);
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<In>({
    resolver: zodResolver(memberSchema),
    defaultValues: { status: "ACTIVE", isDoanVien: true, ...initial } as In,
  });
  const doanVien = watch("isDoanVien") !== false;

  const onSubmit = handleSubmit(async (values) => {
    setDetailErrors({});
    // Kiểm tra hồ sơ chi tiết ngay trên trình duyệt để báo lỗi đúng ô (số điện thoại, CCCD, ngày cấp, email)
    const chk = memberDetailSchema.safeParse(d);
    if (!chk.success) {
      setDetailErrors(Object.fromEntries(chk.error.issues.map((i) => [String(i.path[0]), i.message])));
      return void toast.error(t("mf.detailInvalid"));
    }
    const payload = { ...values, avatarUrl: avatar?.imageUrl ?? "", avatarPublicId: avatar?.publicId ?? "", detail: d };
    if (id) {
      const res = await updateMemberAction(id, payload);
      if (!res.ok) { setDetailErrors(Object.fromEntries(Object.entries(res.fieldErrors ?? {}).filter(([k]) => k.startsWith("detail.")).map(([k, m]) => [k.slice(7), m[0]]))); return void toast.error(res.error); }
      toast.success(res.message);
      router.push(`/members/${id}`);
      router.refresh();
    } else {
      const res = await createMemberAction(payload);
      if (!res.ok) return void toast.error(res.error);
      const cred = { ...res.data!, department: departments.find((d) => d.id === values.departmentId)?.name ?? "" };
      setCreated(cred);
      downloadCsv([cred], `tai-khoan-${cred.code}.csv`);
    }
  });

  return (
    <>
      <form id="member-form" onSubmit={onSubmit} className="w-full space-y-5" noValidate>
        {(lock?.profile || lock?.placement) && <Alert tone="amber">{t("mf.locked", { what: [lock?.profile && t("mf.lockProfile"), lock?.placement && t("mf.lockPlacement")].filter(Boolean).join(", ") })}</Alert>}
        <div className="flex flex-col gap-5 sm:flex-row">
          <Field label={t("mf.avatar")} group className="shrink-0"><ImageUpload folder="members" shape="square" value={avatar} onChange={setAvatar} /></Field>
          <div className="min-w-0 flex-1 space-y-3">
            <Field label={t("members.f.kind")} group hint={t("mf.kindHint")}>
              <div className="inline-flex overflow-hidden rounded-md border border-border">
                {[{ v: true, label: t("members.doanVien") }, { v: false, label: t("members.f.kindYouth") }].map((o) => (
                  <button key={String(o.v)} type="button" onClick={() => setValue("isDoanVien", o.v)} className={`px-4 py-2 text-sm font-medium ${doanVien === o.v ? "bg-primary text-white" : "bg-white hover:bg-slate-50"}`}>{o.label}</button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-4">
              <Field label={t("members.fullName")} required error={errors.fullName?.message} className="col-span-2"><Input maxLength={100} autoComplete="name" readOnly={lock?.profile} {...register("fullName", { onChange: (e) => { e.target.value = nameOnly(e.target.value); } })} /></Field>
              <Field label={t("members.dob")} error={errors.dateOfBirth?.message}><Input type="date" min={MIN_BIRTH} max={todayVN()} readOnly={lock?.profile} className={lock?.profile ? "pointer-events-none opacity-60" : undefined} {...register("dateOfBirth")} /></Field>
              <Field label={t("members.gender")}>
                <Select {...register("gender")} tabIndex={lock?.profile ? -1 : undefined} className={lock?.profile ? "pointer-events-none opacity-60" : undefined}><option value="">—</option><option value="Nam">{t("members.male")}</option><option value="Nữ">{t("members.female")}</option><option value="Khác">{t("vio.type.other")}</option></Select>
              </Field>
              <Field label={t("members.f.dept")} required error={errors.departmentId?.message}>
                <Select {...register("departmentId")} tabIndex={lock?.placement ? -1 : undefined} className={lock?.placement ? "pointer-events-none opacity-60" : undefined}><option value="">{t("mf.pickDept")}</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
              </Field>
              <Field label={t("mf.cohort")} error={errors.cohort?.message}><Input type="number" inputMode="numeric" min={2000} max={2100} {...register("cohort")} /></Field>
              {doanVien && <Field label={t("members.joinedAt")} error={errors.joinedAt?.message}><Input type="date" min="1990-01-01" max={todayVN()} {...register("joinedAt")} /></Field>}
              <Field label={t("mf.status")}>
                <Select {...register("status")}><option value="ACTIVE">{t("members.st.ACTIVE")}</option><option value="TRANSFERRED">{t("members.st.TRANSFERRED")}</option><option value="GRADUATED">{t("members.st.GRADUATED")}</option></Select>
              </Field>
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-5"><h2 className="mb-3 text-[15px] font-semibold">{t("mf.detail")}</h2><DetailFields values={d} onChange={(k, v) => setD((p) => ({ ...p, [k]: v }))} errors={detailErrors} /></div>
        <HeaderActions>
          <Button type="submit" form="member-form" loading={isSubmitting}>{id ? t("mf.saveChanges") : doanVien ? t("members.addTitle") : t("mf.addYouth")}</Button>
          <Button variant="secondary" onClick={() => router.back()}>{t("members.cancel")}</Button>
        </HeaderActions>
      </form>
      <Modal open={!!created} onClose={() => { setCreated(null); router.push("/members"); router.refresh(); }} title={t("mf.created")}>
        {created && (
          <div className="space-y-3 text-sm">
            <Alert tone="green">{t("mf.createdNote")}</Alert>
            <dl className="grid grid-cols-[130px_1fr] gap-y-1.5">
              <dt className="text-muted">{t("acc.fullName")}</dt><dd>{created.fullName}</dd>
              <dt className="text-muted">{t("dact.username")}</dt><dd className="font-mono">{created.code}</dd>
              <dt className="text-muted">{t("members.tempPw")}</dt><dd className="font-mono">{created.password}</dd>
            </dl>
            <div className="flex justify-end"><Button onClick={() => { setCreated(null); router.push("/members"); router.refresh(); }}>{t("members.close")}</Button></div>
          </div>
        )}
      </Modal>
    </>
  );
}
