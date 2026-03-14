import { SYSTEM_ALBUM_ID, SYSTEM_ALBUM_TITLE } from "@/lib/album-constants";
import { getPrisma } from "@/lib/prisma";

export async function ensureUncategorizedAlbum(prisma = getPrisma()) {
  return prisma.album.upsert({
    where: { id: SYSTEM_ALBUM_ID },
    update: { title: SYSTEM_ALBUM_TITLE },
    create: {
      id: SYSTEM_ALBUM_ID,
      title: SYSTEM_ALBUM_TITLE,
    },
  });
}

export function isSystemAlbumId(id) {
  return id === SYSTEM_ALBUM_ID;
}
