"use server";

import { revalidatePath } from "next/cache";

import {
  clearAdminSession,
  requireAdmin,
  setAdminSession,
  validateAdminCredentials,
} from "@/lib/admin-session";
import { destroyCloudinaryImage } from "@/lib/cloudinary";
import { SYSTEM_ALBUM_ID } from "@/lib/album-constants";
import { ensureUncategorizedAlbum, isSystemAlbumId } from "@/lib/albums";
import { getActionErrorMessage } from "@/lib/action-errors";
import { getPrisma } from "@/lib/prisma";

function okCloudinaryDeleteResult(result) {
  return result === "ok" || result === "not found";
}

async function deleteRemoteAsset(publicId) {
  const payload = await destroyCloudinaryImage(publicId);

  if (!okCloudinaryDeleteResult(payload.result)) {
    throw new Error(`Cloudinary delete failed for ${publicId}`);
  }
}

export async function getAlbums() {
  const prisma = await getPrisma();

  return prisma.album.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getPhotos(albumId) {
  const prisma = await getPrisma();

  if (albumId === "all") {
    return prisma.photo.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  return prisma.photo.findMany({
    where: { albumId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
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

    const prisma = await getPrisma();
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

    const prisma = await getPrisma();
    const album = await prisma.album.findUnique({
      where: { id },
      include: {
        photos: {
          select: {
            cloudinaryPublicId: true,
          },
        },
      },
    });

    if (!album) {
      return { ok: false, error: "相册不存在" };
    }

    const publicIds = new Set(
      [album.coverCloudinaryPublicId, ...album.photos.map((photo) => photo.cloudinaryPublicId)].filter(Boolean)
    );

    for (const publicId of publicIds) {
      await deleteRemoteAsset(publicId);
    }

    await prisma.album.delete({
      where: { id },
    });

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

    const prisma = await getPrisma();
    const normalizedTitle = data.title?.trim() || null;
    const targetAlbumId = data.albumId?.trim();

    if (!targetAlbumId || targetAlbumId === "all") {
      return { ok: false, error: "请选择上传到哪个相册" };
    }

    const photo = await prisma.$transaction(async (tx) => {
      const album =
        targetAlbumId === SYSTEM_ALBUM_ID
          ? await ensureUncategorizedAlbum(tx)
          : await tx.album.findUnique({
              where: { id: targetAlbumId },
              select: {
                id: true,
                cover: true,
              },
            });

      if (!album) {
        throw new Error("目标相册不存在");
      }

      const orderStats = await tx.photo.aggregate({
        where: { albumId: targetAlbumId },
        _max: {
          sortOrder: true,
        },
      });
      const sortOrder = (orderStats._max.sortOrder ?? -1) + 1;
      const createdPhoto = await tx.photo.create({
        data: {
          url: data.url,
          cloudinaryPublicId: data.publicId ?? null,
          title: normalizedTitle,
          size: data.size ?? null,
          type: data.type ?? null,
          albumId: targetAlbumId,
          sortOrder,
        },
      });

      if (!album.cover) {
        await tx.album.update({
          where: { id: targetAlbumId },
          data: {
            cover: createdPhoto.url,
            coverCloudinaryPublicId: createdPhoto.cloudinaryPublicId,
          },
        });
      }

      return createdPhoto;
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

    const prisma = await getPrisma();
    const photo = await prisma.photo.findUnique({
      where: { id },
      select: {
        id: true,
        url: true,
        albumId: true,
        sortOrder: true,
        cloudinaryPublicId: true,
        album: {
          select: {
            cover: true,
            coverCloudinaryPublicId: true,
          },
        },
      },
    });

    if (!photo) {
      return { ok: false, error: "照片不存在" };
    }

    if (photo.cloudinaryPublicId) {
      await deleteRemoteAsset(photo.cloudinaryPublicId);
    }

    await prisma.$transaction(async (tx) => {
      await tx.photo.delete({
        where: { id },
      });

      await tx.photo.updateMany({
        where: {
          albumId: photo.albumId,
          sortOrder: {
            gt: photo.sortOrder,
          },
        },
        data: {
          sortOrder: {
            decrement: 1,
          },
        },
      });

      const coverMatchesPhoto =
        photo.album.cover === photo.url ||
        (photo.album.coverCloudinaryPublicId &&
          photo.cloudinaryPublicId &&
          photo.album.coverCloudinaryPublicId === photo.cloudinaryPublicId);

      if (!coverMatchesPhoto) {
        return;
      }

      const fallbackPhoto = await tx.photo.findFirst({
        where: {
          albumId: photo.albumId,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        select: {
          url: true,
          cloudinaryPublicId: true,
        },
      });

      await tx.album.update({
        where: { id: photo.albumId },
        data: {
          cover: fallbackPhoto?.url ?? null,
          coverCloudinaryPublicId: fallbackPhoto?.cloudinaryPublicId ?? null,
        },
      });
    });

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("deletePhoto failed", error);
    return { ok: false, error: getActionErrorMessage(error, "删除照片失败") };
  }
}

export async function reorderAlbumPhotos(albumId, orderedPhotoIds) {
  try {
    await requireAdmin();

    if (!albumId || albumId === "all") {
      return { ok: false, error: "全部相册不支持排序" };
    }

    if (!Array.isArray(orderedPhotoIds) || orderedPhotoIds.length === 0) {
      return { ok: false, error: "缺少排序数据" };
    }

    const prisma = await getPrisma();
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      select: { id: true },
    });

    if (!album) {
      return { ok: false, error: "相册不存在" };
    }

    const existingPhotos = await prisma.photo.findMany({
      where: { albumId },
      select: { id: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    const existingIds = existingPhotos.map((photo) => photo.id);

    if (
      existingIds.length !== orderedPhotoIds.length ||
      existingIds.some((id) => !orderedPhotoIds.includes(id))
    ) {
      return { ok: false, error: "排序数据已过期，请刷新后重试" };
    }

    await prisma.$transaction(
      orderedPhotoIds.map((photoId, index) =>
        prisma.photo.update({
          where: { id: photoId },
          data: { sortOrder: index },
        })
      )
    );

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("reorderAlbumPhotos failed", error);
    return { ok: false, error: getActionErrorMessage(error, "保存排序失败") };
  }
}
