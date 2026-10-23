"use client";
import { useEffect, useState } from "react";
import { Input, Select } from "@/components/ui/form";
import { SearchSelect } from "@/components/ui/search-select";
import { DETAIL_GROUPS } from "@/lib/member-detail-fields";
import { MIN_ID_ISSUE, digitsOnly, todayVN } from "@/lib/validation/rules";

type Prov = { code: number; name: string };
let provPromise: Promise<Prov[]> | null = null;
const wardCache = new Map<number, Promise<string[]>>();
const loadProvinces = () => (provPromise ??= fetch("/api/admin-units").then((r) => r.json()).then((j) => j.provinces as Prov[]).catch(() => { provPromise = null; return []; }));
const loadWards = (code: number) => { let p = wardCache.get(code); if (!p) { p = fetch(`/api/admin-units?province=${code}`).then((r) => r.json()).then((j) => j.wards as string[]).catch(() => { wardCache.delete(code); return []; }); wardCache.set(code, p); } return p; };

/** Chọn Tỉnh/Thành phố hoặc Phường/Xã theo danh mục hành chính hiện hành (34 tỉnh, thành phố; chỉ còn hai cấp). Giá trị lưu là tên; giá trị cũ không có trong danh mục vẫn giữ nguyên. */
function AdminSelect({ kind, province, value, onChange }: { kind: "province" | "ward"; province: string; value: string; onChange: (v: string) => void }) {
  const [provs, setProvs] = useState<Prov[]>([]);
  const [wards, setWards] = useState<string[]>([]);
  useEffect(() => { let on = true; loadProvinces().then((p) => on && setProvs(p)); return () => { on = false; }; }, []);
  const code = provs.find((p) => p.name === province)?.code;
  useEffect(() => { let on = true; if (kind === "ward" && code) loadWards(code).then((w) => on && setWards(w)); else setWards([]); return () => { on = false; }; }, [kind, code]);
  const names = kind === "province" ? provs.map((p) => p.name) : wards;
  return <SearchSelect value={value} options={names} onChange={onChange} disabled={kind === "ward" && !province} placeholder={kind === "ward" && !province ? "Chọn Tỉnh/Thành phố trước" : kind === "province" ? "Gõ để tìm tỉnh, thành phố" : "Gõ để tìm xã, phường"} />;
}

export type DetailValues = Record<string, string | boolean>;

/** Thuộc tính ô nhập theo từng trường: SĐT và CCCD chỉ gõ được chữ số, ngày cấp không được sau hôm nay, email đúng dạng. */
function inputProps(key: string, type?: string): React.InputHTMLAttributes<HTMLInputElement> {
  if (key === "phone") return { type: "tel", inputMode: "numeric", maxLength: 10, pattern: "0[0-9]{9}", placeholder: "0912345678", autoComplete: "tel" };
  if (key === "idNumber") return { type: "text", inputMode: "numeric", maxLength: 12, pattern: "([0-9]{9}|[0-9]{12})", placeholder: "9 hoặc 12 chữ số" };
  if (key === "idIssuedAt") return { type: "date", min: MIN_ID_ISSUE, max: todayVN() };
  if (key === "email") return { type: "email", maxLength: 120, placeholder: "ten@gmail.com", autoComplete: "email" };
  return { type: type === "date" ? "date" : "text" };
}

const ADDR_LABEL = { hometown: "quê quán", permanent: "thường trú", current: "nơi ở hiện nay" } as const;
const SOURCES = { hometown: [], permanent: ["hometown"], current: ["hometown", "permanent"] } as const;

/** Các ô nhập hồ sơ chi tiết (Sổ đoàn viên điện tử), dùng trong form thêm/sửa đoàn viên. */
function Cell({ label, hint, error, className, children }: { label: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <div className="mb-0.5 text-xs font-medium text-slate-600">{label}</div>
      {children}
      {hint && !error && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
      {error && <div className="mt-0.5 text-xs text-danger">{error}</div>}
    </div>
  );
}

/** Các ô nhập hồ sơ chi tiết (Sổ đoàn viên điện tử), bố cục gọn nhiều cột để nhìn bao quát. */
export function DetailFields({ values, onChange, errors = {} }: { values: DetailValues; onChange: (key: string, v: string | boolean) => void; errors?: Record<string, string> }) {
  return (
    <div className="space-y-4">
      {DETAIL_GROUPS.map((g) => (
        <div key={g.title}>
          <h3 className="mb-1.5 flex flex-wrap items-baseline gap-x-2 text-[12px] font-semibold text-muted uppercase">{g.title}{g.note && <span className="text-[11px] font-normal normal-case">{g.note}</span>}
            {g.address && SOURCES[g.address].map((from) => (
              <button key={from} type="button" className="text-[12px] font-normal normal-case text-primary hover:underline"
                onClick={() => { for (const part of ["Province", "Ward", "Address"]) onChange(`${g.address}${part}`, String(values[`${from}${part}`] ?? "")); }}>
                Lấy từ {ADDR_LABEL[from]}
              </button>
            ))}</h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 md:grid-cols-3 xl:grid-cols-4">
            {g.fields.map((f) => f.type === "bool" ? (
              <label key={f.key} className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" className="size-4 accent-[#0b63b8]" checked={!!values[f.key]} onChange={(e) => onChange(f.key, e.target.checked)} />{f.label}</label>
            ) : (
              <Cell key={f.key} label={f.label} hint={f.hint} error={errors[f.key]} className={f.key.endsWith("Address") ? "col-span-2 md:col-span-1 xl:col-span-2" : undefined}>
                {f.type === "province" ? (
                  <AdminSelect kind="province" province="" value={String(values[f.key] ?? "")} onChange={(v) => { onChange(f.key, v); onChange(`${f.pair}Ward`, ""); }} />
                ) : f.type === "ward" ? (
                  <AdminSelect kind="ward" province={String(values[`${f.pair}Province`] ?? "")} value={String(values[f.key] ?? "")} onChange={(v) => onChange(f.key, v)} />
                ) : f.type === "search" ? (
                  <SearchSelect value={String(values[f.key] ?? "")} options={f.options!} onChange={(v) => onChange(f.key, v)} placeholder="Gõ để tìm" />
                ) : f.type === "select" ? (
                  <Select value={String(values[f.key] ?? "")} onChange={(e) => onChange(f.key, e.target.value)}><option value="">—</option>{f.options!.map((o) => <option key={o} value={o}>{o}</option>)}</Select>
                ) : (
                  <Input {...inputProps(f.key, f.type)} list={f.list} value={String(values[f.key] ?? "")} onChange={(e) => onChange(f.key, f.key === "phone" ? digitsOnly(e.target.value, 10) : f.key === "idNumber" ? digitsOnly(e.target.value, 12) : f.key === "email" ? e.target.value.replace(/\s/g, "").toLowerCase() : e.target.value)} />
                )}
              </Cell>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
