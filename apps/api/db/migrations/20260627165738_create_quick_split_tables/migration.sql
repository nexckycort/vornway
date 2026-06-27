-- DropIndex
DROP INDEX "expense_categoryId_idx";

-- DropIndex
DROP INDEX "expense_category_groupId_idx";

-- DropIndex
DROP INDEX "expense_category_name_idx";

-- CreateTable
CREATE TABLE "quick_split" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_split_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_split_participant" (
    "id" TEXT NOT NULL,
    "quickSplitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'participant',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quick_split_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_split_expense" (
    "id" TEXT NOT NULL,
    "quickSplitId" TEXT NOT NULL,
    "paidByUserId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "splitMethod" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_split_expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_split_expense_participant" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "share" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "quick_split_expense_participant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quick_split_ownerId_createdAt_idx" ON "quick_split"("ownerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "quick_split_participant_userId_joinedAt_idx" ON "quick_split_participant"("userId", "joinedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "quick_split_participant_quickSplitId_userId_key" ON "quick_split_participant"("quickSplitId", "userId");

-- CreateIndex
CREATE INDEX "quick_split_expense_quickSplitId_createdAt_idx" ON "quick_split_expense"("quickSplitId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "quick_split_expense_paidByUserId_createdAt_idx" ON "quick_split_expense"("paidByUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "quick_split_expense_participant_userId_idx" ON "quick_split_expense_participant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "quick_split_expense_participant_expenseId_userId_key" ON "quick_split_expense_participant"("expenseId", "userId");

-- AddForeignKey
ALTER TABLE "quick_split" ADD CONSTRAINT "quick_split_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_split_participant" ADD CONSTRAINT "quick_split_participant_quickSplitId_fkey" FOREIGN KEY ("quickSplitId") REFERENCES "quick_split"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_split_participant" ADD CONSTRAINT "quick_split_participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_split_expense" ADD CONSTRAINT "quick_split_expense_quickSplitId_fkey" FOREIGN KEY ("quickSplitId") REFERENCES "quick_split"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_split_expense" ADD CONSTRAINT "quick_split_expense_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_split_expense_participant" ADD CONSTRAINT "quick_split_expense_participant_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "quick_split_expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_split_expense_participant" ADD CONSTRAINT "quick_split_expense_participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
