import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

import { getPrisma } from "../src/lib/prisma.js";
import {
  CLOUDINARY_ALBUM_COVERS_FOLDER,
  CLOUDINARY_PHOTOS_FOLDER,
  isCloudinaryUrl,
  parseCloudinaryPublicId,
  uploadCloudinaryImage,
} from "../src/lib/cloudinary.js";

const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");

function isHttpUrl(url) {
  return typeof url === "string" && /^https?:\/\//.test(url);
}

function isLegacyLocalUrl(url) {
  return typeof url === "string" && url.startsWith("/");
}

function isDataUrl(url) {
  return typeof url === "string" && url.startsWith("data:");
}

function photoStatus(photo) {
  if (isLegacyLocalUrl(photo.url)) return "legacy-local";
  if (isDataUrl(photo.url)) return "legacy-data";
  if (isCloudinaryUrl(photo.url) && !photo.cloudinaryPublicId) return "cloudinary-without-public-id";
  if (isHttpUrl(photo.url) && photo.cloudinaryPublicId) return "migrated";
  if (isHttpUrl(photo.url)) return "http-without-public-id";
  return "other";
}

function coverStatus(album) {
  if (!album.cover) return "empty";
  if (isLegacyLocalUrl(album.cover)) return "legacy-local";
  if (isDataUrl(album.cover)) return "legacy-data";
  if (isHttpUrl(album.cover) && album.coverCloudinaryPublicId) return "migrated";
  if (isHttpUrl(album.cover)) return "http-without-public-id";
  return "other";
}

function summarize(items, getStatus) {
  return items.reduce((summary, item) => {
    const status = getStatus(item);
    summary[status] = (summary[status] ?? 0) + 1;
    return summary;
  }, {});
}

function mimeTypeFromFileName(fileName, fallback = "image/jpeg") {
  const extension = path.extname(fileName || "").toLowerCase();

  switch (extension) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".jpeg":
    case ".jpg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    default:
      return fallback;
  }
}

function parseDataUrl(dataUrl) {
  const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl);

  if (!match) {
    throw new Error("Unsupported data URL payload");
  }

  const [, mimeType, payload] = match;
  return {
    mimeType,
    buffer: Buffer.from(payload, "base64"),
  };
}

async function loadAssetSource(assetUrl, fallbackName, fallbackMimeType) {
  if (isLegacyLocalUrl(assetUrl)) {
    const relativePath = assetUrl.replace(/^\/+/, "").replace(/\//g, path.sep);
    const absolutePath = path.join(process.cwd(), "public", relativePath);
    const buffer = await fs.readFile(absolutePath);
    const fileName = path.basename(absolutePath);

    return {
      blob: new Blob([buffer], { type: mimeTypeFromFileName(fileName, fallbackMimeType) }),
      fileName,
    };
  }

  if (isDataUrl(assetUrl)) {
    const { buffer, mimeType } = parseDataUrl(assetUrl);
    const fileName = fallbackName || `asset.${mimeType.split("/")[1] || "jpg"}`;

    return {
      blob: new Blob([buffer], { type: mimeType || fallbackMimeType }),
      fileName,
    };
  }

  throw new Error(`Unsupported legacy asset URL: ${assetUrl}`);
}

async function migratePhoto(prisma, photo) {
  const legacyUrl = photo.url;
  const { blob, fileName } = await loadAssetSource(legacyUrl, photo.title || `${photo.id}.jpg`, photo.type || "image/jpeg");
  const upload = await uploadCloudinaryImage({
    file: blob,
    fileName,
    folder: `${CLOUDINARY_PHOTOS_FOLDER}/legacy`,
    publicId: photo.id,
    overwrite: true,
  });

  await prisma.$transaction(async (tx) => {
    await tx.photo.update({
      where: { id: photo.id },
      data: {
        url: upload.url,
        cloudinaryPublicId: upload.publicId,
      },
    });

    await tx.album.updateMany({
      where: {
        id: photo.albumId,
        cover: legacyUrl,
      },
      data: {
        cover: upload.url,
        coverCloudinaryPublicId: upload.publicId,
      },
    });
  });

  return upload;
}

async function backfillPhotoPublicId(prisma, photo) {
  const parsedPublicId = parseCloudinaryPublicId(photo.url);

  if (!parsedPublicId) {
    return false;
  }

  await prisma.photo.update({
    where: { id: photo.id },
    data: {
      cloudinaryPublicId: parsedPublicId,
    },
  });

  return true;
}

async function migrateAlbumCover(prisma, album) {
  if (!album.cover) {
    return { skipped: true, reason: "empty" };
  }

  if (isCloudinaryUrl(album.cover) && album.coverCloudinaryPublicId) {
    return { skipped: true, reason: "already-migrated" };
  }

  if (isCloudinaryUrl(album.cover) && !album.coverCloudinaryPublicId) {
    const parsedPublicId = parseCloudinaryPublicId(album.cover);

    if (parsedPublicId) {
      await prisma.album.update({
        where: { id: album.id },
        data: {
          coverCloudinaryPublicId: parsedPublicId,
        },
      });
      return { skipped: false, source: "parsed-cloudinary-url" };
    }

    return { skipped: true, reason: "unparseable-http-cover" };
  }

  const { blob, fileName } = await loadAssetSource(album.cover, `${album.id}-cover.jpg`, "image/jpeg");
  const upload = await uploadCloudinaryImage({
    file: blob,
    fileName,
    folder: `${CLOUDINARY_ALBUM_COVERS_FOLDER}/legacy`,
    publicId: album.id,
    overwrite: true,
  });

  await prisma.album.update({
    where: { id: album.id },
    data: {
      cover: upload.url,
      coverCloudinaryPublicId: upload.publicId,
    },
  });

  return { skipped: false, source: "standalone-cover" };
}

async function main() {
  const prisma = await getPrisma();

  try {
    const [photos, albums] = await Promise.all([
      prisma.photo.findMany({
        select: {
          id: true,
          title: true,
          url: true,
          type: true,
          albumId: true,
          cloudinaryPublicId: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.album.findMany({
        select: {
          id: true,
          title: true,
          cover: true,
          coverCloudinaryPublicId: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const photoSummary = summarize(photos, photoStatus);
    const coverSummary = summarize(albums, coverStatus);

    console.log("Legacy Cloudinary migration summary");
    console.log(JSON.stringify({ photos: photoSummary, albumCovers: coverSummary }, null, 2));

    if (isDryRun) {
      console.log("Dry run only. No changes were written.");
      return;
    }

    const legacyPhotos = photos.filter((photo) => {
      const status = photoStatus(photo);
      return status === "legacy-local" || status === "legacy-data";
    });
    const photosMissingPublicId = photos.filter((photo) => photoStatus(photo) === "cloudinary-without-public-id");

    for (const photo of legacyPhotos) {
      console.log(`Migrating photo ${photo.id} (${photo.title || "untitled"})`);
      await migratePhoto(prisma, photo);
    }

    for (const photo of photosMissingPublicId) {
      console.log(`Backfilling Cloudinary public id for photo ${photo.id}`);
      const updated = await backfillPhotoPublicId(prisma, photo);

      if (!updated) {
        console.log(`Skipped photo ${photo.id}: unable to parse Cloudinary public id from URL`);
      }
    }

    for (const album of albums) {
      const status = coverStatus(album);

      if (status === "empty" || status === "migrated") {
        continue;
      }

      console.log(`Migrating album cover ${album.id} (${album.title})`);
      const result = await migrateAlbumCover(prisma, album);

      if (result.skipped) {
        console.log(`Skipped album ${album.id}: ${result.reason}`);
      }
    }

    console.log("Legacy Cloudinary migration completed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Legacy Cloudinary migration failed:", error);
  process.exit(1);
});
