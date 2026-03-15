import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.photo.count();
  console.log('Total photos:', count);
  const photos = await prisma.photo.findMany({ select: { id: true, url: true }, take: 2, orderBy: { createdAt: 'desc' } });
  console.log(photos.map(p => ({ 
    id: p.id, 
    urlStart: p.url.substring(0, 50),
    isBase64: p.url.startsWith('data:') 
  })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
