import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
try { process.loadEnvFile(".env"); } catch(e) { if(e.code!=="ENOENT") throw e; }
const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_POOLED_URL || process.env.DATABASE_URL });
try {
  const sql=readFileSync(new URL("../prisma/independent-officers.sql",import.meta.url),"utf8").replace(/--.*$/gm,"");
  await db.$transaction(async tx=>{
    let start=0,body=false;
    for(let i=0;i<sql.length;i++){
      if(sql.slice(i,i+2)==="$$"){body=!body;i++;}
      else if(sql[i]===";"&&!body){await tx.$executeRawUnsafe(sql.slice(start,i+1));start=i+1;}
    }
  },{timeout:60000});
  console.log("Đã cài đặt chức danh lớp độc lập (không cần EduConnect).");
} finally {await db.$disconnect();}
