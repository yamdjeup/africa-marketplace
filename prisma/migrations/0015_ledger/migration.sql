CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "subOrderId" TEXT NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "commissionCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,
    "availableAt" TIMESTAMP(3) NOT NULL,
    "payoutId" TEXT,
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "LedgerEntry_subOrderId_key" ON "LedgerEntry"("subOrderId");
CREATE INDEX "LedgerEntry_supplierId_payoutId_idx" ON "LedgerEntry"("supplierId", "payoutId");

CREATE TABLE "Payout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "entryCount" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "paidBy" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Payout_supplierId_idx" ON "Payout"("supplierId");
