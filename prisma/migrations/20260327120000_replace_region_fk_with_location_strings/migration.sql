-- Migrate artisan location data from Region/Country FK to plain strings

-- Step 1: Add new string columns
ALTER TABLE "Artisan" ADD COLUMN "country" TEXT;
ALTER TABLE "Artisan" ADD COLUMN "region" TEXT;

-- Step 2: Populate from existing Region/Country data
UPDATE "Artisan" a
SET
    "country" = c."name",
    "region"  = r."name"
FROM "Region" r
JOIN "Country" c ON r."countryId" = c."id"
WHERE a."regionId" = r."id";

-- Step 3: Drop the FK constraint and index
ALTER TABLE "Artisan" DROP CONSTRAINT IF EXISTS "Artisan_regionId_fkey";
DROP INDEX IF EXISTS "Artisan_regionId_idx";

-- Step 4: Drop the regionId column
ALTER TABLE "Artisan" DROP COLUMN "regionId";

-- Step 5: Drop the Region and Country tables
DROP TABLE IF EXISTS "Region";
DROP TABLE IF EXISTS "Country";
