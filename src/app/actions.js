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
import { getActionErrorMessage } from "@/lib/action-errors";
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
  try {
    await requireAdmin();

    const prisma = getPrisma();
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      return { ok: false, error: "请输入相册名称" };
    }

    const album = await prisma.album.create({
      data: {
        title: normalizedTitle,
      },
    });

    revalidatePath("/");
    return { ok: true, album };
  } catch (error) {
    console.error("createAlbum failed", error);
    return { ok: false, error: getActionErrorMessage(error, "新建相册失败") };
  }
}

export async function deleteAlbum(id) {
  try {
    await requireAdmin();

    if (isSystemAlbumId(id)) {
      return { ok: false, error: "系统相册不能删除" };
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
    return { ok: true };
  } catch (error) {
    console.error("deleteAlbum failed", error);
    return { ok: false, error: getActionErrorMessage(error, "删除相册失败") };
  }
}

export async function addPhoto(data) {
  try {
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
    return { ok: true, photo };
  } catch (error) {
    console.error("addPhoto failed", error);
    return { ok: false, error: getActionErrorMessage(error, "上传照片失败") };
  }
}

export async function deletePhoto(id) {
  try {
    await requireAdmin();

    const prisma = getPrisma();

    await prisma.photo.delete({
      where: { id },
    });

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("deletePhoto failed", error);
    return { ok: false, error: getActionErrorMessage(error, "删除照片失败") };
  }
}
