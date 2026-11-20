"use client";
import { useT } from "@/lib/i18n/client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Lock, Unlock } from "lucide-react";
import { Modal, ConfirmButton } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { savePeriodAction, deletePeriodAction } from "@/actions/chapter-reports";

export interface PeriodItem {
  id: string;
  title: string;
  description?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  academicYear?: string | null;
  status: string;
  _count?: { reports: number };
}

function toDateInput(d?: Date | string | null): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

export function PeriodModalButton({
  period,
  schoolYears = [],
  trigger,
  className,
}: {
  period?: PeriodItem;
  schoolYears?: string[];
  trigger?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const list = new Set(schoolYears);
    if (list.size === 0) {
      for (const y of [currentYear + 1, currentYear, currentYear - 1, currentYear - 2]) {
        list.add(`${y}-${y + 1}`);
      }
    }
    if (period?.academicYear) {
      list.add(period.academicYear);
    }
    return Array.from(list).sort().reverse();
  }, [schoolYears, period?.academicYear, currentYear]);

  const defaultYear = period?.academicYear ?? availableYears[0] ?? `${currentYear}-${currentYear + 1}`;

  const [title, setTitle] = useState(period?.title ?? "");
  const [description, setDescription] = useState(period?.description ?? "");
  const [academicYear, setAcademicYear] = useState(defaultYear);
  const [startDate, setStartDate] = useState(toDateInput(period?.startDate));
  const [endDate, setEndDate] = useState(toDateInput(period?.endDate));
  const [status, setStatus] = useState(period?.status ?? "OPEN");

  const reset = () => {
    setTitle(period?.title ?? "");
    setDescription(period?.description ?? "");
    setAcademicYear(defaultYear);
    setStartDate(toDateInput(period?.startDate));
    setEndDate(toDateInput(period?.endDate));
    setStatus(period?.status ?? "OPEN");
  };

  const handleOpen = () => {
    reset();
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(t("cms.pm.needTitle"));
      return;
    }
    setBusy(true);
    const res = await savePeriodAction(period?.id ?? null, {
      title,
      description,
      academicYear: academicYear || null,
      startDate: startDate || null,
      endDate: endDate || null,
      status,
    });
    setBusy(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    toast.success(res.message);
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <span onClick={handleOpen} className={className}>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-4" />
            {t("cms.pm.create")}
          </Button>
        )}
      </span>

      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title={period ? t("cms.pm.editTitle") : t("cms.pm.newTitle")}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <Field label={t("cms.pm.title")} required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("cms.pm.titleEx")}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("cms.pm.year")}>
              <Select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
                <option value="">{t("cms.pm.noYear")}</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {t("cms.pm.yearOpt", { y })}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("cms.pm.status")}>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="OPEN">{t("cms.pm.open")}</option>
                <option value="CLOSED">{t("cms.pm.closed")}</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("cms.pm.start")}>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>
            <Field label={t("cms.pm.due")}>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
          </div>

          <Field label={t("cms.pm.notes")}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("cms.pm.notesEx")}
              rows={3}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              {t("cms.c.cancel")}
            </Button>
            <Button loading={busy} onClick={handleSubmit}>
              {period ? t("cms.c.saveChanges") : t("cms.pm.createBtn")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function PeriodRowActions({
  period,
  schoolYears,
}: {
  period: PeriodItem;
  schoolYears?: string[];
}) {
  const router = useRouter();
  const t = useT();

  const handleToggleStatus = async () => {
    const nextStatus = period.status === "OPEN" ? "CLOSED" : "OPEN";
    const res = await savePeriodAction(period.id, {
      title: period.title,
      description: period.description,
      academicYear: period.academicYear,
      startDate: period.startDate ? toDateInput(period.startDate) : null,
      endDate: period.endDate ? toDateInput(period.endDate) : null,
      status: nextStatus,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(nextStatus === "OPEN" ? t("cms.pm.reopened") : t("cms.pm.closedMsg"));
    router.refresh();
  };

  const handleDelete = async () => {
    const res = await deletePeriodAction(period.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message);
    router.refresh();
  };

  return (
    <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <PeriodModalButton
        period={period}
        schoolYears={schoolYears}
        trigger={
          <Button variant="ghost" size="sm" title={t("cms.pm.editTip")}>
            <Edit2 className="size-4" />
          </Button>
        }
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggleStatus}
        title={period.status === "OPEN" ? t("cms.pm.closeTip") : t("cms.pm.reopenTip")}
      >
        {period.status === "OPEN" ? (
          <Lock className="size-4 text-amber-600" />
        ) : (
          <Unlock className="size-4 text-emerald-600" />
        )}
      </Button>

      {(period._count?.reports ?? 0) === 0 && (
        <ConfirmButton
          trigger={<Trash2 className="size-4" />}
          triggerVariant="ghost"
          size="sm"
          danger
          title={t("cms.pm.delTitle")}
          description={t("cms.pm.delDesc", { title: period.title })}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
