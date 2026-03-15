import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

const SYSTEM_ALBUM_ID = "uncategorized";
const SYSTEM_ALBUM_TITLE = "未分类";
const { getPrisma } = await import("../src/lib/prisma.js");
const prisma = await getPrisma();

async function ensureUncategorizedAlbum() {
  return prisma.album.upsert({
    where: { id: SYSTEM_ALBUM_ID },
    update: { title: SYSTEM_ALBUM_TITLE },
    create: {
      id: SYSTEM_ALBUM_ID,
      title: SYSTEM_ALBUM_TITLE,
    },
  });
}

async function main() {
  const dataPath = path.join(process.cwd(), "legacy-vite", "src", "data", "initialData.json");
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Initial data not found at: ${dataPath}`);
  }

  const initialData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  await ensureUncategorizedAlbum();
  const albumSortOrder = new Map();

  console.log("Seeding albums...");
  for (const album of initialData.albums) {
    if (album.id === "all" || album.id === SYSTEM_ALBUM_ID) continue;
    
    await prisma.album.upsert({
      where: { id: album.id },
      update: {
        title: album.id === SYSTEM_ALBUM_ID ? SYSTEM_ALBUM_TITLE : album.name,
        cover: album.cover,
        coverCloudinaryPublicId: null,
      },
      create: {
        id: album.id,
        title: album.id === SYSTEM_ALBUM_ID ? SYSTEM_ALBUM_TITLE : album.name,
        cover: album.cover,
        coverCloudinaryPublicId: null,
        createdAt: new Date(album.createdAt || Date.now()),
      },
    });
  }

  console.log("Seeding photos...");
  for (const photo of initialData.photos) {
    const albumId =
      photo.albumId === SYSTEM_ALBUM_ID ? (await ensureUncategorizedAlbum()).id : photo.albumId;

    await prisma.photo.upsert({
      where: { id: photo.id },
      update: {},
      create: {
        id: photo.id,
        url: photo.url,
        cloudinaryPublicId: null,
        title: photo.name,
        size: photo.size,
        type: photo.type,
        sortOrder: albumSortOrder.get(albumId) ?? 0,
        createdAt: new Date(photo.uploadedAt || Date.now()),
        albumId,
      },
    });

    albumSortOrder.set(albumId, (albumSortOrder.get(albumId) ?? 0) + 1);
  }

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
