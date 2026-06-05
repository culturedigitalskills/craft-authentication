/*
  Warnings:

  - The `emailVerified` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "User" 
ALTER COLUMN "emailVerified" TYPE BOOLEAN 
USING (CASE WHEN "emailVerified" IS NOT NULL THEN TRUE ELSE FALSE END);

ALTER TABLE "User" ALTER COLUMN "emailVerified" SET DEFAULT false;

ALTER TABLE "User" ALTER COLUMN "emailVerified" SET NOT NULL;
