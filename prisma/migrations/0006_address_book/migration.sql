-- AlterTable (additive : carnet d'adresses multiples, adresse par défaut, champs d'adresse séparés)
ALTER TABLE "Address" ADD COLUMN "firstName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "lastName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "houseNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN "box" TEXT,
ADD COLUMN "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable (additive : adresse structurée, téléphone et jeton de modification sur les commandes)
ALTER TABLE "Order" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN "street" TEXT NOT NULL DEFAULT '',
ADD COLUMN "houseNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN "box" TEXT,
ADD COLUMN "complement" TEXT,
ADD COLUMN "editToken" TEXT;
