-- AlterTable
ALTER TABLE "User" ADD COLUMN     "c2pa_auto_renew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "c2pa_cert_expires_at" TIMESTAMP(3);
