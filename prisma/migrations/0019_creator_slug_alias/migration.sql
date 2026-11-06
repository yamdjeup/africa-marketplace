-- Anciens slugs de pages boutique -> redirection permanente.
CREATE TABLE "CreatorSlugAlias" (
    "oldSlug" TEXT NOT NULL,
    "creatorSlug" TEXT NOT NULL,
    CONSTRAINT "CreatorSlugAlias_pkey" PRIMARY KEY ("oldSlug")
);
CREATE INDEX "CreatorSlugAlias_creatorSlug_idx" ON "CreatorSlugAlias"("creatorSlug");

-- URL propre : retire le suffixe technique (-xxxx) des pages boutique de partenaires quand le slug nettoyé est libre.
-- Product.creatorSlug suit par ON UPDATE CASCADE ; l'ancien slug devient un alias.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c."slug" AS old_slug, regexp_replace(c."slug", '-[0-9a-f]{4}$', '') AS base
    FROM "Creator" c
    JOIN "Supplier" s ON s."creatorSlug" = c."slug"
    WHERE c."slug" ~ '-[0-9a-f]{4}$'
  LOOP
    IF r.base <> '' AND NOT EXISTS (SELECT 1 FROM "Creator" WHERE "slug" = r.base) AND NOT EXISTS (SELECT 1 FROM "CreatorSlugAlias" WHERE "oldSlug" = r.base) THEN
      UPDATE "Creator" SET "slug" = r.base WHERE "slug" = r.old_slug;
      UPDATE "Supplier" SET "creatorSlug" = r.base WHERE "creatorSlug" = r.old_slug;
      INSERT INTO "CreatorSlugAlias" ("oldSlug", "creatorSlug") VALUES (r.old_slug, r.base);
    END IF;
  END LOOP;
END $$;
