-- AlterTable
ALTER TABLE "ArtisanGroupMembership" RENAME CONSTRAINT "ArtisanCommunityMembership_pkey" TO "ArtisanGroupMembership_pkey";

-- AlterTable
ALTER TABLE "Group" RENAME CONSTRAINT "Community_pkey" TO "Group_pkey";
