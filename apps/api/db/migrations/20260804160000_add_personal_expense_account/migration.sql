ALTER TABLE "expense" ADD COLUMN "accountId" TEXT;

ALTER TABLE "expense"
  ADD CONSTRAINT "expense_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "finance_account"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "expense_accountId_date_idx" ON "expense"("accountId", "date" DESC);
