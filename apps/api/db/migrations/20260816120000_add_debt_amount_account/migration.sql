ALTER TABLE "debt_amount"
ADD COLUMN "accountId" TEXT;

CREATE INDEX "debt_amount_accountId_idx"
ON "debt_amount"("accountId");

ALTER TABLE "debt_amount"
ADD CONSTRAINT "debt_amount_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "finance_account"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
