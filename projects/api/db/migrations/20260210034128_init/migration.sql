/*
  Warnings:

  - You are about to drop the `ActivityLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Expense` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExpenseParticipant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GroupMember` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `createdAt` on table `verification` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `verification` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_groupId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_groupId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_paidById_fkey";

-- DropForeignKey
ALTER TABLE "ExpenseParticipant" DROP CONSTRAINT "ExpenseParticipant_expenseId_fkey";

-- DropForeignKey
ALTER TABLE "ExpenseParticipant" DROP CONSTRAINT "ExpenseParticipant_memberId_fkey";

-- DropForeignKey
ALTER TABLE "GroupMember" DROP CONSTRAINT "GroupMember_groupId_fkey";

-- DropForeignKey
ALTER TABLE "GroupMember" DROP CONSTRAINT "GroupMember_userId_fkey";

-- AlterTable
ALTER TABLE "account" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "session" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "isAnonymous" BOOLEAN DEFAULT false,
ALTER COLUMN "emailVerified" SET DEFAULT false,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "verification" ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updatedAt" SET NOT NULL;

-- DropTable
DROP TABLE "ActivityLog";

-- DropTable
DROP TABLE "Expense";

-- DropTable
DROP TABLE "ExpenseParticipant";

-- DropTable
DROP TABLE "GroupMember";

-- CreateTable
CREATE TABLE "activity_log" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetName" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "paidById" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "attachment" TEXT,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_participant" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "share" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "expense_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_member" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_log_groupId_createdAt_idx" ON "activity_log"("groupId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "expense_participant_expenseId_memberId_key" ON "expense_participant"("expenseId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "group_member_userId_groupId_key" ON "group_member"("userId", "groupId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "group_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_participant" ADD CONSTRAINT "expense_participant_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_participant" ADD CONSTRAINT "expense_participant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "group_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
