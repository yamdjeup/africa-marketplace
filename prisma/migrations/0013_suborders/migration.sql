-- Additive : sous-commandes par partenaire.
CREATE TABLE "SubOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "subtotalCents" INTEGER NOT NULL,
    "acceptBy" TIMESTAMP(3) NOT NULL,
    "reminderSentAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL DEFAULT '',
    "carrier" TEXT NOT NULL DEFAULT '',
    "trackingNumber" TEXT NOT NULL DEFAULT '',
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubOrder_number_key" ON "SubOrder"("number");
CREATE INDEX "SubOrder_orderId_idx" ON "SubOrder"("orderId");
CREATE INDEX "SubOrder_supplierId_status_idx" ON "SubOrder"("supplierId", "status");
ALTER TABLE "SubOrder" ADD CONSTRAINT "SubOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD COLUMN "subOrderId" TEXT;
CREATE INDEX "OrderItem_subOrderId_idx" ON "OrderItem"("subOrderId");
