-- AlterTable
ALTER TABLE "Artisan" ADD COLUMN     "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "socialFacebook" VARCHAR(100),
ADD COLUMN     "socialInstagram" VARCHAR(100),
ADD COLUMN     "socialTiktok" VARCHAR(100),
ADD COLUMN     "socialTwitter" VARCHAR(100),
ADD COLUMN     "socialYoutube" VARCHAR(100),
ADD COLUMN     "website" VARCHAR(255);
