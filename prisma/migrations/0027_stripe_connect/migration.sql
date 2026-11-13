-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN "stripeAccountId" TEXT,
ADD COLUMN "stripeConnectStatus" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stripeRequirementsDue" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN "stripeTransferId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_stripeAccountId_key" ON "Supplier"("stripeAccountId");
