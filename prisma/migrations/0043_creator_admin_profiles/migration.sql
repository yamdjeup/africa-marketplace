-- Profils createurs geres par l'admin
ALTER TABLE "Creator" ADD COLUMN "profileOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Creator" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Creator" ADD COLUMN "categorySlugs" TEXT NOT NULL DEFAULT '';
