ALTER TABLE "debt_amount" ADD COLUMN "loanDate" TIMESTAMP(3);

UPDATE "debt_amount" AS amount
SET "loanDate" = debt."createdAt"
FROM "debt" AS debt
WHERE amount."debtId" = debt."id";

ALTER TABLE "debt_amount"
  ALTER COLUMN "loanDate" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "loanDate" SET NOT NULL;
