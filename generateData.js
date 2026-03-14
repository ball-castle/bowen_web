import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = __dirname;
const bowenSrc = path.join(baseDir, '博文的照片');
const avatarsSrc = path.join(baseDir, 'public', 'avatars_gallery');
const photosDest = path.join(baseDir, 'public', 'photos');

// ensure dest dirs
if (!fs.existsSync(photosDest)) fs.mkdirSync(photosDest, { recursive: true });
const bowenDestDir = path.join(photosDest, 'bowen');
if (!fs.existsSync(bowenDestDir)) fs.mkdirSync(bowenDestDir, { recursive: true });
const avatarsDestDir = path.join(photosDest, 'avatars');
if (!fs.existsSync(avatarsDestDir)) fs.mkdirSync(avatarsDestDir, { recursive: true });

function copyFiles(src, dest, prefix) {
  if (!fs.existsSync(src)) return [];
  const files = fs.readdirSync(src).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  const photos = [];
  let t = Date.now();
  files.forEach(f => {
    fs.copyFileSync(path.join(src, f), path.join(dest, f));
    photos.push({
      id: crypto.randomUUID(),
      name: f,
      url: `/photos/${prefix}/${f}`,
      size: fs.statSync(path.join(src, f)).size,
      type: f.endsWith('.png') ? 'image/png' : 'image/jpeg',
      uploadedAt: t++,
    });
  });
  return photos;
}

const bowenPhotos = copyFiles(bowenSrc, bowenDestDir, 'bowen');
const avatarPhotos = copyFiles(avatarsSrc, avatarsDestDir, 'avatars');

const albums = [
  { id: 'all', name: '全部照片', cover: null, createdAt: Date.now() },
  { id: 'album-bowen', name: '博文的照片', cover: bowenPhotos[0]?.url || null, createdAt: Date.now() + 1 },
  { id: 'album-avatars', name: '动漫形象库', cover: avatarPhotos[0]?.url || null, createdAt: Date.now() + 2 }
];

const allPhotos = [
  ...bowenPhotos.map(p => ({ ...p, albumId: 'album-bowen' })),
  ...avatarPhotos.map(p => ({ ...p, albumId: 'album-avatars' }))
];

const dataPath = path.join(baseDir, 'src', 'data');
if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);

// Instead of rewriting app, we can just write an initial state JSON, 
// then we will modify albumStore.js to use it if empty
fs.writeFileSync(path.join(dataPath, 'initialData.json'), JSON.stringify({ albums, photos: allPhotos }, null, 2));
console.log('Created initialData.json with ' + allPhotos.length + ' photos');
