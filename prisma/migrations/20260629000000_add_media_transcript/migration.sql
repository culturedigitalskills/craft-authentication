-- CreateEnum
CREATE TYPE "TranscriptStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "MediaTranscript" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "audioMediaId" TEXT,
    "status" "TranscriptStatus" NOT NULL DEFAULT 'PENDING',
    "sourceLanguage" TEXT,
    "segments" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaTranscript_mediaId_key" ON "MediaTranscript"("mediaId");

-- CreateIndex
CREATE INDEX "MediaTranscript_status_idx" ON "MediaTranscript"("status");

-- AddForeignKey
ALTER TABLE "MediaTranscript" ADD CONSTRAINT "MediaTranscript_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaTranscript" ADD CONSTRAINT "MediaTranscript_audioMediaId_fkey" FOREIGN KEY ("audioMediaId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
