
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('正在连接数据库...')
    const albumCount = await prisma.album.count()
    const photoCount = await prisma.photo.count()
    
    console.log(`统计结果:`)
    console.log(`- 相册总数: ${albumCount}`)
    console.log(`- 照片总数: ${photoCount}`)
    
    if (photoCount > 0) {
      const photos = await prisma.photo.findMany({
        take: 5,
        select: {
          id: true,
          title: true,
          url: true // We want to check the size
        }
      })
      
      console.log('\n最近 5 张照片大小分析:')
      photos.forEach(p => {
        const sizeKB = Math.round(p.url.length / 1024)
        console.log(`- [${p.id}] ${p.title || '无标题'}: ${sizeKB} KB`)
      })
    }
  } catch (e) {
    console.error('数据库诊断失败:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
