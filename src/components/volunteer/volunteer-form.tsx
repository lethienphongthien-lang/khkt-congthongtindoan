"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { registerVolunteerAction, updateVolunteerAction } from "@/actions/volunteer";
import { HeaderActions } from "@/components/ui/header-actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { volunteerSchema } from "@/lib/validation";
import { toLocalInput } from "@/utils";
import { useT } from "@/lib/i18n/client";

const SUGGEST = ["community.vf.s0", "community.vf.s1", "community.vf.s2", "community.vf.s3", "community.vf.s4", "community.vf.s5"] as const;
type Errors = Record<string, string>;

/** Biểu mẫu bí thư đăng ký tình nguyện cho cả Chi đoàn: chọn công việc, ngày giờ, khu vực, số giờ và điểm mỗi em. */
export type VolunteerInitial = { id: string; task: string; date: string; startTime: string; endTime: string; location: string; hours: number; points: number; note: string };

export function VolunteerForm({ departments, initial }: { departments?: { id: string; name: string }[]; initial?: VolunteerInitial }) {
  const t = useT();
  const router = useRouter();
  const [v, setV] = useState(initial ? { ...initial, hours: String(initial.hours), points: String(initial.points), departmentId: "" } : { task: "", date: toLocalInput(new Date()).slice(0, 10), startTime: "07:00", endTime: "08:00", location: "", hours: "1", points: "2", note: "", departmentId: "" });
  const [hoursTouched, setHoursTouched] = useState(!!initial);
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
    const res = initial ? await updateVolunteerAction(initial.id, v) : await registerVolunteerAction(v);
    setBusy(false);
    if (!res.ok) { toast.error(res.error); setErrors(Object.fromEntries(Object.entries(res.fieldErrors ?? {}).map(([k, m]) => [k, m[0]]))); return; }
    toast.success(res.message); router.push("/volunteer"); router.refresh();
  }

  return (
    <div className="w-full space-y-4">
      <p className="rounded-md bg-primary-light px-3 py-2 text-sm text-primary-dark">{t("community.vf.intro1")} <b>{t("community.vf.intro2")}</b>. {t("community.vf.intro3")} <b>{t("community.vf.intro4")}</b>{t("community.vf.intro5")} <b>{t("community.vf.intro6")}</b> {t("community.vf.intro7")} <b>{t("community.vf.intro8")}</b> {t("community.vf.intro9")}</p>
      <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
        <div className="space-y-4">
          {departments && (
            <Field label={t("community.vf.chapter")} required error={errors.departmentId}>
              <Select value={v.departmentId} onChange={(e) => set("departmentId", e.target.value)}><option value="">{t("community.vf.pickChapter")}</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
            </Field>
          )}
          <Field label={t("community.vf.task")} required error={errors.task}>
            <Input value={v.task} maxLength={100} placeholder={t("community.vf.taskPh")} onChange={(e) => set("task", e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-1.5">{SUGGEST.map((k) => <button key={k} type="button" onClick={() => set("task", t(k))} className="rounded-full border border-border bg-white/85 px-2.5 py-1 text-xs hover:border-primary hover:text-primary">{t(k)}</button>)}</div>
          </Field>
          <Field label={t("community.vf.location")} required error={errors.location}><Input value={v.location} maxLength={150} placeholder={t("community.vf.locationPh")} onChange={(e) => set("location", e.target.value)} /></Field>
          <Field label={t("community.vf.note")} error={errors.note}><Textarea className="min-h-24" maxLength={500} value={v.note} onChange={(e) => set("note", e.target.value)} /></Field>
        </div>
        <div className="space-y-4">
          <Field label={t("community.vf.date")} required error={errors.date}><Input type="date" value={v.date} onChange={(e) => set("date", e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("community.vf.from")} required error={errors.startTime}><Input type="time" value={v.startTime} onChange={(e) => set("startTime", e.target.value)} /></Field>
            <Field label={t("community.vf.to")} required error={errors.endTime}><Input type="time" value={v.endTime} onChange={(e) => set("endTime", e.target.value)} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("community.vf.hours")} required error={errors.hours} hint={t("community.vf.hoursHint")}><Input type="number" step="0.25" min="0.25" max="12" value={v.hours} onChange={(e) => { setHoursTouched(true); set("hours", e.target.value); }} /></Field>
            <Field label={t("community.vf.points")} required error={errors.points} hint={t("community.vf.pointsHint")}><Input type="number" min="0" max="20" value={v.points} onChange={(e) => set("points", e.target.value)} /></Field>
          </div>
        </div>
      </div>
      <HeaderActions>
        <Button loading={busy} onClick={submit}>{initial ? t("community.vf.saveChanges") : t("community.vf.submit")}</Button>
        <Button variant="secondary" onClick={() => router.back()}>{t("community.cancel")}</Button>
      </HeaderActions>
    </div>
  );
}
