"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Eye, EyeOff, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { copyPreviousWeekAction, deleteScheduleItemAction, saveScheduleItemAction, setSchedulePublishedAction } from "@/actions/schedule";
import { Button } from "@/components/ui/button";
import { Field, Input, WrapInput } from "@/components/ui/form";
import { ConfirmButton, Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/misc";
import { reportResult } from "@/components/ui/submit";
import type { ScheduleDay } from "@/lib/services/schedule";

type Item = ScheduleDay["items"][number];

function ItemDialog({ year, week, date, item, onClose }: { year: number; week: number; date: string; item?: Item; onClose: () => void }) {
  const router = useRouter();
  const parsed = item?.time?.match(/^(\d{2}:\d{2})(?: – (\d{2}:\d{2}))?$/);
  const [allDay, setAllDay] = useState(item?.time === "Cả ngày");
  const [from, setFrom] = useState(parsed?.[1] ?? "");
  const [to, setTo] = useState(parsed?.[2] ?? "");
  const [v, setV] = useState({ content: item?.content ?? "", assignee: item?.assignee ?? "", place: item?.place ?? "" });
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title={item ? "Sửa công việc" : "Thêm công việc"} className="max-w-md">
      <div className="space-y-3">
        <div>
          <span className="mb-1 block text-[13px] font-medium">Thời gian<span className="text-danger"> *</span></span>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Từ giờ" className="[&>span]:text-xs [&>span]:text-muted"><Input type="time" value={from} disabled={allDay} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="Đến giờ (không bắt buộc)" className="[&>span]:text-xs [&>span]:text-muted"><Input type="time" value={to} disabled={allDay} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[#0b63b8]" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />Cả ngày</label>
        </div>
        <Field label="Nội dung công việc" required><WrapInput value={v.content} maxLength={500} onChange={(e) => setV({ ...v, content: e.target.value })} /></Field>
        <Field label="Phụ trách"><Input value={v.assignee} maxLength={150} placeholder="Người hoặc đơn vị thực hiện" onChange={(e) => setV({ ...v, assignee: e.target.value })} /></Field>
        <Field label="Địa điểm"><Input value={v.place} maxLength={150} onChange={(e) => setV({ ...v, place: e.target.value })} /></Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button loading={busy} disabled={v.content.trim().length < 3 || (!allDay && !from) || (!allDay && !!to && to <= from)} onClick={async () => {
            setBusy(true);
            const time = allDay ? "Cả ngày" : to ? `${from} – ${to}` : from;
            const res = await saveScheduleItemAction({ startYear: year, week, itemId: item?.id, date, time, ...v });
            setBusy(false);
            if (reportResult(res)) { onClose(); router.refresh(); }
          }}>Lưu</Button>
        </div>
      </div>
    </Modal>
  );
}

export function ScheduleEditor({ year, week, published, itemCount, days, publicHref }: {
  year: number; week: number; published: boolean; itemCount: number; days: ScheduleDay[]; publicHref: string;
}) {
  const router = useRouter();
  const [dlg, setDlg] = useState<{ date: string; item?: Item } | null>(null);
  const [notify, setNotify] = useState(true);
  return (
    <>
      <div className="mb-4 flex items-center gap-2 sm:flex-wrap">
        <StatusBadge tone={published ? "green" : "gray"}>{published ? "Đã công bố" : "Bản nháp"}</StatusBadge>
        <span className="text-sm whitespace-nowrap text-muted">{itemCount} <span className="max-sm:hidden">công </span>việc</span>
        <div className="ml-auto flex gap-1.5 sm:flex-wrap sm:gap-2">
          <ConfirmButton triggerVariant="secondary" trigger={<><Copy className="size-4" /><span className="max-sm:hidden">Sao chép tuần trước</span></>} triggerLabel="Sao chép tuần trước" title="Sao chép từ tuần trước?"
            description="Thêm toàn bộ công việc của tuần trước vào tuần này (dời đúng 7 ngày). Các công việc đang có được giữ nguyên." confirmLabel="Sao chép"
            onConfirm={async () => { reportResult(await copyPreviousWeekAction({ startYear: year, week })); router.refresh(); }} />
          <a href={publicHref} target="_blank" aria-label="Xem / In bản công khai" title="Xem / In bản công khai" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-white px-2.5 text-sm font-medium hover:bg-slate-50 sm:px-3"><Printer className="size-4" /><span className="max-sm:hidden">Xem / In bản công khai</span></a>
          {published ? (
            <ConfirmButton triggerVariant="secondary" trigger={<><EyeOff className="size-4" /><span className="max-sm:hidden">Hủy công bố</span></>} triggerLabel="Hủy công bố" title="Hủy công bố lịch tuần này?" description="Lịch sẽ không còn hiện trên trang công khai." confirmLabel="Hủy công bố"
              onConfirm={async () => { reportResult(await setSchedulePublishedAction({ startYear: year, week, published: false })); router.refresh(); }} />
          ) : (
            <ConfirmButton triggerVariant="primary" size="md" trigger={<><Eye className="size-4" />Công bố</>} triggerLabel="Công bố" title="Công bố lịch công tác tuần này?" confirmLabel="Công bố"
              description={<label className="mt-2 flex items-center gap-2 text-sm text-foreground"><input type="checkbox" className="size-4 accent-[#0b63b8]" checked={notify} onChange={(e) => setNotify(e.target.checked)} />Gửi thông báo cho mọi người dùng</label>}
              onConfirm={async () => { reportResult(await setSchedulePublishedAction({ startYear: year, week, published: true, notify })); router.refresh(); }} />
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white/85">
        {days.map((d) => (
          <div key={d.date} className="grid gap-x-4 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-[9rem_1fr]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold text-primary-dark">{d.label}</span>
              <Button variant="ghost" size="sm" className="sm:hidden" onClick={() => setDlg({ date: d.date })} aria-label="Thêm công việc"><Plus className="size-4" /></Button>
            </div>
            <div className="space-y-2">
              {d.items.length === 0 && <div className="text-sm text-muted">—</div>}
              {d.items.map((it) => (
                <div key={it.id} className="flex items-start gap-2 rounded-md bg-slate-50/70 px-3 py-2">
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="font-medium">{it.time && <span className="mr-1.5 text-primary">{it.time}</span>}{it.content}</div>
                    {(it.assignee || it.place) && <div className="text-xs text-muted">{[it.assignee && `Phụ trách: ${it.assignee}`, it.place && `Địa điểm: ${it.place}`].filter(Boolean).join(" · ")}</div>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDlg({ date: d.date, item: it })} aria-label="Sửa"><Pencil className="size-3.5" /></Button>
                  <ConfirmButton triggerVariant="ghost" triggerClassName="text-danger" triggerLabel="Xóa" trigger={<Trash2 className="size-3.5" />} title="Xóa công việc này?" danger confirmLabel="Xóa"
                    onConfirm={async () => { reportResult(await deleteScheduleItemAction(it.id)); router.refresh(); }} />
                </div>
              ))}
              <Button variant="ghost" size="sm" className="max-sm:hidden" onClick={() => setDlg({ date: d.date })}><Plus className="size-3.5" />Thêm công việc</Button>
            </div>
          </div>
        ))}
      </div>
      {dlg && <ItemDialog year={year} week={week} date={dlg.date} item={dlg.item} onClose={() => setDlg(null)} />}
    </>
  );
}
