-- Phrase client des motifs de refus (le libellé fr/en reste celui de la liste déroulante du créateur)
ALTER TABLE "RefusalReason" ADD COLUMN "mailFr" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RefusalReason" ADD COLUMN "mailEn" TEXT NOT NULL DEFAULT '';
UPDATE "RefusalReason" SET "mailFr" = "fr", "mailEn" = "en" WHERE "mailFr" = '';
