"use server";

import { revalidatePath } from "next/cache";

import {
  clearAdminSession,
  requireAdmin,
  setAdminSession,
  validateAdminCredentials,
} from "@/lib/admin-session";
import { SYSTEM_ALBUM_ID } from "@/lib/album-constants";
import { ensureUncategorizedAlbum, isSystemAlbumId } from "@/lib/albums";
import { getPrisma } from "@/lib/prisma";

export async function getAlbums() {
  const prisma = getPrisma();

  return prisma.album.findMany({
    include: {
      photos: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getPhotos(albumId) {
  const prisma = getPrisma();

  if (albumId === "all") {
    return prisma.photo.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  return prisma.photo.findMany({
    where: { albumId },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function loginAdmin(username, password) {
  const result = validateAdminCredentials((username ?? "").trim(), password ?? "");

  if (!result.ok) {
    return result;
  }

  await setAdminSession();
  return { ok: true };
}

export async function logoutAdmin() {
  await clearAdminSession();
  return { ok: true };
}

export async function createAlbum(title) {
  await requireAdmin();

  const prisma = getPrisma();
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    throw new Error("Album title is required");
  }

  const album = await prisma.album.create({
    data: {
      title: normalizedTitle,
    },
  });

  revalidatePath("/");
  return album;
}

export async function deleteAlbum(id) {
  await requireAdmin();

  if (isSystemAlbumId(id)) {
    throw new Error("The system album cannot be deleted");
  }

  const prisma = getPrisma();

  await prisma.$transaction([
    prisma.photo.deleteMany({
      where: { albumId: id },
    }),
    prisma.album.delete({
      where: { id },
    }),
  ]);

  revalidatePath("/");
}

export async function addPhoto(data) {
  await requireAdmin();

  const prisma = getPrisma();
  const normalizedTitle = data.title?.trim() || null;
  const targetAlbumId = data.albumId && data.albumId !== "all" ? data.albumId : SYSTEM_ALBUM_ID;

  if (targetAlbumId === SYSTEM_ALBUM_ID) {
    await ensureUncategorizedAlbum(prisma);
  }

  const photo = await prisma.photo.create({
    data: {
      url: data.url,
      title: normalizedTitle,
      size: data.size ?? null,
      type: data.type ?? null,
      albumId: targetAlbumId,
    },
  });

  revalidatePath("/");
  return photo;
}

export async function deletePhoto(id) {
  await requireAdmin();

  const prisma = getPrisma();

  await prisma.photo.delete({
    where: { id },
  });

  revalidatePath("/");
}
