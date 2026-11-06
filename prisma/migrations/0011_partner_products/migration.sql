-- Additive : oeuvres de partenaires, stock (reserve, variantes, mouvements), medias.
ALTER TABLE "Product" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "Product" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "Product" ADD COLUMN "reserved" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Product" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR';
ALTER TABLE "Product" ADD COLUMN "priceLocal" INTEGER;
ALTER TABLE "Product" ADD COLUMN "weightG" INTEGER;
ALTER TABLE "Product" ADD COLUMN "edition" TEXT;
ALTER TABLE "Product" ADD COLUMN "signatureFileId" TEXT;
ALTER TABLE "Product" ADD COLUMN "authorAttestedAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "authorAttestedBy" TEXT;
ALTER TABLE "Product" ADD COLUMN "rejectReason" TEXT;
ALTER TABLE "Product" ADD COLUMN "submittedAt" TIMESTAMP(3);
CREATE INDEX "Product_supplierId_idx" ON "Product"("supplierId");
CREATE INDEX "Product_status_idx" ON "Product"("status");

ALTER TABLE "Supplier" ADD COLUMN "signatureFileId" TEXT;

CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProductVariant_productSlug_idx" ON "ProductVariant"("productSlug");
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productSlug_fkey" FOREIGN KEY ("productSlug") REFERENCES "Product"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "variantId" TEXT,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "authorId" TEXT,
    "authorLabel" TEXT NOT NULL DEFAULT '',
    "orderNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StockMovement_productSlug_idx" ON "StockMovement"("productSlug");

CREATE TABLE "MediaFile" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MediaFile_ownerUserId_idx" ON "MediaFile"("ownerUserId");
