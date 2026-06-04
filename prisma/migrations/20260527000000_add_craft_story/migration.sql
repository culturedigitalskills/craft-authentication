-- CreateEnum
CREATE TYPE "CraftStoryStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "CraftStory" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "status" "CraftStoryStatus" NOT NULL DEFAULT 'DRAFT',
    "lastStepReached" INTEGER NOT NULL DEFAULT 0,
    "answerSelfText" TEXT,
    "answerSelfMediaId" TEXT,
    "answerCraftText" TEXT,
    "answerCraftMediaId" TEXT,
    "answerMeaningText" TEXT,
    "answerMeaningMediaId" TEXT,
    "answerBenefitsText" TEXT,
    "answerBenefitsMediaId" TEXT,
    "answerFutureText" TEXT,
    "answerFutureMediaId" TEXT,
    "answerChallengesText" TEXT,
    "answerChallengesMediaId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CraftStory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CraftStory_artisanId_key" ON "CraftStory"("artisanId");

-- AddForeignKey
ALTER TABLE "CraftStory" ADD CONSTRAINT "CraftStory_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "Artisan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
