import 'dotenv/config';
import { getPrisma } from './src/lib/prisma.js';

async function main() {
  const prisma = await getPrisma();
  const count = await prisma.photo.count();
  console.log('Total photos:', count);
  const photos = await prisma.photo.findMany({
    select: { id: true, url: true, cloudinaryPublicId: true, sortOrder: true },
    take: 2,
    orderBy: { createdAt: 'desc' },
  });
  console.log(
    photos.map((photo) => ({
      id: photo.id,
      urlStart: photo.url.substring(0, 50),
      isBase64: photo.url.startsWith('data:'),
      hasCloudinaryId: Boolean(photo.cloudinaryPublicId),
      sortOrder: photo.sortOrder,
    }))
  );
}
main()
  .catch(console.error)
  .finally(async () => {
    const prisma = await getPrisma();
    await prisma.$disconnect();
  });
