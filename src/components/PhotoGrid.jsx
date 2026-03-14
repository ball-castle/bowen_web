import React, { useState } from 'react'
import { Trash2, ZoomIn } from 'lucide-react'
import useAlbumStore from '@/store/albumStore'
import useAuthStore from '@/store/authStore'
import Lightbox from './Lightbox'
import { cn } from '@/lib/utils'

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function PhotoGrid() {
  const { activeAlbumId, getAlbumPhotos, deletePhoto, layout } = useAlbumStore()
  const photos = getAlbumPhotos(activeAlbumId)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const { isLoggedIn } = useAuthStore()

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[hsl(var(--secondary))] flex items-center justify-center">
          <span className="text-4xl">🖼️</span>
        </div>
        <p className="text-[hsl(var(--foreground))] font-medium text-lg">还没有照片</p>
        <p className="text-[hsl(var(--muted-foreground))] text-sm">上传你的第一张照片开始建立相册</p>
      </div>
    )
  }

  return (
    <>
      <p className="text-[hsl(var(--muted-foreground))] text-sm mb-4">{photos.length} 张照片</p>
      <div className={layout === 'grid'
        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
        : "columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 space-y-3"
      }>
        {photos.map((photo, idx) => (
          <div
            key={photo.id}
            className={cn(
              "photo-card relative group rounded-xl overflow-hidden bg-[hsl(var(--secondary))] cursor-pointer break-inside-avoid",
              layout === 'grid' ? "aspect-square" : "mb-3 inline-block w-full"
            )}
            style={{ animationDelay: `${idx * 30}ms` }}
          >
            <img
              src={photo.url}
              alt={photo.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onClick={() => setLightboxIndex(idx)}
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
              <div className="flex justify-end">
                {isLoggedIn && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePhoto(photo.id) }}
                    className="w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all duration-150"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-end justify-between">
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium truncate">{photo.name}</p>
                  <p className="text-white/60 text-[10px]">{formatSize(photo.size)}</p>
                </div>
                <button
                  onClick={() => setLightboxIndex(idx)}
                  className="w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all duration-150 flex-shrink-0 ml-1"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
