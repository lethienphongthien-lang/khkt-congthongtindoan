import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
try { process.loadEnvFile(".env"); } catch(e) { if(e.code!=="ENOENT") throw e; }
const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_POOLED_URL || process.env.DATABASE_URL });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 57014 = statement timeout, 55P03 = lock not available, 40P01 = deadlock: thường do các truy vấn của bản đang chạy giữ khóa bảng => thử lại.
const retryable = (e) => /57014|55P03|40P01|statement timeout|lock timeout|deadlock/i.test(`${e?.meta?.code ?? ""} ${e?.message ?? ""}`);
async function exec(stmt) {
  for (let i = 1; ; i++) {
    try { return await db.$executeRawUnsafe(stmt); }
    catch (e) {
      if (!retryable(e) || i >= 6) throw e;
      console.log(`[install-officers] DB bận (khóa bảng), thử lại lần ${i + 1}/6 sau 10 giây...`);
      await sleep(10000);
    }
  }
}
try {
  const raw = readFileSync(new URL("../prisma/independent-officers.sql",import.meta.url),"utf8");
  const sql = raw.replace(/--.*$/gm,"");
  const hash = createHash("sha1").update(raw).digest("hex");
  // Đã cài đúng phiên bản này rồi thì bỏ qua: tránh ALTER TABLE/CREATE TRIGGER (cần khóa bảng) ở mỗi lần deploy.
  const cur = await db.$queryRawUnsafe(`SELECT obj_description(to_regprocedure('public.clear_departed_class_offices()'),'pg_proc') AS c`);
  if (cur?.[0]?.c === hash) { console.log("Chức danh lớp độc lập đã được cài đặt (bỏ qua)."); }
  else {
    // Không dùng transaction tương tác: qua pooler (pgbouncer) transaction dễ bị đóng (P2028). Mọi câu lệnh đều idempotent.
    let start=0,body=false;
    for(let i=0;i<sql.length;i++){
      if(sql.slice(i,i+2)==="$$"){body=!body;i++;}
      else if(sql[i]===";"&&!body){const s=sql.slice(start,i+1); if(s.trim()!==";") await exec(s); start=i+1;}
    }
    await exec(`COMMENT ON FUNCTION public.clear_departed_class_offices() IS '${hash}'`);
    console.log("Đã cài đặt chức danh lớp độc lập (không cần EduConnect).");
  }
} finally {await db.$disconnect();}
