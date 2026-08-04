ALTER TABLE "finance_account"
ADD COLUMN "creditLimit" DOUBLE PRECISION,
ADD COLUMN "usedCredit" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "finance_account"
SET
  "creditLimit" = CASE
    WHEN "accountType" = 'CREDIT_CARD' AND "availableBalance" > 0 THEN "availableBalance" + GREATEST("currentBalance", 0)
    WHEN "accountType" = 'CREDIT_CARD' AND "currentBalance" > 0 THEN "currentBalance"
    ELSE "creditLimit"
  END,
  "usedCredit" = CASE
    WHEN "accountType" = 'CREDIT_CARD' THEN GREATEST("currentBalance", 0)
    ELSE "usedCredit"
  END
WHERE "accountType" = 'CREDIT_CARD';
