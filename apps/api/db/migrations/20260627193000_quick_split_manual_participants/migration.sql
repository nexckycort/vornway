-- Add name and make user optional on quick split participants
ALTER TABLE "quick_split_participant" ADD COLUMN "name" TEXT;

UPDATE "quick_split_participant" qsp
SET "name" = u."name"
FROM "user" u
WHERE u."id" = qsp."userId";

ALTER TABLE "quick_split_participant"
  ALTER COLUMN "name" SET NOT NULL,
  ALTER COLUMN "userId" DROP NOT NULL;

-- Add participant references on expenses
ALTER TABLE "quick_split_expense" ADD COLUMN "paidByParticipantId" TEXT;

UPDATE "quick_split_expense" qse
SET "paidByParticipantId" = qsp."id"
FROM "quick_split_participant" qsp
WHERE qsp."quickSplitId" = qse."quickSplitId"
  AND qsp."userId" = qse."paidByUserId";

ALTER TABLE "quick_split_expense"
  ALTER COLUMN "paidByParticipantId" SET NOT NULL;

-- Add participant references on expense participants
ALTER TABLE "quick_split_expense_participant" ADD COLUMN "participantId" TEXT;

UPDATE "quick_split_expense_participant" qsep
SET "participantId" = qsp."id"
FROM "quick_split_expense" qse,
     "quick_split_participant" qsp
WHERE qse."id" = qsep."expenseId"
  AND qsp."quickSplitId" = qse."quickSplitId"
  AND qsp."userId" = qsep."userId";

ALTER TABLE "quick_split_expense_participant"
  ALTER COLUMN "participantId" SET NOT NULL;

-- Drop old constraints and indexes
ALTER TABLE "quick_split_expense" DROP CONSTRAINT "quick_split_expense_paidByUserId_fkey";
ALTER TABLE "quick_split_expense_participant" DROP CONSTRAINT "quick_split_expense_participant_userId_fkey";

DROP INDEX "quick_split_expense_paidByUserId_createdAt_idx";
DROP INDEX "quick_split_expense_participant_userId_idx";
DROP INDEX "quick_split_expense_participant_expenseId_userId_key";

-- Create new constraints and indexes
CREATE INDEX "quick_split_expense_paidByParticipantId_createdAt_idx"
  ON "quick_split_expense"("paidByParticipantId", "createdAt" DESC);

CREATE INDEX "quick_split_expense_participant_participantId_idx"
  ON "quick_split_expense_participant"("participantId");

CREATE UNIQUE INDEX "quick_split_expense_participant_expenseId_participantId_key"
  ON "quick_split_expense_participant"("expenseId", "participantId");

ALTER TABLE "quick_split_expense"
  ADD CONSTRAINT "quick_split_expense_paidByParticipantId_fkey"
  FOREIGN KEY ("paidByParticipantId") REFERENCES "quick_split_participant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quick_split_expense_participant"
  ADD CONSTRAINT "quick_split_expense_participant_participantId_fkey"
  FOREIGN KEY ("participantId") REFERENCES "quick_split_participant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old columns
ALTER TABLE "quick_split_expense" DROP COLUMN "paidByUserId";
ALTER TABLE "quick_split_expense_participant" DROP COLUMN "userId";
