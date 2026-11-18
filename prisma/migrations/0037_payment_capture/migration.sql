-- Capture manuelle Stripe : autorisation à la commande, encaissement à la confirmation du créateur
ALTER TABLE "Order" ADD COLUMN "captureStatus" TEXT;
ALTER TABLE "SubOrder" ADD COLUMN "capturedCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SubOrder" ADD COLUMN "reminderCount" INTEGER NOT NULL DEFAULT 0;
