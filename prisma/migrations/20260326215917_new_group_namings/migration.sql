/*
  Warnings:

  - You are about to drop the column `isCooperative` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `isFairTrade` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `isWomenLed` on the `Group` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('COOPERATIVE', 'COLLECTIVE', 'GUILD', 'ASSOCIATION', 'SOCIAL_ENTERPRISE', 'NONPROFIT', 'STUDIO', 'NETWORK', 'OTHER');

-- AlterTable
ALTER TABLE "Group" DROP COLUMN "isCooperative",
DROP COLUMN "isFairTrade",
DROP COLUMN "isWomenLed",
ADD COLUMN     "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "hasTrainingProgram" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHeritageCraft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isOpenToMembers" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "organizationType" "OrganizationType" NOT NULL DEFAULT 'OTHER';
