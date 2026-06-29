-- Dimensions (width/height/depth) with a selectable unit (e.g. cm / in)
ALTER TABLE "Craft" ADD COLUMN "width" DOUBLE PRECISION;
ALTER TABLE "Craft" ADD COLUMN "height" DOUBLE PRECISION;
ALTER TABLE "Craft" ADD COLUMN "depth" DOUBLE PRECISION;
ALTER TABLE "Craft" ADD COLUMN "dimensionUnit" TEXT;

-- Weight with a selectable unit (e.g. g / kg / oz / lb)
ALTER TABLE "Craft" ADD COLUMN "weight" DOUBLE PRECISION;
ALTER TABLE "Craft" ADD COLUMN "weightUnit" TEXT;

-- Free-text story fields
ALTER TABLE "Craft" ADD COLUMN "inspiration" TEXT;
ALTER TABLE "Craft" ADD COLUMN "careInstructions" TEXT;
