CREATE TABLE "expense_payer" (
  "id" TEXT NOT NULL,
  "expenseId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,

  CONSTRAINT "expense_payer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "expense_payer_expenseId_idx" ON "expense_payer"("expenseId");
CREATE INDEX "expense_payer_memberId_idx" ON "expense_payer"("memberId");
CREATE UNIQUE INDEX "expense_payer_expenseId_memberId_key" ON "expense_payer"("expenseId", "memberId");

ALTER TABLE "expense_payer"
ADD CONSTRAINT "expense_payer_expenseId_fkey"
FOREIGN KEY ("expenseId") REFERENCES "expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expense_payer"
ADD CONSTRAINT "expense_payer_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "group_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "expense_payer" ("id", "expenseId", "memberId", "amount")
SELECT
  "expense"."id" || '_payer',
  "expense"."id",
  "expense"."paidById",
  "expense"."amount"
FROM "expense";
