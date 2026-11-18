CREATE TABLE "RefusalReason" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fr" TEXT NOT NULL,
    "en" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "RefusalReason_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RefusalReason_kind_active_position_idx" ON "RefusalReason"("kind", "active", "position");
ALTER TABLE "SubOrder" ADD COLUMN "reasonId" TEXT;
ALTER TABLE "ReturnRequest" ADD COLUMN "partnerReasonId" TEXT;
INSERT INTO "RefusalReason" ("id", "kind", "fr", "en", "position", "active") VALUES
('rsn_order_unavailable', 'ORDER', 'La pièce n''est plus disponible', 'The piece is no longer available', 1, true),
('rsn_return_worn', 'RETURN', 'la pièce présente des traces de port ou d''usage', 'the piece shows signs of wear or use', 1, true),
('rsn_return_mismatch', 'RETURN', 'la pièce reçue ne correspond pas à celle expédiée', 'the piece received is not the one that was shipped', 2, true),
('rsn_return_damaged', 'RETURN', 'la pièce est endommagée par rapport à son état d''expédition', 'the piece is damaged compared with its condition when shipped', 3, true);
