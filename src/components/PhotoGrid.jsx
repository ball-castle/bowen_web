import React, { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import useAlbumStore from '@/store/albumStore'
import useAuthStore from '@/store/authStore'
import Lightbox from './Lightbox'
import { SortablePhoto } from './SortablePhoto'
import { cn } from '@/lib/utils'

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function PhotoGrid() {
  const { activeAlbumId, getAlbumPhotos, deletePhoto, layout, reorderPhotos } = useAlbumStore()
  const photos = getAlbumPhotos(activeAlbumId)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const { isLoggedIn } = useAuthStore()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  const handleDragEnd = (event) => {
    setActiveId(null)
    const { active, over } = event
    if (active.id !== over?.id) {
      reorderPhotos(active.id, over.id)
    }
  }

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  return (
    <>
      <p className="text-[hsl(var(--muted-foreground))] text-sm mb-4">{photos.length} 张照片</p>
      
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={layout === 'grid'
          ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
          : "columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 space-y-3"
        }>
          <SortableContext 
            items={photos.map(p => p.id)}
            strategy={layout === 'grid' ? rectSortingStrategy : rectSortingStrategy} // Masonry sorting is complex, rect usually works okay
          >
            {photos.map((photo, idx) => (
              <SortablePhoto 
                key={photo.id}
                photo={photo}
                idx={idx}
                layout={layout}
                isLoggedIn={isLoggedIn}
                deletePhoto={deletePhoto}
                setLightboxIndex={setLightboxIndex}
              />
            ))}
          </SortableContext>
        </div>

        <DragOverlay>
          {activeId ? (
            <SortablePhoto
              photo={photos.find(p => p.id === activeId)}
              idx={photos.findIndex(p => p.id === activeId)}
              layout={layout}
              isLoggedIn={isLoggedIn}
              deletePhoto={deletePhoto}
              setLightboxIndex={setLightboxIndex}
              isOverlay={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

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
