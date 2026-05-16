-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('STANDARD', 'COMPOSITE', 'SETTLEMENT');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "SettlementMethod" AS ENUM ('CARDS', 'FLEX');

-- AlterTable
ALTER TABLE "expense"
ADD COLUMN "expenseType" "ExpenseType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "status" "ExpenseStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "pinnedAt" TIMESTAMP(3),
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedById" TEXT,
ADD COLUMN "settlementMethod" "SettlementMethod";

-- CreateTable
CREATE TABLE "composite_expense_item" (
  "id" TEXT NOT NULL,
  "expenseId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "composite_expense_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_groupId_date_idx" ON "expense"("groupId", "date" DESC);

-- CreateIndex
CREATE INDEX "expense_groupId_expenseType_status_idx" ON "expense"("groupId", "expenseType", "status");

-- CreateIndex
CREATE INDEX "expense_groupId_pinnedAt_idx" ON "expense"("groupId", "pinnedAt" DESC);

-- CreateIndex
CREATE INDEX "composite_expense_item_expenseId_createdAt_idx" ON "composite_expense_item"("expenseId", "createdAt" ASC);

-- AddForeignKey
ALTER TABLE "composite_expense_item"
ADD CONSTRAINT "composite_expense_item_expenseId_fkey"
FOREIGN KEY ("expenseId") REFERENCES "expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
