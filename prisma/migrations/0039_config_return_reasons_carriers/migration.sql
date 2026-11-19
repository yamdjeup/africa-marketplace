-- Motifs de retour (client) et transporteurs configurables
CREATE TABLE "ReturnReason" (
  "id" TEXT NOT NULL,
  "fr" TEXT NOT NULL,
  "en" TEXT NOT NULL,
  "requiresPhotos" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ReturnReason_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReturnReason_active_position_idx" ON "ReturnReason"("active", "position");

CREATE TABLE "Carrier" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Carrier_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Carrier_name_key" ON "Carrier"("name");

ALTER TABLE "ReturnRequest" ADD COLUMN "reasonId" TEXT;

INSERT INTO "ReturnReason" ("id", "fr", "en", "requiresPhotos", "position") VALUES
  ('rr_too_small', 'Article trop petit', 'Item too small', false, 1),
  ('rr_too_large', 'Article trop grand', 'Item too large', false, 2),
  ('rr_not_as_described', 'Article non conforme à la description', 'Item not as described', true, 3),
  ('rr_damaged', 'Article reçu endommagé', 'Item arrived damaged', true, 4),
  ('rr_defect', 'Article présentant un défaut de fabrication', 'Item has a manufacturing defect', true, 5),
  ('rr_wrong_item', 'Mauvais article reçu', 'Wrong item received', true, 6),
  ('rr_color', 'Couleur différente de celle présentée', 'Color differs from the product images', true, 7),
  ('rr_changed_mind', 'L''article ne me convient plus', 'Changed my mind', false, 8),
  ('rr_other', 'Autre motif', 'Other reason', false, 9);

INSERT INTO "Carrier" ("id", "name", "position") VALUES
  ('car_ups', 'UPS', 1),
  ('car_dhl', 'DHL', 2),
  ('car_colissimo', 'Colissimo', 3);
