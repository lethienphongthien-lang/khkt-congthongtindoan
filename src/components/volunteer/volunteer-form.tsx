"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { registerVolunteerAction } from "@/actions/volunteer";
import { HeaderActions } from "@/components/ui/header-actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { volunteerSchema } from "@/lib/validation";
import { toLocalInput } from "@/utils";

const SUGGEST = ["Quét sân", "Vệ sinh khu vực lớp", "Nhặt rác", "Chăm sóc cây xanh", "Lau dọn hành lang", "Sắp xếp bàn ghế"];
type Errors = Record<string, string>;

/** Biểu mẫu bí thư đăng ký tình nguyện cho cả Chi đoàn: chọn công việc, ngày giờ, khu vực, số giờ và điểm mỗi em. */
export function VolunteerForm({ departments }: { departments?: { id: string; name: string }[] }) {
  const router = useRouter();
  const [v, setV] = useState({ task: "", date: toLocalInput(new Date()).slice(0, 10), startTime: "07:00", endTime: "08:00", location: "", hours: "1", points: "2", note: "", departmentId: "" });
  const [hoursTouched, setHoursTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const set = (k: keyof typeof v, val: string) => setV((p) => {
    const n = { ...p, [k]: val };
    // Số giờ tự tính theo khung giờ (làm tròn 0,25 giờ) cho tới khi người dùng tự sửa
    if (!hoursTouched && (k === "startTime" || k === "endTime")) {
      const [sh, sm] = n.startTime.split(":").map(Number), [eh, em] = n.endTime.split(":").map(Number);
      const h = (eh * 60 + em - (sh * 60 + sm)) / 60;
      if (h > 0) n.hours = String(Math.round(h * 4) / 4);
    }
    return n;
  });

  async function submit() {
    const chk = volunteerSchema.safeParse(v);
    if (!chk.success) {
      const fe: Record<string, string> = {};
      for (const i of chk.error.issues) { const k = String(i.path[0] ?? ""); if (!fe[k]) fe[k] = i.message; }
      setErrors(fe); return void toast.error(chk.error.issues[0].message);
    }
    setBusy(true); setErrors({});
    const res = await registerVolunteerAction(v);
    setBusy(false);
    if (!res.ok) { toast.error(res.error); setErrors(Object.fromEntries(Object.entries(res.fieldErrors ?? {}).map(([k, m]) => [k, m[0]]))); return; }
    toast.success(res.message); router.push("/volunteer"); router.refresh();
  }

  return (
    <div className="w-full space-y-4">
      <p className="rounded-md bg-primary-light px-3 py-2 text-sm text-primary-dark">Đăng ký tình nguyện cho <b>cả Chi đoàn</b>. Đăng ký được gửi cho <b>Ban chấp hành duyệt</b>; duyệt xong buổi hiện trên lịch tình nguyện và các đoàn viên nhận thông báo. Có thể chọn cả ngày đã qua (đăng ký bổ sung). Làm xong, bạn bấm <b>Hoàn thành</b> để hệ thống tự cộng <b>điểm</b> cho từng đoàn viên của Chi đoàn (không cần điểm danh).</p>
      <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
        <div className="space-y-4">
          {departments && (
            <Field label="Chi đoàn" required error={errors.departmentId}>
              <Select value={v.departmentId} onChange={(e) => set("departmentId", e.target.value)}><option value="">Chọn Chi đoàn</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
            </Field>
          )}
          <Field label="Công việc tình nguyện" required error={errors.task}>
            <Input value={v.task} maxLength={100} placeholder="Ví dụ: Quét sân" onChange={(e) => set("task", e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-1.5">{SUGGEST.map((s) => <button key={s} type="button" onClick={() => set("task", s)} className="rounded-full border border-border bg-white/85 px-2.5 py-1 text-xs hover:border-primary hover:text-primary">{s}</button>)}</div>
          </Field>
          <Field label="Khu vực / địa điểm" required error={errors.location}><Input value={v.location} maxLength={150} placeholder="Ví dụ: Sân trường khu A" onChange={(e) => set("location", e.target.value)} /></Field>
          <Field label="Ghi chú" error={errors.note}><Textarea className="min-h-24" maxLength={500} value={v.note} onChange={(e) => set("note", e.target.value)} /></Field>
        </div>
        <div className="space-y-4">
          <Field label="Ngày" required error={errors.date}><Input type="date" value={v.date} onChange={(e) => set("date", e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Từ giờ" required error={errors.startTime}><Input type="time" value={v.startTime} onChange={(e) => set("startTime", e.target.value)} /></Field>
            <Field label="Đến giờ" required error={errors.endTime}><Input type="time" value={v.endTime} onChange={(e) => set("endTime", e.target.value)} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Giờ tình nguyện mỗi em" required error={errors.hours} hint="Tự tính theo khung giờ, sửa được (tối đa 12 giờ)."><Input type="number" step="0.25" min="0.25" max="12" value={v.hours} onChange={(e) => { setHoursTouched(true); set("hours", e.target.value); }} /></Field>
            <Field label="Điểm mỗi em" required error={errors.points} hint="Cộng cho mỗi đoàn viên khi bạn bấm Hoàn thành (tối đa 20)."><Input type="number" min="0" max="20" value={v.points} onChange={(e) => set("points", e.target.value)} /></Field>
          </div>
        </div>
      </div>
      <HeaderActions>
        <Button loading={busy} onClick={submit}>Gửi đăng ký</Button>
        <Button variant="secondary" onClick={() => router.back()}>Hủy</Button>
      </HeaderActions>
    </div>
  );
}
