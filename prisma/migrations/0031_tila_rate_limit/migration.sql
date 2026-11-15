CREATE TABLE "TilaRateHit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TilaRateHit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TilaRateHit_key_createdAt_idx" ON "TilaRateHit"("key", "createdAt");
