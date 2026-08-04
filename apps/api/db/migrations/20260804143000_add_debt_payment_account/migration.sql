ALTER TABLE "debt_payment" ADD COLUMN "accountId" TEXT;

CREATE INDEX "debt_payment_accountId_idx" ON "debt_payment"("accountId");

ALTER TABLE "debt_payment"
ADD CONSTRAINT "debt_payment_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "finance_account"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
