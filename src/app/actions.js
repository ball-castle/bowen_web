"use server";

import { revalidatePath } from "next/cache";

import {
  clearAdminSession,
  requireAdmin,
  setAdminSession,
  validateAdminCredentials,
} from "@/lib/admin-session";
import { SYSTEM_ALBUM_ID } from "@/lib/album-constants";
import { getActionErrorMessage } from "@/lib/action-errors";
import { ensureUncategorizedAlbum, isSystemAlbumId } from "@/lib/albums";
import {
  buildQueueCloudinaryDeleteQueries,
  getCloudinaryCleanupWarning,
  processCloudinaryDeletionQueue,
} from "@/lib/cloudinary-cleanup";
import { createRecordId, getSql } from "@/lib/runtime-db";

async function findAlbum(sql, id) {
  const rows = await sql`
    SELECT
      "id",
      "title",
      "description",
      "cover",
      "coverCloudinaryPublicId",
      "createdAt",
      "updatedAt"
    FROM "Album"
    WHERE "id" = ${id}
  `;

  return rows[0] ?? null;
}

async function findPhotoDeleteSnapshots(sql, ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  return sql`
    SELECT
      photo."id",
      photo."url",
      photo."albumId",
      photo."sortOrder",
      photo."cloudinaryPublicId",
      album."cover",
      album."coverCloudinaryPublicId"
    FROM "Photo" AS photo
    INNER JOIN "Album" AS album
      ON album."id" = photo."albumId"
    WHERE photo."id" = ANY(${ids})
  `;
}

function doesAlbumCoverMatchPhoto(photo) {
  return (
    photo.cover === photo.url ||
    (photo.coverCloudinaryPublicId &&
      photo.cloudinaryPublicId &&
      photo.coverCloudinaryPublicId === photo.cloudinaryPublicId)
  );
}

async function deletePhotosByIds(ids) {
  const normalizedIds = [...new Set((ids ?? []).map((id) => id?.trim()).filter(Boolean))];

  if (normalizedIds.length === 0) {
    return { ok: false, error: "请选择要删除的照片" };
  }

  const sql = getSql();
  const photos = await findPhotoDeleteSnapshots(sql, normalizedIds);

  if (photos.length === 0) {
    return { ok: false, error: "照片不存在" };
  }

  if (photos.length !== normalizedIds.length) {
    return {
      ok: false,
      error: normalizedIds.length === 1 ? "照片不存在" : "部分照片已不存在，请刷新后重试",
    };
  }

  const affectedAlbumIds = [...new Set(photos.map((photo) => photo.albumId))];
  const coverAlbumIds = [
    ...new Set(photos.filter(doesAlbumCoverMatchPhoto).map((photo) => photo.albumId)),
  ];
  const publicIds = [...new Set(photos.map((photo) => photo.cloudinaryPublicId).filter(Boolean))];

  await sql.transaction((tx) => [
    ...buildQueueCloudinaryDeleteQueries(tx, publicIds),
    tx`
      DELETE FROM "Photo"
      WHERE "id" = ANY(${normalizedIds})
    `,
    ...affectedAlbumIds.map((albumId) => tx`
      WITH ranked_photos AS (
        SELECT
          "id",
          ROW_NUMBER() OVER (
            ORDER BY "sortOrder" ASC, "createdAt" DESC
          ) - 1 AS next_sort_order
        FROM "Photo"
        WHERE "albumId" = ${albumId}
      )
      UPDATE "Photo" AS photo
      SET "sortOrder" = ranked_photos.next_sort_order
      FROM ranked_photos
      WHERE photo."id" = ranked_photos."id"
    `),
    ...coverAlbumIds.map((albumId) => tx`
      WITH fallback_photo AS (
        SELECT "url", "cloudinaryPublicId"
        FROM "Photo"
        WHERE "albumId" = ${albumId}
        ORDER BY "sortOrder" ASC, "createdAt" DESC
        LIMIT 1
      )
      UPDATE "Album"
      SET
        "cover" = (SELECT "url" FROM fallback_photo),
        "coverCloudinaryPublicId" = (
          SELECT "cloudinaryPublicId"
          FROM fallback_photo
        ),
        "updatedAt" = NOW()
      WHERE "id" = ${albumId}
    `),
  ]);

  const cleanupResult =
    publicIds.length > 0
      ? await processCloudinaryDeletionQueue(publicIds)
      : { failed: [], succeeded: [] };

  revalidatePath("/");
  return {
    ok: true,
    deletedIds: normalizedIds,
    warning: getCloudinaryCleanupWarning(cleanupResult.failed),
  };
}

export async function getAlbums() {
  const sql = getSql();

  return sql`
    SELECT
      "id",
      "title",
      "description",
      "cover",
      "coverCloudinaryPublicId",
      "createdAt",
      "updatedAt"
    FROM "Album"
    ORDER BY "createdAt" DESC
  `;
}

export async function getPhotos(albumId) {
  const sql = getSql();

  if (albumId === "all") {
    return sql`
      SELECT
        "id",
        "url",
        "cloudinaryPublicId",
        "title",
        "size",
        "type",
        "sortOrder",
        "createdAt",
        "albumId"
      FROM "Photo"
      ORDER BY "createdAt" DESC
    `;
  }

  return sql`
    SELECT
      "id",
      "url",
      "cloudinaryPublicId",
      "title",
      "size",
      "type",
      "sortOrder",
      "createdAt",
      "albumId"
    FROM "Photo"
    WHERE "albumId" = ${albumId}
    ORDER BY "sortOrder" ASC, "createdAt" DESC
  `;
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

    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      return { ok: false, error: "请输入相册名称" };
    }

    const sql = getSql();
    const [album] = await sql`
      INSERT INTO "Album" (
        "id",
        "title",
        "createdAt",
        "updatedAt"
      )
      VALUES (${createRecordId()}, ${normalizedTitle}, NOW(), NOW())
      RETURNING
        "id",
        "title",
        "description",
        "cover",
        "coverCloudinaryPublicId",
        "createdAt",
        "updatedAt"
    `;

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

    const sql = getSql();
    const album = await findAlbum(sql, id);

    if (!album) {
      return { ok: false, error: "相册不存在" };
    }

    const albumPhotos = await sql`
      SELECT "cloudinaryPublicId"
      FROM "Photo"
      WHERE "albumId" = ${id}
        AND "cloudinaryPublicId" IS NOT NULL
    `;
    const publicIds = [
      album.coverCloudinaryPublicId,
      ...albumPhotos.map((photo) => photo.cloudinaryPublicId),
    ].filter(Boolean);

    await sql.transaction((tx) => [
      ...buildQueueCloudinaryDeleteQueries(tx, publicIds),
      tx`
        DELETE FROM "Album"
        WHERE "id" = ${id}
      `,
    ]);

    const cleanupResult =
      publicIds.length > 0
        ? await processCloudinaryDeletionQueue(publicIds)
        : { failed: [], succeeded: [] };

    revalidatePath("/");
    return { ok: true, warning: getCloudinaryCleanupWarning(cleanupResult.failed) };
  } catch (error) {
    console.error("deleteAlbum failed", error);
    return { ok: false, error: getActionErrorMessage(error, "删除相册失败") };
  }
}

export async function addPhoto(data) {
  try {
    await requireAdmin();

    const normalizedTitle = data.title?.trim() || null;
    const targetAlbumId = data.albumId?.trim();

    if (!targetAlbumId || targetAlbumId === "all") {
      return { ok: false, error: "请选择上传到哪个相册" };
    }

    const sql = getSql();

    if (targetAlbumId === SYSTEM_ALBUM_ID) {
      await ensureUncategorizedAlbum(sql);
    } else {
      const album = await findAlbum(sql, targetAlbumId);

      if (!album) {
        return { ok: false, error: "目标相册不存在" };
      }
    }

    const [photo] = await sql`
      WITH target_album AS (
        SELECT "id", "cover"
        FROM "Album"
        WHERE "id" = ${targetAlbumId}
      ),
      next_sort AS (
        SELECT COALESCE(MAX("sortOrder"), -1) + 1 AS "nextSortOrder"
        FROM "Photo"
        WHERE "albumId" = ${targetAlbumId}
      ),
      inserted_photo AS (
        INSERT INTO "Photo" (
          "id",
          "url",
          "cloudinaryPublicId",
          "title",
          "size",
          "type",
          "sortOrder",
          "albumId"
        )
        SELECT
          ${createRecordId()},
          ${data.url},
          ${data.publicId ?? null},
          ${normalizedTitle},
          ${data.size ?? null},
          ${data.type ?? null},
          next_sort."nextSortOrder",
          target_album."id"
        FROM target_album, next_sort
        RETURNING
          "id",
          "url",
          "cloudinaryPublicId",
          "title",
          "size",
          "type",
          "sortOrder",
          "createdAt",
          "albumId"
      ),
      updated_album AS (
        UPDATE "Album"
        SET
          "cover" = CASE
            WHEN "cover" IS NULL THEN (SELECT "url" FROM inserted_photo)
            ELSE "cover"
          END,
          "coverCloudinaryPublicId" = CASE
            WHEN "cover" IS NULL THEN (SELECT "cloudinaryPublicId" FROM inserted_photo)
            ELSE "coverCloudinaryPublicId"
          END,
          "updatedAt" = CASE
            WHEN "cover" IS NULL THEN NOW()
            ELSE "updatedAt"
          END
        WHERE "id" = ${targetAlbumId}
      )
      SELECT * FROM inserted_photo
    `;

    if (!photo) {
      return { ok: false, error: "目标相册不存在" };
    }

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
    return deletePhotosByIds([id]);
  } catch (error) {
    console.error("deletePhoto failed", error);
    return { ok: false, error: getActionErrorMessage(error, "删除照片失败") };
  }
}

export async function deletePhotos(ids) {
  try {
    await requireAdmin();
    return deletePhotosByIds(ids);
  } catch (error) {
    console.error("deletePhotos failed", error);
    return { ok: false, error: getActionErrorMessage(error, "批量删除照片失败") };
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

    const sql = getSql();
    const album = await findAlbum(sql, albumId);

    if (!album) {
      return { ok: false, error: "相册不存在" };
    }

    const existingPhotos = await sql`
      SELECT "id"
      FROM "Photo"
      WHERE "albumId" = ${albumId}
      ORDER BY "sortOrder" ASC, "createdAt" DESC
    `;
    const existingIds = existingPhotos.map((photo) => photo.id);

    if (
      existingIds.length !== orderedPhotoIds.length ||
      existingIds.some((photoId) => !orderedPhotoIds.includes(photoId))
    ) {
      return { ok: false, error: "排序数据已过期，请刷新后重试" };
    }

    await sql.transaction((tx) =>
      orderedPhotoIds.map((photoId, index) => tx`
        UPDATE "Photo"
        SET "sortOrder" = ${index}
        WHERE "id" = ${photoId}
      `)
    );

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("reorderAlbumPhotos failed", error);
    return { ok: false, error: getActionErrorMessage(error, "保存排序失败") };
  }
}
