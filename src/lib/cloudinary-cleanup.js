import { destroyCloudinaryImage } from "./cloudinary.js";
import { createRecordId, getSql, uniqueNonEmptyValues } from "./runtime-db.js";

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function isSuccessfulCloudinaryDelete(result) {
  return result === "ok" || result === "not found";
}

export function buildQueueCloudinaryDeleteQueries(sql, publicIds) {
  const uniquePublicIds = uniqueNonEmptyValues(publicIds);

  if (uniquePublicIds.length === 0) {
    return [];
  }

  return uniquePublicIds.map((publicId) => sql`
    INSERT INTO "PendingCloudinaryDeletion" (
      "id",
      "publicId",
      "lastError",
      "createdAt",
      "updatedAt"
    )
    VALUES (${createRecordId()}, ${publicId}, NULL, NOW(), NOW())
    ON CONFLICT ("publicId") DO UPDATE
    SET
      "lastError" = NULL,
      "updatedAt" = NOW()
  `);
}

export async function queueCloudinaryDeletes(sqlOrPublicIds, maybePublicIds) {
  const sql = typeof sqlOrPublicIds === "function" ? sqlOrPublicIds : getSql();
  const publicIds = typeof sqlOrPublicIds === "function" ? maybePublicIds : sqlOrPublicIds;
  const queries = buildQueueCloudinaryDeleteQueries(sql, publicIds);

  if (queries.length === 0) {
    return [];
  }

  await Promise.all(queries);
  return uniqueNonEmptyValues(publicIds);
}

export async function countPendingCloudinaryDeletes(sqlInput) {
  const sql = sqlInput ?? getSql();
  const [result] = await sql`
    SELECT COUNT(*)::int AS "count"
    FROM "PendingCloudinaryDeletion"
  `;

  return result?.count ?? 0;
}

export async function processCloudinaryDeletionQueue(sqlOrPublicIds, maybePublicIds) {
  const sql = typeof sqlOrPublicIds === "function" ? sqlOrPublicIds : getSql();
  const publicIds = typeof sqlOrPublicIds === "function" ? maybePublicIds : sqlOrPublicIds;
  const uniquePublicIds = uniqueNonEmptyValues(publicIds);
  const pendingDeletes =
    uniquePublicIds.length > 0
      ? await sql`
          SELECT "publicId", "createdAt"
          FROM "PendingCloudinaryDeletion"
          WHERE "publicId" = ANY(${uniquePublicIds})
          ORDER BY "createdAt" ASC
        `
      : await sql`
          SELECT "publicId", "createdAt"
          FROM "PendingCloudinaryDeletion"
          ORDER BY "createdAt" ASC
        `;
  const failed = [];
  const succeeded = [];

  for (const pendingDelete of pendingDeletes) {
    try {
      const payload = await destroyCloudinaryImage(pendingDelete.publicId);

      if (!isSuccessfulCloudinaryDelete(payload.result)) {
        throw new Error(`Cloudinary delete failed for ${pendingDelete.publicId}`);
      }

      await sql`
        DELETE FROM "PendingCloudinaryDeletion"
        WHERE "publicId" = ${pendingDelete.publicId}
      `;
      succeeded.push(pendingDelete.publicId);
    } catch (error) {
      const lastError = getErrorMessage(error);

      await sql`
        UPDATE "PendingCloudinaryDeletion"
        SET
          "lastError" = ${lastError},
          "updatedAt" = NOW()
        WHERE "publicId" = ${pendingDelete.publicId}
      `;
      failed.push({
        publicId: pendingDelete.publicId,
        error: lastError,
      });
    }
  }

  return { failed, succeeded };
}

export function getCloudinaryCleanupWarning(failedDeletes) {
  if (!Array.isArray(failedDeletes) || failedDeletes.length === 0) {
    return null;
  }

  return "远端图片清理失败，已加入重试队列";
}
