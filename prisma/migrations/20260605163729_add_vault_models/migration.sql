-- CreateEnum
CREATE TYPE "VaultWrapMode" AS ENUM ('E2E_PRF', 'SSE_KMS', 'RECOVERY_TOKEN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "master_key_hash" TEXT;

-- CreateTable
CREATE TABLE "UserSecrets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ciphertext_data" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSecrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWrappedVaultKeys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "credential_id" TEXT,
    "wrap_mode" "VaultWrapMode" NOT NULL,
    "wrapped_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWrappedVaultKeys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSecrets_user_id_idx" ON "UserSecrets"("user_id");

-- CreateIndex
CREATE INDEX "UserWrappedVaultKeys_user_id_idx" ON "UserWrappedVaultKeys"("user_id");

-- CreateIndex
CREATE INDEX "UserWrappedVaultKeys_credential_id_idx" ON "UserWrappedVaultKeys"("credential_id");

-- AddForeignKey
ALTER TABLE "UserSecrets" ADD CONSTRAINT "UserSecrets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWrappedVaultKeys" ADD CONSTRAINT "UserWrappedVaultKeys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
