import units from "@/data/vn-admin-units.json";

type Province = { code: number; name: string; wards: string[] };
const data = units as Province[];

/** Đơn vị hành chính sau sắp xếp (34 tỉnh, thành phố; chỉ còn cấp xã/phường). Không có `province`: danh sách tỉnh; có `province=<mã>`: danh sách xã/phường của tỉnh đó. */
export async function GET(req: Request) {
  const code = Number(new URL(req.url).searchParams.get("province"));
  const headers = { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" };
  if (Number.isFinite(code) && code > 0) {
    const p = data.find((x) => x.code === code);
    return Response.json({ wards: p?.wards ?? [] }, { headers });
  }
  return Response.json({ provinces: data.map((p) => ({ code: p.code, name: p.name })) }, { headers });
}
