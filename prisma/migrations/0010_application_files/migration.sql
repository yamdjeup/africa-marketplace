-- CreateTable (additive : fichiers joints aux candidatures)
CREATE TABLE "ApplicationFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApplicationFile_userId_idx" ON "ApplicationFile"("userId");
CREATE INDEX "ApplicationFile_applicationId_idx" ON "ApplicationFile"("applicationId");
