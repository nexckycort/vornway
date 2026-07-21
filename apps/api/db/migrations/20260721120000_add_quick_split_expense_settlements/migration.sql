-- CreateTable
CREATE TABLE "quick_split_expense_settlement" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "fromParticipantId" TEXT NOT NULL,
    "toParticipantId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quick_split_expense_settlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quick_split_expense_settlement_expenseId_createdAt_idx"
  ON "quick_split_expense_settlement"("expenseId", "createdAt" DESC);
CREATE INDEX "quick_split_expense_settlement_fromParticipantId_idx"
  ON "quick_split_expense_settlement"("fromParticipantId");
CREATE INDEX "quick_split_expense_settlement_toParticipantId_idx"
  ON "quick_split_expense_settlement"("toParticipantId");

-- AddForeignKey
ALTER TABLE "quick_split_expense_settlement"
  ADD CONSTRAINT "quick_split_expense_settlement_expenseId_fkey"
  FOREIGN KEY ("expenseId") REFERENCES "quick_split_expense"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quick_split_expense_settlement"
  ADD CONSTRAINT "quick_split_expense_settlement_fromParticipantId_fkey"
  FOREIGN KEY ("fromParticipantId") REFERENCES "quick_split_participant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quick_split_expense_settlement"
  ADD CONSTRAINT "quick_split_expense_settlement_toParticipantId_fkey"
  FOREIGN KEY ("toParticipantId") REFERENCES "quick_split_participant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
