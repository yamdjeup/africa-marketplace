-- Product.submittedAt existe déjà : rétro-remplissage des œuvres en modération sans date de soumission.
UPDATE "Product" SET "submittedAt" = "createdAt" WHERE "status" = 'SUBMITTED' AND "submittedAt" IS NULL;
