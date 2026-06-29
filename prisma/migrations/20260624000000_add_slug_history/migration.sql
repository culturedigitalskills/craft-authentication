-- AlterTable
ALTER TABLE "Artisan" ADD COLUMN "previousSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Group" ADD COLUMN "previousSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Artisan_previousSlugs_idx" ON "Artisan" USING GIN ("previousSlugs");

-- CreateIndex
CREATE INDEX "Group_previousSlugs_idx" ON "Group" USING GIN ("previousSlugs");
