-- Remboursement à l'annulation d'un colis (valeurs optionnelles pour l'existant).
ALTER TABLE "Order" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "SubOrder" ADD COLUMN "refundStatus" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SubOrder" ADD COLUMN "refundId" TEXT;
