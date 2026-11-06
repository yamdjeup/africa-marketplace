-- CreateTable (additive : fournisseurs et candidatures)
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "craftType" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "bioEn" TEXT NOT NULL DEFAULT '',
    "videoUrl" TEXT,
    "creatorSlug" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "craftType" TEXT NOT NULL,
    "portfolioUrl" TEXT NOT NULL,
    "about" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Supplier_userId_key" ON "Supplier"("userId");
CREATE INDEX "SupplierApplication_userId_idx" ON "SupplierApplication"("userId");
CREATE INDEX "SupplierApplication_status_idx" ON "SupplierApplication"("status");

ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupplierApplication" ADD CONSTRAINT "SupplierApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
