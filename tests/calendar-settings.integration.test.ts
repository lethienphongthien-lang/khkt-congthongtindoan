import assert from "node:assert/strict";
import { after,test } from "node:test";
import { db } from "../src/lib/db";
import { resetConfiguredCalendar } from "../src/lib/services/calendar-settings";
const run=process.env.RUN_CALENDAR_TESTS==="1";
class Rollback extends Error{}
after(async()=>db.$disconnect());
test("reset keeps a persisted shared year and updates Edu year and both semesters",{skip:!run},async()=>{
  try{await db.$transaction(async tx=>{
    const [{ready}]=await tx.$queryRaw<{ready:boolean}[]>`SELECT to_regclass('edu."AcademicYear"') IS NOT NULL AS ready`;
    assert.ok(ready,"This rollback test requires a shared-schema database");
    await tx.$executeRaw`UPDATE edu."SyncSetting" SET enabled=true WHERE id=1`;
    const y=2051;
    await tx.schoolYear.upsert({where:{startYear:y},create:{startYear:y,week1Start:`${y}-09-12`,sem1Weeks:17,totalWeeks:34},update:{week1Start:`${y}-09-12`,sem1Weeks:17,totalWeeks:34}});
    await resetConfiguredCalendar(y,tx);
    const saved=await tx.schoolYear.findUniqueOrThrow({where:{startYear:y}});assert.equal(saved.week1Start,`${y}-09-05`);assert.equal(saved.sem1Weeks,18);assert.equal(saved.totalWeeks,35);
    const [edu]=await tx.$queryRaw<{start:string;days:number;terms:bigint}[]>`SELECT to_char(y."startDate",'YYYY-MM-DD') AS start,(y."endDate"::date-y."startDate"::date+1) AS days,(SELECT count(*) FROM edu."AcademicTerm" t WHERE t."academicYearId"=y.id) AS terms FROM edu."AcademicYear" y WHERE y."schoolYear"=${y}`;
    assert.equal(edu.start,`${y}-09-05`);assert.equal(edu.days,245);assert.equal(Number(edu.terms),2);
    const terms=await tx.$queryRaw<{name:string;days:number}[]>`SELECT t."termName" AS name,(t."endDate"::date-t."startDate"::date+1) AS days FROM edu."AcademicTerm" t JOIN edu."AcademicYear" y ON y.id=t."academicYearId" WHERE y."schoolYear"=${y} ORDER BY t."termName"`;
    assert.deepEqual(terms,[{name:"HK1",days:126},{name:"HK2",days:119}]);throw new Rollback();
  },{timeout:30000});}catch(e){if(!(e instanceof Rollback))throw e;}
});
