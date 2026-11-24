ALTER TABLE "CraftStory" ADD COLUMN "sceneSettings" JSONB;
ALTER TABLE "StoryFilm" ADD COLUMN "chapters" JSONB;
CREATE TABLE "StoryPublication" (
    "storyId" TEXT PRIMARY KEY REFERENCES "CraftStory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "answers" JSONB NOT NULL,
    "summaryText" TEXT,
    "workshopIds" TEXT[] NOT NULL DEFAULT '{}',
    "mediaIds" TEXT[] NOT NULL DEFAULT '{}',
    "filmMediaId" TEXT,
    "filmChapters" JSONB
);
CREATE INDEX "StoryPublication_mediaIds_idx" ON "StoryPublication" USING GIN ("mediaIds");
CREATE INDEX "StoryPublication_filmMediaId_idx" ON "StoryPublication" ("filmMediaId");

-- Freeze what visitors could see before the upgrade. Do not publish drafts or hidden films.
INSERT INTO "StoryPublication" ("storyId", "answers", "summaryText", "workshopIds", "mediaIds", "filmMediaId")
SELECT s.id,
       (SELECT jsonb_object_agg(k, v) FROM jsonb_each(to_jsonb(s)) e(k,v)
        WHERE k ~ '^answer(Self|Craft|Meaning|Benefits|Challenges|Future)(Text|MediaId)$'),
       s."summaryText", w.ids,
       array_remove(ARRAY[s."answerSelfMediaId", s."answerCraftMediaId", s."answerMeaningMediaId",
                          s."answerBenefitsMediaId", s."answerChallengesMediaId", s."answerFutureMediaId"], NULL) || w.ids,
       f."outputMediaId"
FROM "CraftStory" s
CROSS JOIN LATERAL (SELECT ARRAY(SELECT a."mediaId" FROM "MediaAttachment" a
    WHERE a."entityType" = 'CraftStory' AND a."entityId" = s.id AND a."attachmentType" = 'PROCESS'
    ORDER BY a."displayOrder", a.id) AS ids) w
LEFT JOIN "StoryFilm" f ON f."storyId" = s.id AND f.status = 'READY' AND f."isPublic"
WHERE s.status = 'PUBLISHED';
