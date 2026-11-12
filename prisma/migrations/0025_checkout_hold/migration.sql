-- AlterTable
ALTER TABLE "Order" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CheckoutHold" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "buyerKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'HELD',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutHold_number_key" ON "CheckoutHold"("number");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutHold_stripeSessionId_key" ON "CheckoutHold"("stripeSessionId");

-- CreateIndex
CREATE INDEX "CheckoutHold_buyerKey_status_idx" ON "CheckoutHold"("buyerKey", "status");

-- CreateIndex
CREATE INDEX "CheckoutHold_status_expiresAt_idx" ON "CheckoutHold"("status", "expiresAt");
