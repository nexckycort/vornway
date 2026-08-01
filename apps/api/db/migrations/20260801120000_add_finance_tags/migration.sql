CREATE TABLE "finance_tag" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finance_transaction_tag" (
    "transactionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "finance_transaction_tag_pkey" PRIMARY KEY ("transactionId", "tagId")
);

CREATE UNIQUE INDEX "finance_tag_ownerId_name_key" ON "finance_tag"("ownerId", "name");
CREATE INDEX "finance_tag_ownerId_name_idx" ON "finance_tag"("ownerId", "name");
CREATE INDEX "finance_transaction_tag_tagId_idx" ON "finance_transaction_tag"("tagId");

ALTER TABLE "finance_tag" ADD CONSTRAINT "finance_tag_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_transaction_tag" ADD CONSTRAINT "finance_transaction_tag_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "finance_transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_transaction_tag" ADD CONSTRAINT "finance_transaction_tag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "finance_tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
