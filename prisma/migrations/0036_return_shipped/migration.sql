-- Précision libre du refus (admin uniquement) et expédition du retour confirmée par le client
ALTER TABLE "SubOrder" ADD COLUMN "reasonNote" TEXT;
ALTER TABLE "SubOrder" ADD COLUMN "closedMailSentAt" TIMESTAMP(3);
ALTER TABLE "ReturnRequest" ADD COLUMN "returnCarrier" TEXT;
ALTER TABLE "ReturnRequest" ADD COLUMN "returnTracking" TEXT;
ALTER TABLE "ReturnRequest" ADD COLUMN "returnShippedAt" TIMESTAMP(3);
