ALTER TABLE "Horse" ADD COLUMN "number" INTEGER;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn
  FROM "Horse"
)
UPDATE "Horse" h SET "number" = n.rn
FROM numbered n WHERE h.id = n.id;

ALTER TABLE "Horse" ALTER COLUMN "number" SET NOT NULL;
ALTER TABLE "Horse" ADD CONSTRAINT "Horse_number_key" UNIQUE ("number");
