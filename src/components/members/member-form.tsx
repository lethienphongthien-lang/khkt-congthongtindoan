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

export function MemberForm({ id, departments, initial, detail }: { id?: string; departments: { id: string; name: string }[]; initial?: Initial; /** Hồ sơ chi tiết (Sổ đoàn viên điện tử) đã có của đoàn viên khi sửa. */ detail?: DetailValues }) {
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
      return void toast.error("Hồ sơ chi tiết có thông tin chưa hợp lệ, vui lòng kiểm tra các ô báo đỏ");
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
        <div className="flex flex-col gap-5 sm:flex-row">
          <Field label="Ảnh đại diện" group className="shrink-0"><ImageUpload folder="members" shape="square" value={avatar} onChange={setAvatar} /></Field>
          <div className="min-w-0 flex-1 space-y-3">
            <Field label="Loại" group hint="Học sinh chưa vào Đoàn vẫn dùng được hệ thống (xem thông tin, chơi trò chơi, tích điểm) và có thể được kết nạp sau.">
              <div className="inline-flex overflow-hidden rounded-md border border-border">
                {[{ v: true, label: "Đoàn viên" }, { v: false, label: "Thanh niên (chưa vào Đoàn)" }].map((o) => (
                  <button key={String(o.v)} type="button" onClick={() => setValue("isDoanVien", o.v)} className={`px-4 py-2 text-sm font-medium ${doanVien === o.v ? "bg-primary text-white" : "bg-white hover:bg-slate-50"}`}>{o.label}</button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-4">
              <Field label="Họ và tên" required error={errors.fullName?.message} className="col-span-2"><Input maxLength={100} autoComplete="name" {...register("fullName", { onChange: (e) => { e.target.value = nameOnly(e.target.value); } })} /></Field>
              <Field label="Ngày sinh" error={errors.dateOfBirth?.message}><Input type="date" min={MIN_BIRTH} max={todayVN()} {...register("dateOfBirth")} /></Field>
              <Field label="Giới tính">
                <Select {...register("gender")}><option value="">—</option><option>Nam</option><option>Nữ</option><option>Khác</option></Select>
              </Field>
              <Field label="Chi đoàn" required error={errors.departmentId?.message}>
                <Select {...register("departmentId")}><option value="">Chọn Chi đoàn</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
              </Field>
              <Field label="Khóa (năm nhập học)" error={errors.cohort?.message}><Input type="number" inputMode="numeric" min={2000} max={2100} {...register("cohort")} /></Field>
              {doanVien && <Field label="Ngày vào Đoàn" error={errors.joinedAt?.message}><Input type="date" min="1990-01-01" max={todayVN()} {...register("joinedAt")} /></Field>}
              <Field label="Trạng thái sinh hoạt">
                <Select {...register("status")}><option value="ACTIVE">Đang sinh hoạt</option><option value="TRANSFERRED">Đã chuyển sinh hoạt</option><option value="GRADUATED">Đã ra trường</option></Select>
              </Field>
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-5"><h2 className="mb-3 text-[15px] font-semibold">Hồ sơ chi tiết</h2><DetailFields values={d} onChange={(k, v) => setD((p) => ({ ...p, [k]: v }))} errors={detailErrors} /></div>
        <HeaderActions>
          <Button type="submit" form="member-form" loading={isSubmitting}>{id ? "Lưu thay đổi" : doanVien ? "Thêm đoàn viên" : "Thêm thanh niên"}</Button>
          <Button variant="secondary" onClick={() => router.back()}>Hủy</Button>
        </HeaderActions>
      </form>
      <Modal open={!!created} onClose={() => { setCreated(null); router.push("/members"); router.refresh(); }} title="Đã tạo tài khoản">
        {created && (
          <div className="space-y-3 text-sm">
            <Alert tone="green">Mật khẩu tạm thời chỉ hiển thị một lần. Người dùng phải đổi mật khẩu ở lần đăng nhập đầu tiên.</Alert>
            <dl className="grid grid-cols-[130px_1fr] gap-y-1.5">
              <dt className="text-muted">Họ tên</dt><dd>{created.fullName}</dd>
              <dt className="text-muted">Tên đăng nhập</dt><dd className="font-mono">{created.code}</dd>
              <dt className="text-muted">Mật khẩu tạm</dt><dd className="font-mono">{created.password}</dd>
            </dl>
            <div className="flex justify-end"><Button onClick={() => { setCreated(null); router.push("/members"); router.refresh(); }}>Đóng</Button></div>
          </div>
        )}
      </Modal>
    </>
  );
}
