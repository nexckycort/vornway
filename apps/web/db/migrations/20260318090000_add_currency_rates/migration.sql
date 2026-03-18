CREATE TABLE "currency_rate" (
  "id" TEXT NOT NULL,
  "baseCurrency" TEXT NOT NULL,
  "quoteCurrency" TEXT NOT NULL,
  "rate" DOUBLE PRECISION NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "currency_rate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "currency_rate_baseCurrency_quoteCurrency_createdAt_idx"
ON "currency_rate"("baseCurrency", "quoteCurrency", "createdAt" DESC);

CREATE INDEX "currency_rate_effectiveDate_idx"
ON "currency_rate"("effectiveDate" DESC);
