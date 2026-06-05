-- Track who uploaded each MediaFile so we can check ownership at attach/embed time.
ALTER TABLE "MediaFile" ADD COLUMN "uploaderId" TEXT;
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_uploaderId_fkey"
    FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "idx_media_files_uploader_id" ON "MediaFile"("uploaderId");

-- Referential integrity for the six per-question answer media references.
-- If the underlying MediaFile is deleted, the answer mediaId is set NULL automatically.
ALTER TABLE "CraftStory" ADD CONSTRAINT "CraftStory_answerSelfMediaId_fkey"
    FOREIGN KEY ("answerSelfMediaId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CraftStory" ADD CONSTRAINT "CraftStory_answerCraftMediaId_fkey"
    FOREIGN KEY ("answerCraftMediaId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CraftStory" ADD CONSTRAINT "CraftStory_answerMeaningMediaId_fkey"
    FOREIGN KEY ("answerMeaningMediaId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CraftStory" ADD CONSTRAINT "CraftStory_answerBenefitsMediaId_fkey"
    FOREIGN KEY ("answerBenefitsMediaId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CraftStory" ADD CONSTRAINT "CraftStory_answerFutureMediaId_fkey"
    FOREIGN KEY ("answerFutureMediaId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CraftStory" ADD CONSTRAINT "CraftStory_answerChallengesMediaId_fkey"
    FOREIGN KEY ("answerChallengesMediaId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
