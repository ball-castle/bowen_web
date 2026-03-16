import "dotenv/config";

import {
  countPendingCloudinaryDeletes,
  processCloudinaryDeletionQueue,
} from "../src/lib/cloudinary-cleanup.js";

async function main() {
  const pendingCount = await countPendingCloudinaryDeletes();
  console.log(`Pending Cloudinary deletions: ${pendingCount}`);

  if (pendingCount === 0) {
    return;
  }

  const result = await processCloudinaryDeletionQueue();

  console.log(`Succeeded: ${result.succeeded.length}`);
  console.log(`Failed: ${result.failed.length}`);

  if (result.failed.length > 0) {
    result.failed.forEach((failure) => {
      console.log(`- ${failure.publicId}: ${failure.error}`);
    });
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Retrying Cloudinary deletions failed:", error);
  process.exit(1);
});
