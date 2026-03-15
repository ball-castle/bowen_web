
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('错误: 未找到 DATABASE_URL 环境变量');
    return;
  }

  console.log('正在连接 Neon 数据库...');
  const sql = neon(url);

  try {
    const albums = await sql`SELECT count(*) FROM "Album"`;
    const photos = await sql`SELECT count(*) FROM "Photo"`;
    
    console.log('数据库统计:');
    console.log(`- Album 表记录数: ${albums[0].count}`);
    console.log(`- Photo 表记录数: ${photos[0].count}`);

    if (parseInt(photos[0].count) > 0) {
      const samplePhotos = await sql`SELECT id, title, length(url) as size FROM "Photo" LIMIT 5`;
      console.log('\n最近 5 张照片详情:');
      samplePhotos.forEach(p => {
        console.log(`- [${p.id}] ${p.title || '无标题'}: ${(p.size / 1024).toFixed(2)} KB (Base64长度)`);
      });
    }
  } catch (error) {
    console.error('查询数据库时出错:', error);
  }
}

main();
