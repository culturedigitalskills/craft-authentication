/*
  Warnings:

  - You are about to drop the column `batchId` on the `VerifiableCredential` table. All the data in the column will be lost.
  - You are about to drop the `ArtisanTechnique` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Batch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BatchArtisan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CraftCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Material` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductTypeMaterial` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductTypeTechnique` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Technique` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ArtisanTechnique" DROP CONSTRAINT "ArtisanTechnique_artisanId_fkey";

-- DropForeignKey
ALTER TABLE "ArtisanTechnique" DROP CONSTRAINT "ArtisanTechnique_techniqueId_fkey";

-- DropForeignKey
ALTER TABLE "Batch" DROP CONSTRAINT "Batch_productTypeId_fkey";

-- DropForeignKey
ALTER TABLE "BatchArtisan" DROP CONSTRAINT "BatchArtisan_artisanId_fkey";

-- DropForeignKey
ALTER TABLE "BatchArtisan" DROP CONSTRAINT "BatchArtisan_batchId_fkey";

-- DropForeignKey
ALTER TABLE "BatchTag" DROP CONSTRAINT "BatchTag_batchId_fkey";

-- DropForeignKey
ALTER TABLE "CraftCategory" DROP CONSTRAINT "CraftCategory_parentId_fkey";

-- DropForeignKey
ALTER TABLE "ProductType" DROP CONSTRAINT "ProductType_artisanId_fkey";

-- DropForeignKey
ALTER TABLE "ProductType" DROP CONSTRAINT "ProductType_craftCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "ProductTypeMaterial" DROP CONSTRAINT "ProductTypeMaterial_materialId_fkey";

-- DropForeignKey
ALTER TABLE "ProductTypeMaterial" DROP CONSTRAINT "ProductTypeMaterial_productTypeId_fkey";

-- DropForeignKey
ALTER TABLE "ProductTypeTechnique" DROP CONSTRAINT "ProductTypeTechnique_productTypeId_fkey";

-- DropForeignKey
ALTER TABLE "ProductTypeTechnique" DROP CONSTRAINT "ProductTypeTechnique_techniqueId_fkey";

-- DropForeignKey
ALTER TABLE "Technique" DROP CONSTRAINT "Technique_craftCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "VerifiableCredential" DROP CONSTRAINT "VerifiableCredential_batchId_fkey";

-- DropIndex
DROP INDEX "VerifiableCredential_batchId_idx";

-- AlterTable
ALTER TABLE "VerifiableCredential" DROP COLUMN "batchId";

-- DropTable
DROP TABLE "ArtisanTechnique";

-- DropTable
DROP TABLE "Batch";

-- DropTable
DROP TABLE "BatchArtisan";

-- DropTable
DROP TABLE "CraftCategory";

-- DropTable
DROP TABLE "Material";

-- DropTable
DROP TABLE "ProductType";

-- DropTable
DROP TABLE "ProductTypeMaterial";

-- DropTable
DROP TABLE "ProductTypeTechnique";

-- DropTable
DROP TABLE "Technique";
