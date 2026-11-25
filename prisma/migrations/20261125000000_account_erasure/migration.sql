-- A receipt contains no account identifier. Object keys are held only until storage confirms deletion.
CREATE TABLE "ErasureReceipt" (
    "id" TEXT PRIMARY KEY,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3)
);
CREATE TABLE "ErasureObject" (
    "id" TEXT PRIMARY KEY,
    "receiptId" TEXT REFERENCES "ErasureReceipt"("id") ON DELETE RESTRICT,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "retryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ErasureObject_retryAt_idx" ON "ErasureObject"("retryAt");
CREATE INDEX "ErasureObject_receiptId_idx" ON "ErasureObject"("receiptId");
CREATE INDEX "ErasureReceipt_completedAt_idx" ON "ErasureReceipt"("completedAt");
