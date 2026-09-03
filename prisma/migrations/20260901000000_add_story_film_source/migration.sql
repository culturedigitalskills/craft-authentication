-- CreateEnum
CREATE TYPE "FilmSource" AS ENUM ('RENDERED', 'UPLOADED');

-- AlterTable
ALTER TABLE "StoryFilm" ADD COLUMN     "source" "FilmSource" NOT NULL DEFAULT 'RENDERED';
