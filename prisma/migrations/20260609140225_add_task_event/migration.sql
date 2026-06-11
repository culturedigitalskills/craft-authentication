-- CreateTable
CREATE TABLE "TaskEvent" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'image-generation',
    "settings" JSONB NOT NULL,
    "error_message" TEXT,
    "media_file_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "error_at" TIMESTAMP(3),

    CONSTRAINT "TaskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskEvent_user_id_idx" ON "TaskEvent"("user_id");

-- CreateIndex
CREATE INDEX "TaskEvent_type_idx" ON "TaskEvent"("type");

-- CreateIndex
CREATE INDEX "TaskEvent_created_at_idx" ON "TaskEvent"("created_at");

-- AddForeignKey
ALTER TABLE "TaskEvent" ADD CONSTRAINT "TaskEvent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskEvent" ADD CONSTRAINT "TaskEvent_media_file_id_fkey" FOREIGN KEY ("media_file_id") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
