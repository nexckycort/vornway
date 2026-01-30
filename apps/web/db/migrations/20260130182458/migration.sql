/*
  Warnings:

  - A unique constraint covering the columns `[inviteCode]` on the table `group` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "group" ADD COLUMN     "inviteCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "group_inviteCode_key" ON "group"("inviteCode");
