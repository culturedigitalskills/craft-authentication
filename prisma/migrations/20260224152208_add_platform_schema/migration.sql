-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ARTISAN');

-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('QR', 'NFC');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('HERO', 'GALLERY', 'PROCESS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'ARTISAN';

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "isoCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regionType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isWomenLed" BOOLEAN NOT NULL DEFAULT false,
    "isCooperative" BOOLEAN NOT NULL DEFAULT false,
    "isFairTrade" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artisan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "regionId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "yearsOfExperience" INTEGER,
    "learningSource" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Artisan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtisanCommunityMembership" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "role" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "joinedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftDate" TIMESTAMP(3),

    CONSTRAINT "ArtisanCommunityMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CraftCategory" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CraftCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technique" (
    "id" TEXT NOT NULL,
    "craftCategoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isTraditional" BOOLEAN NOT NULL DEFAULT false,
    "isUnescoListed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Technique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtisanTechnique" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "techniqueId" TEXT NOT NULL,
    "yearsPracticing" INTEGER,

    CONSTRAINT "ArtisanTechnique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isNatural" BOOLEAN NOT NULL DEFAULT false,
    "isSustainable" BOOLEAN NOT NULL DEFAULT false,
    "isLocallySourced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductType" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "craftCategoryId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "story" TEXT,
    "avgProductionTime" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTypeMaterial" (
    "id" TEXT NOT NULL,
    "productTypeId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "usageNotes" TEXT,

    CONSTRAINT "ProductTypeMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTypeTechnique" (
    "id" TEXT NOT NULL,
    "productTypeId" TEXT NOT NULL,
    "techniqueId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sequenceOrder" INTEGER,

    CONSTRAINT "ProductTypeTechnique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "productTypeId" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "productionStart" TIMESTAMP(3),
    "productionEnd" TIMESTAMP(3),
    "productionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchArtisan" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "contributionType" TEXT,
    "contributionPercentage" DOUBLE PRECISION,

    CONSTRAINT "BatchArtisan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchTag" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "itemNumber" INTEGER NOT NULL,
    "tagCode" TEXT NOT NULL,
    "tagType" "TagType" NOT NULL DEFAULT 'QR',
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMP(3),

    CONSTRAINT "BatchTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagScan" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countryCode" TEXT,
    "city" TEXT,

    CONSTRAINT "TagScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifiableCredential" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "issuerDid" TEXT NOT NULL,
    "holderDid" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "credentialType" TEXT NOT NULL,
    "credentialSubject" JSONB NOT NULL,
    "proof" JSONB NOT NULL,
    "issuanceDate" TIMESTAMP(3) NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerifiableCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAttachment" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "attachmentType" "AttachmentType" NOT NULL DEFAULT 'GALLERY',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_isoCode_key" ON "Country"("isoCode");

-- CreateIndex
CREATE INDEX "Region_countryId_idx" ON "Region"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "Community_slug_key" ON "Community"("slug");

-- CreateIndex
CREATE INDEX "Community_regionId_idx" ON "Community"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "Artisan_userId_key" ON "Artisan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Artisan_slug_key" ON "Artisan"("slug");

-- CreateIndex
CREATE INDEX "Artisan_regionId_idx" ON "Artisan"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtisanCommunityMembership_artisanId_communityId_key" ON "ArtisanCommunityMembership"("artisanId", "communityId");

-- CreateIndex
CREATE UNIQUE INDEX "CraftCategory_code_key" ON "CraftCategory"("code");

-- CreateIndex
CREATE INDEX "CraftCategory_parentId_idx" ON "CraftCategory"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Technique_code_key" ON "Technique"("code");

-- CreateIndex
CREATE INDEX "Technique_craftCategoryId_idx" ON "Technique"("craftCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtisanTechnique_artisanId_techniqueId_key" ON "ArtisanTechnique"("artisanId", "techniqueId");

-- CreateIndex
CREATE UNIQUE INDEX "Material_code_key" ON "Material"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductType_slug_key" ON "ProductType"("slug");

-- CreateIndex
CREATE INDEX "ProductType_artisanId_idx" ON "ProductType"("artisanId");

-- CreateIndex
CREATE INDEX "ProductType_craftCategoryId_idx" ON "ProductType"("craftCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTypeMaterial_productTypeId_materialId_key" ON "ProductTypeMaterial"("productTypeId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTypeTechnique_productTypeId_techniqueId_key" ON "ProductTypeTechnique"("productTypeId", "techniqueId");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_batchCode_key" ON "Batch"("batchCode");

-- CreateIndex
CREATE INDEX "Batch_productTypeId_idx" ON "Batch"("productTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchArtisan_batchId_artisanId_key" ON "BatchArtisan"("batchId", "artisanId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchTag_tagCode_key" ON "BatchTag"("tagCode");

-- CreateIndex
CREATE INDEX "BatchTag_batchId_idx" ON "BatchTag"("batchId");

-- CreateIndex
CREATE INDEX "TagScan_tagId_idx" ON "TagScan"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "VerifiableCredential_credentialId_key" ON "VerifiableCredential"("credentialId");

-- CreateIndex
CREATE INDEX "VerifiableCredential_batchId_idx" ON "VerifiableCredential"("batchId");

-- CreateIndex
CREATE INDEX "VerifiableCredential_holderDid_idx" ON "VerifiableCredential"("holderDid");

-- CreateIndex
CREATE INDEX "MediaAttachment_entityType_entityId_idx" ON "MediaAttachment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "MediaAttachment_mediaId_idx" ON "MediaAttachment"("mediaId");

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artisan" ADD CONSTRAINT "Artisan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artisan" ADD CONSTRAINT "Artisan_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtisanCommunityMembership" ADD CONSTRAINT "ArtisanCommunityMembership_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "Artisan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtisanCommunityMembership" ADD CONSTRAINT "ArtisanCommunityMembership_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CraftCategory" ADD CONSTRAINT "CraftCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CraftCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technique" ADD CONSTRAINT "Technique_craftCategoryId_fkey" FOREIGN KEY ("craftCategoryId") REFERENCES "CraftCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtisanTechnique" ADD CONSTRAINT "ArtisanTechnique_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "Artisan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtisanTechnique" ADD CONSTRAINT "ArtisanTechnique_techniqueId_fkey" FOREIGN KEY ("techniqueId") REFERENCES "Technique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductType" ADD CONSTRAINT "ProductType_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "Artisan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductType" ADD CONSTRAINT "ProductType_craftCategoryId_fkey" FOREIGN KEY ("craftCategoryId") REFERENCES "CraftCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTypeMaterial" ADD CONSTRAINT "ProductTypeMaterial_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTypeMaterial" ADD CONSTRAINT "ProductTypeMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTypeTechnique" ADD CONSTRAINT "ProductTypeTechnique_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTypeTechnique" ADD CONSTRAINT "ProductTypeTechnique_techniqueId_fkey" FOREIGN KEY ("techniqueId") REFERENCES "Technique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchArtisan" ADD CONSTRAINT "BatchArtisan_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchArtisan" ADD CONSTRAINT "BatchArtisan_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "Artisan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchTag" ADD CONSTRAINT "BatchTag_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagScan" ADD CONSTRAINT "TagScan_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "BatchTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiableCredential" ADD CONSTRAINT "VerifiableCredential_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAttachment" ADD CONSTRAINT "MediaAttachment_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
