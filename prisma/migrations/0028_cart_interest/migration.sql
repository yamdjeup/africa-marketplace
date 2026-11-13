CREATE TABLE "CartInterest" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CartInterest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CartInterest_token_slug_key" ON "CartInterest"("token", "slug");
CREATE INDEX "CartInterest_slug_updatedAt_idx" ON "CartInterest"("slug", "updatedAt");
