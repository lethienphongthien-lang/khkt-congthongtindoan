"use client";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { runCleanupAction } from "@/actions/cleanup";
import { ConfirmButton } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";
import { Alert, DataTable, Td, Th } from "@/components/ui/misc";
import type { CloudinaryUsage } from "@/lib/cloudinary";

const mb = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export function DataManager({ cloud, totalBytes, tables, retention }: {
  cloud: CloudinaryUsage | { error: string }; totalBytes: number; tables: { name: string; rows: number; bytes: number }[]; retention: { notificationRead: number; notificationAny: number; auditLog: number };
}) {
  const router = useRouter();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="text-xs text-muted">Dung lượng database đang dùng</div>
        <div className="mt-0.5 text-2xl font-semibold tabular-nums">{mb(totalBytes)}</div>
      </div>
      <div>
        <h3 className="mb-2 text-[15px] font-semibold">Ảnh và tệp trên Cloudinary</h3>
        {"error" in cloud ? <Alert tone="amber">Không đọc được số liệu Cloudinary. {cloud.error}</Alert> : (
          <div className="space-y-3 rounded-lg border border-border bg-white/85 p-4">
            {cloud.credits && (
              <div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">Credit đã dùng trong tháng</span>
                  <span className="tabular-nums">{cloud.credits.used.toFixed(2)} / {cloud.credits.limit} ({cloud.credits.percent.toFixed(0)}%)</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full ${cloud.credits.percent >= 100 ? "bg-danger" : cloud.credits.percent >= 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min(100, cloud.credits.percent)}%` }} />
                </div>
                {cloud.credits.percent >= 80 && <p className="mt-1 text-xs text-amber-700">Sắp hết hạn mức tháng này. Ảnh có thể ngừng hiển thị khi vượt hạn mức, nên hãy giảm ảnh nặng hoặc nâng gói.</p>}
              </div>
            )}
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-muted">Dung lượng lưu trữ</dt><dd className="text-lg font-semibold tabular-nums">{mb(cloud.storageBytes)}</dd></div>
              <div><dt className="text-xs text-muted">Băng thông tháng này</dt><dd className="text-lg font-semibold tabular-nums">{mb(cloud.bandwidthBytes)}</dd></div>
              <div><dt className="text-xs text-muted">Lượt biến đổi ảnh</dt><dd className="text-lg font-semibold tabular-nums">{cloud.transformations.toLocaleString("vi-VN")}</dd></div>
              <div><dt className="text-xs text-muted">Số tệp</dt><dd className="text-lg font-semibold tabular-nums">{cloud.objects.toLocaleString("vi-VN")}</dd></div>
            </dl>
            <p className="text-xs text-muted">{cloud.plan ? `Gói ${cloud.plan}. ` : ""}Credit tính chung cho lưu trữ, băng thông và biến đổi ảnh (1 credit ≈ 1 GB lưu trữ hoặc băng thông, hoặc 1.000 lượt biến đổi). Số liệu do Cloudinary cập nhật theo chu kỳ nên có thể chậm vài giờ.</p>
          </div>
        )}
      </div>
      <div>
        <h3 className="mb-2 text-[15px] font-semibold">Bảng lớn nhất</h3>
        <DataTable>
          <thead><tr><Th>Bảng</Th><Th className="text-right">Số dòng</Th><Th className="text-right">Dung lượng</Th></tr></thead>
          <tbody>{tables.map((t) => <tr key={t.name}><Td className="font-mono text-[13px]">{t.name}</Td><Td className="text-right tabular-nums">{t.rows.toLocaleString("vi-VN")}</Td><Td className="text-right tabular-nums">{mb(t.bytes)}</Td></tr>)}</tbody>
        </DataTable>
      </div>
      <div>
        <h3 className="mb-1 text-[15px] font-semibold">Dọn dữ liệu cũ tự động</h3>
        <p className="mb-3 text-sm text-muted">
          Mỗi ngày hệ thống tự xóa thông báo đã đọc quá {retention.notificationRead} ngày, thông báo chưa đọc quá {retention.notificationAny} ngày và nhật ký hệ thống quá {retention.auditLog} ngày.
          Điểm, lượt truy cập, báo cáo và bài viết được giữ lâu dài.
        </p>
        <ConfirmButton triggerVariant="secondary" trigger={<><Trash2 className="size-4" />Dọn ngay</>} title="Dọn dữ liệu cũ ngay?" confirmLabel="Dọn ngay"
          description="Xóa các thông báo và nhật ký đã quá hạn giữ nêu trên. Không thể hoàn tác."
          onConfirm={async () => { reportResult(await runCleanupAction()); router.refresh(); }} />
      </div>
    </div>
  );
}
