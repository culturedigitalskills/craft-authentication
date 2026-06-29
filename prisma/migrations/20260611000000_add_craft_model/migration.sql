-- CreateTable
CREATE TABLE "Craft" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "material" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isSharedLocation" BOOLEAN NOT NULL DEFAULT true,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "place" TEXT,
    "videos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Craft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Craft_artisanId_idx" ON "Craft"("artisanId");

-- CreateIndex
CREATE INDEX "Craft_isPublic_idx" ON "Craft"("isPublic");

-- AddForeignKey
ALTER TABLE "Craft" ADD CONSTRAINT "Craft_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "Artisan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
