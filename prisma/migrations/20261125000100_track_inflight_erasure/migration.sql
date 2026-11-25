-- Account erasure takes ownership of unfinished uploads before deleting their uploader.
ALTER TABLE "ErasureObject" ADD COLUMN "pendingUploaderId" TEXT;
ALTER TABLE "ErasureObject" ADD CONSTRAINT "ErasureObject_pendingUploaderId_fkey"
    FOREIGN KEY ("pendingUploaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ErasureObject_pendingUploaderId_idx" ON "ErasureObject"("pendingUploaderId");
