-- Enquête de satisfaction « Rate your experience »
ALTER TABLE "SubOrder" ADD COLUMN "reviewMailSentAt" TIMESTAMP(3);

CREATE TABLE "SurveyConfig" (
  "id" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "delayDays" INTEGER NOT NULL DEFAULT 3,
  CONSTRAINT "SurveyConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SurveyQuestion" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "position" INTEGER NOT NULL DEFAULT 0,
  "type" TEXT NOT NULL,
  "labelFr" TEXT NOT NULL,
  "labelEn" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "options" TEXT NOT NULL DEFAULT '[]',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SurveyQuestion_archived_active_position_idx" ON "SurveyQuestion"("archived", "active", "position");

CREATE TABLE "SurveyResponse" (
  "id" TEXT NOT NULL,
  "subOrderId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'fr',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SurveyResponse_subOrderId_key" ON "SurveyResponse"("subOrderId");
CREATE UNIQUE INDEX "SurveyResponse_token_key" ON "SurveyResponse"("token");
CREATE INDEX "SurveyResponse_completedAt_idx" ON "SurveyResponse"("completedAt");
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_subOrderId_fkey" FOREIGN KEY ("subOrderId") REFERENCES "SubOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SurveyAnswer" (
  "id" TEXT NOT NULL,
  "responseId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  CONSTRAINT "SurveyAnswer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SurveyAnswer_responseId_questionId_key" ON "SurveyAnswer"("responseId", "questionId");
ALTER TABLE "SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "SurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SurveyQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "SurveyConfig" ("id", "enabled", "delayDays") VALUES ('main', true, 3);

INSERT INTO "SurveyQuestion" ("id", "key", "version", "position", "type", "labelFr", "labelEn", "required", "options") VALUES
  ('sq_nps', 'nps', 1, 1, 'SCORE10', 'Quelle est la probabilité que vous recommandiez E póm ta'' à un proche ?', 'How likely are you to recommend E póm ta'' to a friend?', true, '[]'),
  ('sq_delivery', 'delivery', 1, 2, 'STARS', 'Comment évaluez-vous la livraison ?', 'How would you rate the delivery?', true, '[]'),
  ('sq_packaging', 'packaging', 1, 3, 'STARS', 'Comment évaluez-vous l''emballage ?', 'How would you rate the packaging?', true, '[]'),
  ('sq_condition', 'condition', 1, 4, 'STARS', 'Comment évaluez-vous l''état de l''article reçu ?', 'How would you rate the condition of the item?', true, '[]'),
  ('sq_source', 'source', 1, 5, 'SELECT', 'Comment nous avez-vous connus ?', 'How did you hear about us?', false, '[{"fr":"Réseaux sociaux","en":"Social media"},{"fr":"Bouche-à-oreille","en":"Word of mouth"},{"fr":"Moteur de recherche","en":"Search engine"},{"fr":"Presse / blog","en":"Press / blog"},{"fr":"Autre","en":"Other"}]'),
  ('sq_comment', 'comment', 1, 6, 'TEXT', 'Un commentaire à nous partager ?', 'Any comment you would like to share?', false, '[]');
