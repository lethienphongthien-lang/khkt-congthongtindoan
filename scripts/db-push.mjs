// Chạy `prisma db push` có thử lại: DB gói nhỏ có thể tạm hết kết nối khi các instance đang chạy giữ pool.
import { spawnSync } from "node:child_process";

// Prisma cần DIRECT_URL (kết nối trực tiếp, không qua pooler) để tạo/cập nhật bảng.
// Nếu chưa đặt thì dùng chung DATABASE_URL (trường hợp chưa dùng pooler).
import { readFileSync } from "node:fs";
const fromFile = {};
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) fromFile[m[1]] = m[2].replace(/^"|"$/g, "");
  }
} catch {}
const get = (k) => process.env[k] || fromFile[k];
const env = { ...process.env, DIRECT_URL: get("DIRECT_URL") || get("DATABASE_URL") };

const MAX = 6;
for (let i = 1; i <= MAX; i++) {
  const r = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], { encoding: "utf8", env, shell: process.platform === "win32" });
  process.stdout.write(r.stdout ?? "");
  process.stderr.write(r.stderr ?? "");
  if (r.status === 0) process.exit(0);
  const busy = /too many connections|Schema engine error|timed out/i.test((r.stdout ?? "") + (r.stderr ?? ""));
  if (!busy || i === MAX) process.exit(r.status ?? 1);
  console.log(`[db-push] DB bận, thử lại lần ${i + 1}/${MAX} sau 15 giây...`);
  await new Promise((res) => setTimeout(res, 15000));
}
