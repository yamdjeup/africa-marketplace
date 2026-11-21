-- Créateurs d'illustration (simu) : drapeau + coordonnées privées
ALTER TABLE "Creator" ADD COLUMN "simuIllustration" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Creator" ADD COLUMN "country" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Creator" ADD COLUMN "madeIn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Creator" ADD COLUMN "gender" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Creator" ADD COLUMN "privateWebsite" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Creator" ADD COLUMN "privateEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Creator" ADD COLUMN "privateInstagram" TEXT NOT NULL DEFAULT '';
