-- CreateTable
CREATE TABLE "PendingCloudinaryDeletion" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingCloudinaryDeletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingCloudinaryDeletion_publicId_key" ON "PendingCloudinaryDeletion"("publicId");
