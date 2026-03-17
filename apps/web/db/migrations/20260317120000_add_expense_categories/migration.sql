CREATE TABLE "expense_category" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_category_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "expense"
ADD COLUMN "categoryId" TEXT;

CREATE UNIQUE INDEX "expense_category_groupId_name_key" ON "expense_category"("groupId", "name");
CREATE INDEX "expense_category_groupId_idx" ON "expense_category"("groupId");
CREATE INDEX "expense_category_name_idx" ON "expense_category"("name");
CREATE INDEX "expense_categoryId_idx" ON "expense"("categoryId");

ALTER TABLE "expense_category"
ADD CONSTRAINT "expense_category_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expense"
ADD CONSTRAINT "expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
