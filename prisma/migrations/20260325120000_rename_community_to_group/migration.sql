-- Rename Community to Group and remove region dependency

-- Drop the old unique constraint and index
DROP INDEX IF EXISTS "ArtisanCommunityMembership_artisanId_communityId_key";
DROP INDEX IF EXISTS "Community_slug_key";
DROP INDEX IF EXISTS "Community_regionId_idx";

-- Rename tables
ALTER TABLE "Community" RENAME TO "Group";
ALTER TABLE "ArtisanCommunityMembership" RENAME TO "ArtisanGroupMembership";

-- Rename column in membership table
ALTER TABLE "ArtisanGroupMembership" RENAME COLUMN "communityId" TO "groupId";

-- Drop region dependency from Group
ALTER TABLE "Group" DROP CONSTRAINT IF EXISTS "Community_regionId_fkey";
ALTER TABLE "Group" DROP COLUMN IF EXISTS "regionId";

-- Drop location columns from Group
ALTER TABLE "Group" DROP COLUMN IF EXISTS "latitude";
ALTER TABLE "Group" DROP COLUMN IF EXISTS "longitude";

-- Update foreign key constraints on membership table
ALTER TABLE "ArtisanGroupMembership" DROP CONSTRAINT IF EXISTS "ArtisanCommunityMembership_communityId_fkey";
ALTER TABLE "ArtisanGroupMembership" DROP CONSTRAINT IF EXISTS "ArtisanCommunityMembership_artisanId_fkey";

ALTER TABLE "ArtisanGroupMembership"
    ADD CONSTRAINT "ArtisanGroupMembership_artisanId_fkey"
    FOREIGN KEY ("artisanId") REFERENCES "Artisan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArtisanGroupMembership"
    ADD CONSTRAINT "ArtisanGroupMembership_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate indexes and constraints
CREATE UNIQUE INDEX "Group_slug_key" ON "Group"("slug");
CREATE UNIQUE INDEX "ArtisanGroupMembership_artisanId_groupId_key" ON "ArtisanGroupMembership"("artisanId", "groupId");
