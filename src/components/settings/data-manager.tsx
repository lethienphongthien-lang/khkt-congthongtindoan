"use client";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { runCleanupAction } from "@/actions/cleanup";
import { useT } from "@/lib/i18n/client";
import { intlLocale } from "@/lib/i18n/format";
import { useLocale } from "@/lib/i18n/client";
import { ConfirmButton } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";
import { Alert, DataTable, Td, Th } from "@/components/ui/misc";
import type { CloudinaryUsage } from "@/lib/cloudinary";

const mb = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export function DataManager({ cloud, totalBytes, tables, retention }: {
  cloud: CloudinaryUsage | { error: string }; totalBytes: number; tables: { name: string; rows: number; bytes: number }[]; retention: { notificationRead: number; notificationAny: number; auditLog: number };
}) {
  const t = useT();
  const nf = intlLocale(useLocale());
  const router = useRouter();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="text-xs text-muted">{t("ui.dm.dbUsed")}</div>
        <div className="mt-0.5 text-2xl font-semibold tabular-nums">{mb(totalBytes)}</div>
      </div>
      <div>
        <h3 className="mb-2 text-[15px] font-semibold">{t("ui.dm.cloud")}</h3>
        {"error" in cloud ? <Alert tone="amber">{t("ui.dm.cloudErr", { err: cloud.error })}</Alert> : (
          <div className="space-y-3 rounded-lg border border-border bg-white/85 p-4">
            {cloud.credits && (
              <div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{t("ui.dm.credits")}</span>
                  <span className="tabular-nums">{cloud.credits.used.toFixed(2)} / {cloud.credits.limit} ({cloud.credits.percent.toFixed(0)}%)</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full ${cloud.credits.percent >= 100 ? "bg-danger" : cloud.credits.percent >= 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min(100, cloud.credits.percent)}%` }} />
                </div>
                {cloud.credits.percent >= 80 && <p className="mt-1 text-xs text-amber-700">{t("ui.dm.creditWarn")}</p>}
              </div>
            )}
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-muted">{t("ui.dm.storage")}</dt><dd className="text-lg font-semibold tabular-nums">{mb(cloud.storageBytes)}</dd></div>
              <div><dt className="text-xs text-muted">{t("ui.dm.bandwidth")}</dt><dd className="text-lg font-semibold tabular-nums">{mb(cloud.bandwidthBytes)}</dd></div>
              <div><dt className="text-xs text-muted">{t("ui.dm.transforms")}</dt><dd className="text-lg font-semibold tabular-nums">{cloud.transformations.toLocaleString(nf)}</dd></div>
              <div><dt className="text-xs text-muted">{t("ui.dm.objects")}</dt><dd className="text-lg font-semibold tabular-nums">{cloud.objects.toLocaleString(nf)}</dd></div>
            </dl>
            <p className="text-xs text-muted">{cloud.plan ? t("ui.dm.plan", { plan: cloud.plan }) : ""}{t("ui.dm.creditNote")}</p>
          </div>
        )}
      </div>
      <div>
        <h3 className="mb-2 text-[15px] font-semibold">{t("ui.dm.bigTables")}</h3>
        <DataTable>
          <thead><tr><Th>{t("ui.dm.table")}</Th><Th className="text-right">{t("ui.dm.rows")}</Th><Th className="text-right">{t("ui.dm.size")}</Th></tr></thead>
          <tbody>{tables.map((tb) => <tr key={tb.name}><Td className="font-mono text-[13px]">{tb.name}</Td><Td className="text-right tabular-nums">{tb.rows.toLocaleString(nf)}</Td><Td className="text-right tabular-nums">{mb(tb.bytes)}</Td></tr>)}</tbody>
        </DataTable>
      </div>
      <div>
        <h3 className="mb-1 text-[15px] font-semibold">{t("ui.dm.cleanTitle")}</h3>
        <p className="mb-3 text-sm text-muted">
          {t("ui.dm.cleanDesc", { r: retention.notificationRead, a: retention.notificationAny, l: retention.auditLog })}
        </p>
        <ConfirmButton triggerVariant="secondary" trigger={<><Trash2 className="size-4" />{t("ui.dm.cleanNow")}</>} title={t("ui.dm.cleanConfirm")} confirmLabel={t("ui.dm.cleanNow")}
          description={t("ui.dm.cleanConfirmDesc")}
          onConfirm={async () => { reportResult(await runCleanupAction()); router.refresh(); }} />
      </div>
    </div>
  );
}
