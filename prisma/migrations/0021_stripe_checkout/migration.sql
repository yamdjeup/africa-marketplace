-- AlterTable
ALTER TABLE "Order" ADD COLUMN "stripeSessionId" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentPending" BOOLEAN NOT NULL DEFAULT false;
