"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus, RotateCcw } from "lucide-react";
import { resetSchoolYearAction, saveSchoolYearAction } from "@/actions/school-year";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { ConfirmButton, Modal } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";
import { DataTable, StatusBadge, Td, Th } from "@/components/ui/misc";
import { schoolYearOf, weekLabel, yearLabel, type SchoolCalendar } from "@/lib/school-calendar";

type Row = SchoolCalendar & { custom: boolean };

function FormButton({ row }: { row?: Row }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const base = row ?? { startYear: schoolYearOf() + 1, week1Start: `${schoolYearOf() + 1}-09-05`, sem1Weeks: 18, totalWeeks: 35 };
  const [v, setV] = useState({ startYear: String(base.startYear), week1Start: base.week1Start, sem1Weeks: String(base.sem1Weeks), totalWeeks: String(base.totalWeeks) });
  const [busy, setBusy] = useState(false);
  const cal: SchoolCalendar = { startYear: +v.startYear, week1Start: v.week1Start, sem1Weeks: +v.sem1Weeks || 1, totalWeeks: +v.totalWeeks || 1 };
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(v.week1Start) && cal.totalWeeks > cal.sem1Weeks;
  return (
    <>
      <Button variant={row ? "ghost" : "primary"} size={row ? "sm" : "md"} onClick={() => setOpen(true)} aria-label={row ? t("ui.sy.edit") : t("ui.sy.add")}>
        {row ? <Pencil className="size-3.5" /> : <><Plus className="size-4" />{t("ui.sy.add")}</>}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={row ? t("ui.sy.calTitle", { y: yearLabel(row.startYear) }) : t("ui.sy.add")} className="max-w-md">
        <div className="space-y-3">
          <Field className="text-left" label={t("ui.sy.start")} hint={t("ui.schoolYearN", { y: yearLabel(+v.startYear || 0) })}><Input type="number" value={v.startYear} disabled={!!row} onChange={(e) => setV({ ...v, startYear: e.target.value })} /></Field>
          <Field label={t("ui.sy.week1")} required className="text-left"><Input type="date" value={v.week1Start} onChange={(e) => setV({ ...v, week1Start: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("ui.sy.sem1")} className="text-left"><Input type="number" min={1} value={v.sem1Weeks} onChange={(e) => setV({ ...v, sem1Weeks: e.target.value })} /></Field>
            <Field label={t("ui.sy.total")} className="text-left"><Input type="number" min={2} max={52} value={v.totalWeeks} onChange={(e) => setV({ ...v, totalWeeks: e.target.value })} /></Field>
          </div>
          {valid && (
            <ul className="space-y-0.5 rounded-md bg-primary-light px-3 py-2 text-left text-xs break-words text-primary-dark">
              <li>{t("ui.sy.begin")} <b>{weekLabel(cal, 1, t("misc.week"))}</b></li>
              <li>{t("ui.sy.sem1End")} <b>{weekLabel(cal, cal.sem1Weeks, t("misc.week"))}</b></li>
              <li>{t("ui.sy.sem2")} <b>{weekLabel(cal, cal.sem1Weeks + 1, t("misc.week"))}</b> → <b>{weekLabel(cal, cal.totalWeeks, t("misc.week"))}</b></li>
            </ul>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>{t("app.ui.cancel")}</Button>
            <Button loading={busy} disabled={!valid} onClick={async () => {
              setBusy(true);
              const res = await saveSchoolYearAction({ startYear: +v.startYear, week1Start: v.week1Start, sem1Weeks: +v.sem1Weeks, totalWeeks: +v.totalWeeks });
              setBusy(false);
              if (reportResult(res)) { setOpen(false); router.refresh(); }
            }}>{t("ui.save")}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function SchoolYearManager({ rows, canEdit = true }: { rows: Row[]; canEdit?: boolean }) {
  const t = useT();
  const router = useRouter();
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{t("ui.sy.intro")}</p>
        {canEdit && <FormButton />}
      </div>
      <DataTable>
        <thead><tr><Th>{t("ui.sy.colYear")}</Th><Th>{t("ui.sy.colW1")}</Th><Th className="text-right">{t("ui.sy.colHk1")}</Th><Th className="text-right">{t("ui.sy.colTotal")}</Th><Th>{t("ui.sy.colSrc")}</Th><Th /></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.startYear}>
            <Td className="font-medium">{yearLabel(r.startYear)}</Td>
            <Td className="whitespace-nowrap">{r.week1Start.split("-").reverse().join("/")}</Td>
            <Td className="text-right tabular-nums">{t("ui.sy.weeks", { n: r.sem1Weeks })}</Td>
            <Td className="text-right tabular-nums">{t("ui.sy.weeks", { n: r.totalWeeks })}</Td>
            <Td><StatusBadge tone={r.custom ? "green" : "gray"}>{r.custom ? t("ui.sy.custom") : t("ui.sy.default")}</StatusBadge></Td>
            <Td className="text-right whitespace-nowrap">
              {canEdit && <FormButton row={r} />}
              {canEdit && r.custom && <ConfirmButton triggerVariant="ghost" triggerLabel={t("ui.sy.reset")} trigger={<RotateCcw className="size-3.5" />} title={t("ui.sy.resetTitle")} description={t("ui.sy.resetDesc")} confirmLabel={t("ui.sy.resetBtn")}
                onConfirm={async () => { reportResult(await resetSchoolYearAction(r.startYear)); router.refresh(); }} />}
            </Td>
          </tr>
        ))}</tbody>
      </DataTable>
    </>
  );
}
