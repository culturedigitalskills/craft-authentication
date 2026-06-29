-- Add per-item public/private visibility flag for media attachments (gallery)
ALTER TABLE "MediaAttachment" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;
