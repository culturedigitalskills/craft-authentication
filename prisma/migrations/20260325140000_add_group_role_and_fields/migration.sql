-- Add GroupRole enum and new fields to Group model

-- Create GroupRole enum
CREATE TYPE "GroupRole" AS ENUM ('ADMIN', 'MEMBER');

-- Add new columns to Group
ALTER TABLE "Group" ADD COLUMN "website" TEXT;
ALTER TABLE "Group" ADD COLUMN "location" TEXT;
ALTER TABLE "Group" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Convert role column from String to GroupRole enum
-- First, set existing NULL roles to 'MEMBER'
UPDATE "ArtisanGroupMembership" SET "role" = 'MEMBER' WHERE "role" IS NULL;

-- Drop old column and add new typed column
ALTER TABLE "ArtisanGroupMembership" DROP COLUMN "role";
ALTER TABLE "ArtisanGroupMembership" ADD COLUMN "role" "GroupRole" NOT NULL DEFAULT 'MEMBER';
