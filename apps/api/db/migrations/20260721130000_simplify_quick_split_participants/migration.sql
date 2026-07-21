-- A QuickSplit can only have one expense. Abort before changing data if the
-- existing database contains quick splits that violate that invariant.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "quick_split_expense"
    GROUP BY "quickSplitId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot simplify quick splits: one or more quick splits have multiple expenses';
  END IF;
END $$;

-- Move the per-expense share onto the quick split participant.
ALTER TABLE "quick_split_participant"
  ADD COLUMN "share" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "quick_split_participant" qsp
SET "share" = qsep."share"
FROM "quick_split_expense_participant" qsep
JOIN "quick_split_expense" qse
  ON qse."id" = qsep."expenseId"
WHERE qsp."id" = qsep."participantId";

-- Every participant in a QuickSplit now belongs to its only expense.
DROP TABLE "quick_split_expense_participant";

CREATE UNIQUE INDEX "quick_split_expense_quickSplitId_key"
  ON "quick_split_expense"("quickSplitId");
