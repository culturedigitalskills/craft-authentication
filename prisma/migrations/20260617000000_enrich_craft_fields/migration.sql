-- Rename "material" -> "materials" (preserves existing values)
ALTER TABLE "Craft" RENAME COLUMN "material" TO "materials";

-- Add new optional free-text fields
ALTER TABLE "Craft" ADD COLUMN "technique" TEXT;
ALTER TABLE "Craft" ADD COLUMN "timeToMake" TEXT;
