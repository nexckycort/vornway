/*
  Warnings:

  - Made the column `inviteCode` on table `group` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "group" ALTER COLUMN "inviteCode" SET NOT NULL;
