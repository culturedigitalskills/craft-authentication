-- DropForeignKey
ALTER TABLE "CraftStory" DROP CONSTRAINT IF EXISTS "CraftStory_answerBenefitsMediaId_fkey";

-- DropForeignKey
ALTER TABLE "CraftStory" DROP CONSTRAINT IF EXISTS "CraftStory_answerChallengesMediaId_fkey";

-- DropForeignKey
ALTER TABLE "CraftStory" DROP CONSTRAINT IF EXISTS "CraftStory_answerCraftMediaId_fkey";

-- DropForeignKey
ALTER TABLE "CraftStory" DROP CONSTRAINT IF EXISTS "CraftStory_answerFutureMediaId_fkey";

-- DropForeignKey
ALTER TABLE "CraftStory" DROP CONSTRAINT IF EXISTS "CraftStory_answerMeaningMediaId_fkey";

-- DropForeignKey
ALTER TABLE "CraftStory" DROP CONSTRAINT IF EXISTS "CraftStory_answerSelfMediaId_fkey";
