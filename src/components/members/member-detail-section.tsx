import { db } from "@/lib/db";
import { formatDate } from "@/utils";
import { Section } from "@/components/ui/misc";
import { DETAIL_GROUPS, type DetailField } from "@/lib/member-detail-fields";

const mask = (v: string) => (v.length > 4 ? `${"•".repeat(v.length - 4)}${v.slice(-4)}` : v);

/** Hồ sơ đoàn viên chi tiết (theo mẫu Sổ đoàn viên điện tử). Chỉ hiển thị cho Admin và chính đoàn viên; sửa ở trang Sửa đoàn viên. */
export async function MemberDetailSection({ memberId }: { memberId: string }) {
  const d = await db.memberDetail.findUnique({ where: { memberId } });
  const rec = (d ?? {}) as Record<string, unknown>;
  const show = (f: DetailField): React.ReactNode => {
    const v = rec[f.key];
    if (f.type === "bool") return v ? "Có" : "Không";
    if (v === null || v === undefined || v === "") return <span className="text-muted">—</span>;
    if (f.type === "date") return formatDate(v as Date);
    if (f.key === "idNumber") return <span className="font-mono">{mask(String(v))}</span>;
    return String(v);
  };
  return (
    <Section>
      <div className="space-y-5">
        {DETAIL_GROUPS.map((g) => (
          <div key={g.title}>
            <h3 className="mb-2 text-[13px] font-semibold text-muted uppercase">{g.title}</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-3">
              {g.fields.map((f) => <div key={f.key}><dt className="text-xs text-muted">{f.label}</dt><dd className="mt-0.5 break-words">{show(f)}</dd></div>)}
            </dl>
          </div>
        ))}
      </div>
    </Section>
  );
}
