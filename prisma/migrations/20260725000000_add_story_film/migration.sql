-- CreateEnum
CREATE TYPE "FilmStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "StoryFilm" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "status" "FilmStatus" NOT NULL DEFAULT 'PENDING',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "outputMediaId" TEXT,
    "templateVersion" INTEGER NOT NULL DEFAULT 1,
    "inputsHash" TEXT,
    "durationSec" DOUBLE PRECISION,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryFilm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoryFilm_storyId_key" ON "StoryFilm"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryFilm_outputMediaId_key" ON "StoryFilm"("outputMediaId");

-- CreateIndex
CREATE INDEX "StoryFilm_status_idx" ON "StoryFilm"("status");

-- AddForeignKey
ALTER TABLE "StoryFilm" ADD CONSTRAINT "StoryFilm_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "CraftStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryFilm" ADD CONSTRAINT "StoryFilm_outputMediaId_fkey" FOREIGN KEY ("outputMediaId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
