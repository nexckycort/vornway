ALTER TABLE "debt" ADD COLUMN "name" TEXT;
UPDATE "debt" SET "name" = "counterpartyName" WHERE "name" IS NULL;
ALTER TABLE "debt" ALTER COLUMN "name" SET NOT NULL;
