-- AlterTable
ALTER TABLE "Album"
ADD COLUMN "coverCloudinaryPublicId" TEXT;

-- AlterTable
ALTER TABLE "Photo"
ADD COLUMN "cloudinaryPublicId" TEXT,
ADD COLUMN "sortOrder" INTEGER;

WITH ranked_photos AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "albumId"
      ORDER BY "createdAt" DESC, "id" ASC
    ) - 1 AS sort_order
  FROM "Photo"
)
UPDATE "Photo" AS photo
SET "sortOrder" = ranked_photos.sort_order
FROM ranked_photos
WHERE photo."id" = ranked_photos."id";

ALTER TABLE "Photo"
ALTER COLUMN "sortOrder" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Photo_albumId_sortOrder_idx" ON "Photo"("albumId", "sortOrder");
