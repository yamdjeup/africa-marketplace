-- Additive : journal d'audit des suspensions / revocations de partenaires.
CREATE TABLE "PartnerAudit" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "actorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PartnerAudit_supplierId_idx" ON "PartnerAudit"("supplierId");
