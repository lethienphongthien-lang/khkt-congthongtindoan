import assert from "node:assert/strict";
import { after,test } from "node:test";
import { db } from "../src/lib/db";
import { appointTeacher,changeLeaderStatus,createStandaloneLeader } from "../src/lib/services/union-leaders";
const run=process.env.RUN_SHARED_TEACHER_TESTS==="1";
after(async()=>db.$disconnect());
test("BCH teacher link preserves Edu roles; pupil BCH uses a separate identity; no other web server is required",{skip:!run},async()=>{
  assert.ok(["127.0.0.1","localhost"].includes(new URL(process.env.DATABASE_URL!).hostname));
  const k=crypto.randomUUID().replaceAll("-","");const eid=`edu${k}`,tid=`teacher${k}`;
  const admin=await db.user.create({data:{username:`sa${k}`,fullName:"Admin",role:"ADMIN",superAdmin:true,passwordHash:"x"}});
  const teacher=await db.user.create({data:{username:`gv${k}`,fullName:"Giáo viên",role:"EXTERNAL",passwordHash:"teacher-password"}});
  const pupil=await db.user.create({data:{username:`hs${k}`,fullName:"Học sinh",role:"MEMBER",passwordHash:"pupil-password"}});
  const pid=`pupil${k}`;let separate:string|undefined;
  try{
    await db.$executeRaw`INSERT INTO edu."User"(id,"accountId",email,roles,"updatedAt") VALUES(${eid},${teacher.id},${eid+'@test.invalid'},ARRAY['SUBJECT_TEACHER']::edu."Role"[],now())`;
    await db.$executeRaw`INSERT INTO edu."Teacher"(id,"userId","fullName") VALUES(${tid},${eid},'Giáo viên')`;
    await db.$executeRaw`INSERT INTO edu."User"(id,"accountId",email,roles,"updatedAt") VALUES(${pid},${pupil.id},${pid+'@test.invalid'},ARRAY['STUDENT']::edu."Role"[],now())`;
    await appointTeacher(admin.id,teacher.id,"Bí thư");
    assert.equal((await db.user.findUniqueOrThrow({where:{id:teacher.id}})).role,"ADMIN");
    const [edu]=await db.$queryRaw<{roles:string}[]>`SELECT roles::text FROM edu."User" WHERE id=${eid}`;assert.equal(edu.roles,"{SUBJECT_TEACHER}");
    await assert.rejects(appointTeacher(admin.id,pupil.id,"BCH"));
    const bch=await createStandaloneLeader(admin.id,{username:`bch${k}`,fullName:pupil.fullName,position:"Ủy viên",passwordHash:"separate"});separate=bch.id;
    assert.notEqual(bch.id,pupil.id);assert.equal((await db.user.findUniqueOrThrow({where:{id:pupil.id}})).passwordHash,"pupil-password");
    process.env.EDUCONNECT_INTEGRATION="off";
    await changeLeaderStatus(admin.id,teacher.id,"LOCKED");
    const revoked=await db.user.findUniqueOrThrow({where:{id:teacher.id}});assert.equal(revoked.role,"EXTERNAL");assert.equal(revoked.status,"ACTIVE");assert.equal(revoked.passwordHash,"teacher-password");
  }finally{
    delete process.env.EDUCONNECT_INTEGRATION;
    await db.$executeRaw`DELETE FROM edu."Teacher" WHERE id=${tid}`;
    await db.$executeRaw`DELETE FROM edu."User" WHERE id IN (${eid},${pid})`;
    const ids=[admin.id,teacher.id,pupil.id,...(separate?[separate]:[])];
    await db.auditLog.deleteMany({where:{OR:[{userId:{in:ids}},{targetId:{in:ids}}]}});await db.user.deleteMany({where:{id:{in:ids}}});
  }
});
