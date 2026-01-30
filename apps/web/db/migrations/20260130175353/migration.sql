/*
  Warnings:

  - Added the required column `currency` to the `Expense` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "currency" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "group" ADD COLUMN     "totals" JSONB NOT NULL DEFAULT '{}';
