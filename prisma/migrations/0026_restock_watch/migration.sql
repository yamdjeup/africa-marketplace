-- CreateTable
CREATE TABLE "RestockWatch" (
    "id" TEXT NOT NULL,
    "buyerKey" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "productSlug" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "RestockWatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestockWatch_buyerKey_productSlug_key" ON "RestockWatch"("buyerKey", "productSlug");

-- CreateIndex
CREATE INDEX "RestockWatch_productSlug_notifiedAt_idx" ON "RestockWatch"("productSlug", "notifiedAt");
