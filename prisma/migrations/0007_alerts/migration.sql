-- AlterTable (additive : préférences d'alertes par utilisateur)
ALTER TABLE "User" ADD COLUMN "alertFavorites" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "alertPromo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "promoSince" TIMESTAMP(3),
ADD COLUMN "lastTestEmailAt" TIMESTAMP(3);

-- CreateTable (additive : favoris synchronisés des comptes connectés)
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "lastPriceCents" INTEGER NOT NULL,
    "lastStock" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","productSlug")
);

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
