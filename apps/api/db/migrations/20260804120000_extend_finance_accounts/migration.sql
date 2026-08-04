ALTER TYPE "FinanceAccountType" ADD VALUE IF NOT EXISTS 'SAVINGS';
ALTER TYPE "FinanceAccountType" ADD VALUE IF NOT EXISTS 'TERM_DEPOSIT';

CREATE TYPE "FinanceAccountStatus" AS ENUM ('ACTIVE', 'CLOSED', 'MATURED');

ALTER TABLE "finance_account"
  ADD COLUMN "institution" TEXT,
  ADD COLUMN "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "availableBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "lockedBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "interestRate" DOUBLE PRECISION,
  ADD COLUMN "openedAt" TIMESTAMP(3),
  ADD COLUMN "maturesAt" TIMESTAMP(3),
  ADD COLUMN "status" "FinanceAccountStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "closedAt" TIMESTAMP(3);

UPDATE "finance_account"
SET
  "currentBalance" = "openingBalance",
  "availableBalance" = "openingBalance"
WHERE
  "currentBalance" = 0
  AND "availableBalance" = 0
  AND "openingBalance" <> 0;

CREATE INDEX "finance_account_ownerId_status_archivedAt_idx" ON "finance_account"("ownerId", "status", "archivedAt");
