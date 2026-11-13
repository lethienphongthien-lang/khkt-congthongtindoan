-- Owned by Cổng Đoàn. Safe to run repeatedly; does not require EduConnect.
ALTER TABLE public."Department" ADD COLUMN IF NOT EXISTS "presidentId" text;
CREATE UNIQUE INDEX IF NOT EXISTS "Department_presidentId_key" ON public."Department"("presidentId");
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='Department_presidentId_fkey' AND conrelid='public."Department"'::regclass) THEN
    ALTER TABLE public."Department" ADD CONSTRAINT "Department_presidentId_fkey" FOREIGN KEY("presidentId") REFERENCES public."User"(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.clear_departed_class_offices() RETURNS trigger AS $$
BEGIN
  IF OLD."departmentId" IS DISTINCT FROM NEW."departmentId" OR NEW.status::text<>'ACTIVE' THEN
    UPDATE public."Department" SET "secretaryId"=NULL,"updatedAt"=now() WHERE "secretaryId"=NEW."userId";
    UPDATE public."Department" SET "presidentId"=NULL,"updatedAt"=now() WHERE "presidentId"=NEW."userId";
    DELETE FROM public."DepartmentMonitor" WHERE "userId"=NEW."userId";
    UPDATE public."User" SET role='MEMBER',"updatedAt"=now() WHERE id=NEW."userId" AND role::text IN ('SECRETARY','MONITOR');
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS clear_departed_class_offices ON public."Member";
CREATE TRIGGER clear_departed_class_offices AFTER UPDATE OF "departmentId",status ON public."Member" FOR EACH ROW EXECUTE FUNCTION public.clear_departed_class_offices();
