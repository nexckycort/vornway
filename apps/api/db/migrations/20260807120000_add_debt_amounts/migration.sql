CREATE TABLE "debt_amount" (
  "id" TEXT NOT NULL,
  "debtId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "debt_amount_pkey" PRIMARY KEY ("id")
);

INSERT INTO "debt_amount" ("id", "debtId", "amount")
SELECT 'legacy_' || "id", "id", "principalAmount" FROM "debt";

CREATE INDEX "debt_amount_debtId_createdAt_idx"
  ON "debt_amount"("debtId", "createdAt" DESC);

ALTER TABLE "debt_amount"
  ADD CONSTRAINT "debt_amount_debtId_fkey"
  FOREIGN KEY ("debtId") REFERENCES "debt"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
