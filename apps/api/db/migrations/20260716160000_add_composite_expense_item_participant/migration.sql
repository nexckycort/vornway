DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "composite_expense_item") THEN
    RAISE EXCEPTION 'Cannot assign existing composite expense items to a participant';
  END IF;
END $$;

ALTER TABLE "composite_expense_item"
DROP CONSTRAINT "composite_expense_item_expenseId_fkey",
DROP COLUMN "expenseId",
ADD COLUMN "expenseParticipantId" TEXT NOT NULL;

CREATE INDEX "composite_expense_item_expenseParticipantId_createdAt_idx"
ON "composite_expense_item"("expenseParticipantId", "createdAt" ASC);

ALTER TABLE "composite_expense_item"
ADD CONSTRAINT "composite_expense_item_expenseParticipantId_fkey"
FOREIGN KEY ("expenseParticipantId") REFERENCES "expense_participant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
