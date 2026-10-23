"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createEmulationBatchAction, deleteEmulationRecordAction, getEmulationWeekAction } from "@/actions/emulation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { ConfirmButton, Modal } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";
import { defaultCalendar, weekLabel, weekRange, yearLabel, type SchoolCalendar } from "@/lib/school-calendar";

export function AddRecordButton({ departments, calendars, defaultYear, defaultWeek }: { departments: { id: string; name: string }[]; calendars: SchoolCalendar[]; defaultYear: number; defaultWeek: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [year, setYear] = useState(defaultYear);
  const [week, setWeek] = useState(defaultWeek);
  const calOf = (y: number) => calendars.find((c) => c.startYear === y) ?? defaultCalendar(y);
  const cal = calOf(year);
  const years = [...new Set([...calendars.map((c) => c.startYear), defaultYear])].sort((a, b) => b - a);
  const [pts, setPts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  // Điền sẵn điểm hiện có của tuần được chọn để sửa trực tiếp (nhập mới sẽ thay thế, không cộng dồn)
  useEffect(() => {
    if (!open) return;
    let off = false;
    setLoading(true);
    getEmulationWeekAction(year, week).then((r) => { if (!off) { setPts(r.ok && r.data ? Object.fromEntries(Object.entries(r.data.points).map(([k, v]) => [k, String(v)])) : {}); setLoading(false); } });
    return () => { off = true; };
  }, [open, year, week]);
  const filled = departments.filter((d) => pts[d.id] !== undefined && pts[d.id] !== "").length;
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="size-4" />Ghi điểm<span className="max-sm:hidden"> thi đua</span></Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Ghi nhận điểm thi đua" className="max-w-xl">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
            <Field label="Nội dung" required><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: Nề nếp tuần 41" /></Field>
            <Field label="Năm học" required>
              <Select value={year} onChange={(e) => { const y = +e.target.value; setYear(y); setWeek(Math.min(week, calOf(y).totalWeeks)); }}>
                {years.map((y) => <option key={y} value={y}>{yearLabel(y)}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Tuần thi đua" required hint="Điểm thi đua chỉ ghi theo tuần; thống kê tháng, học kỳ, năm học tự cộng dồn các tuần">
            <Select value={week} onChange={(e) => setWeek(+e.target.value)}>
              {Array.from({ length: cal.totalWeeks }, (_, i) => <option key={i} value={i + 1}>{weekLabel(cal, i + 1)}</option>)}
            </Select>
          </Field>
          <div>
            <div className="mb-1 flex items-baseline justify-between text-sm font-medium">
              <span>Điểm từng Chi đoàn</span><span className="text-xs font-normal text-muted">Điểm cả tuần (tối đa 105) · nhập mới sẽ thay điểm cũ · nhập 0 để xóa · bỏ trống thì giữ nguyên</span>
            </div>
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border">
              <ul className="divide-y divide-border">
                {departments.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                    <span className="text-sm font-medium">{d.name}</span>
                    <Input type="number" inputMode="numeric" min={-105} max={105} className="w-24 text-right" value={pts[d.id] ?? ""} placeholder="0"
                      onChange={(e) => setPts({ ...pts, [d.id]: e.target.value })} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-xs text-muted">{loading ? "Đang tải điểm hiện có…" : `${filled} Chi đoàn có điểm trong tuần này`}</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
              <Button loading={busy} disabled={!filled || loading} onClick={async () => {
                setBusy(true);
                const items = departments.filter((d) => pts[d.id] !== undefined && pts[d.id] !== "").map((d) => ({ departmentId: d.id, points: pts[d.id] }));
                const res = await createEmulationBatchAction({ reason, recordedAt: weekRange(cal, week)!.from, items });
                setBusy(false);
                if (reportResult(res)) { setOpen(false); setReason(""); router.refresh(); }
              }}>Lưu</Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function DeleteRecordButton({ id }: { id: string }) {
  const router = useRouter();
  return <ConfirmButton trigger={<Trash2 className="size-3.5" />} triggerVariant="ghost" triggerClassName="text-danger" title="Xóa bản ghi điểm thi đua?" danger confirmLabel="Xóa"
    onConfirm={async () => { reportResult(await deleteEmulationRecordAction(id)); router.refresh(); }} />;
}
