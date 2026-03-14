const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function main() {
  const dataPath = path.join(__dirname, 'legacy-vite/src/data/initialData.json')
  if (!fs.existsSync(dataPath)) {
    console.error('Initial data not found at:', dataPath)
    return
  }

  const initialData = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

  console.log('Seeding albums...')
  for (const album of initialData.albums) {
    if (album.id === 'all') continue
    
    await prisma.album.upsert({
      where: { id: album.id },
      update: {},
      create: {
        id: album.id,
        title: album.name,
        cover: album.cover,
        createdAt: new Date(album.createdAt || Date.now()),
      },
    })
  }

  console.log('Seeding photos...')
  for (const photo of initialData.photos) {
    await prisma.photo.upsert({
      where: { id: photo.id },
      update: {},
      create: {
        id: photo.id,
        url: photo.url,
        title: photo.name,
        size: photo.size,
        type: photo.type,
        createdAt: new Date(photo.uploadedAt || Date.now()),
        albumId: photo.albumId === 'uncategorized' ? (await prisma.album.findFirst({ where: { title: '未分类' } }))?.id || (await prisma.album.create({ data: { title: '未分类' } })).id : photo.albumId,
      },
    })
  }

  console.log('Seeding completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
