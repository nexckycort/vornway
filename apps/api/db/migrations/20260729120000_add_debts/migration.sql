CREATE TABLE "debt" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "counterpartyId" TEXT,
  "counterpartyName" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "principalAmount" DOUBLE PRECISION NOT NULL,
  "interestType" TEXT NOT NULL DEFAULT 'none',
  "interestValue" DOUBLE PRECISION,
  "expectedTotal" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3),
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "debt_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "debt_payment" (
  "id" TEXT NOT NULL,
  "debtId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "debt_payment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "debt_ownerId_createdAt_idx" ON "debt"("ownerId", "createdAt" DESC);
CREATE INDEX "debt_ownerId_dueDate_idx" ON "debt"("ownerId", "dueDate");
CREATE INDEX "debt_payment_debtId_paidAt_idx" ON "debt_payment"("debtId", "paidAt" DESC);
ALTER TABLE "debt" ADD CONSTRAINT "debt_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "debt" ADD CONSTRAINT "debt_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "debt_payment" ADD CONSTRAINT "debt_payment_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
