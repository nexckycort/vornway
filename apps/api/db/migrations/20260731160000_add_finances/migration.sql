CREATE TYPE "FinanceAccountType" AS ENUM ('CASH', 'BANK', 'CREDIT_CARD', 'WALLET', 'OTHER');
CREATE TYPE "FinanceTransactionType" AS ENUM ('INCOME', 'EXPENSE', 'BOTH');

CREATE TABLE "finance_account" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "accountType" "FinanceAccountType" NOT NULL DEFAULT 'CASH',
  "currency" TEXT NOT NULL,
  "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "finance_account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finance_category" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "transactionType" "FinanceTransactionType" NOT NULL,
  "icon" TEXT,
  "color" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "finance_category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finance_transaction" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "accountId" TEXT,
  "categoryId" TEXT,
  "type" "FinanceTransactionType" NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "finance_transaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finance_budget" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "month" TIMESTAMP(3) NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "finance_budget_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "finance_account_ownerId_archivedAt_idx" ON "finance_account"("ownerId", "archivedAt");
CREATE UNIQUE INDEX "finance_category_ownerId_transactionType_name_key" ON "finance_category"("ownerId", "transactionType", "name");
CREATE INDEX "finance_category_ownerId_transactionType_archivedAt_idx" ON "finance_category"("ownerId", "transactionType", "archivedAt");
CREATE INDEX "finance_transaction_ownerId_occurredAt_idx" ON "finance_transaction"("ownerId", "occurredAt" DESC);
CREATE INDEX "finance_transaction_ownerId_type_occurredAt_idx" ON "finance_transaction"("ownerId", "type", "occurredAt" DESC);
CREATE INDEX "finance_transaction_categoryId_occurredAt_idx" ON "finance_transaction"("categoryId", "occurredAt" DESC);
CREATE UNIQUE INDEX "finance_budget_ownerId_categoryId_month_currency_key" ON "finance_budget"("ownerId", "categoryId", "month", "currency");
CREATE INDEX "finance_budget_ownerId_month_idx" ON "finance_budget"("ownerId", "month");

ALTER TABLE "finance_account" ADD CONSTRAINT "finance_account_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_category" ADD CONSTRAINT "finance_category_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_transaction" ADD CONSTRAINT "finance_transaction_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_transaction" ADD CONSTRAINT "finance_transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "finance_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "finance_transaction" ADD CONSTRAINT "finance_transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "finance_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "finance_budget" ADD CONSTRAINT "finance_budget_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_budget" ADD CONSTRAINT "finance_budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "finance_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
