import { SYSTEM_ALBUM_ID, SYSTEM_ALBUM_TITLE } from "@/lib/album-constants";
import { getSql } from "@/lib/runtime-db";

export async function ensureUncategorizedAlbum(sqlInput) {
  const sql = sqlInput ?? getSql();
  const [album] = await sql`
    INSERT INTO "Album" ("id", "title", "createdAt", "updatedAt")
    VALUES (${SYSTEM_ALBUM_ID}, ${SYSTEM_ALBUM_TITLE}, NOW(), NOW())
    ON CONFLICT ("id") DO UPDATE
    SET
      "title" = EXCLUDED."title",
      "updatedAt" = NOW()
    RETURNING
      "id",
      "title",
      "description",
      "cover",
      "coverCloudinaryPublicId",
      "createdAt",
      "updatedAt"
  `;

  return album ?? null;
}

export function isSystemAlbumId(id) {
  return id === SYSTEM_ALBUM_ID;
}
