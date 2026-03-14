import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2, ZoomIn, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function SortablePhoto({ photo, idx, layout, isLoggedIn, deletePhoto, setLightboxIndex, isOverlay }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms cubic-bezier(0.25, 1, 0.5, 1)',
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "photo-card relative group rounded-xl overflow-hidden bg-[hsl(var(--secondary))] break-inside-avoid",
        layout === 'grid' ? "aspect-square" : "mb-3 inline-block w-full",
        isOverlay ? "shadow-2xl scale-105" : "",
        isDragging ? "shadow-xl ring-2 ring-[hsl(var(--primary))]" : ""
      )}
    >
      <img
        src={photo.url}
        alt={photo.name}
        className={cn(
          "w-full h-full object-cover transition-transform duration-300",
          !isDragging && !isOverlay && "group-hover:scale-105"
        )}
        onClick={() => setLightboxIndex(idx)}
      />
      
      {/* Overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-200 flex flex-col justify-between p-2 cursor-pointer",
        !isDragging && "group-hover:opacity-100",
        isOverlay && "opacity-100"
      )}
      onClick={() => setLightboxIndex(idx)}>
        
        <div className="flex justify-between items-start">
          {/* Drag Handle */}
          {isLoggedIn ? (
            <div 
              {...attributes} 
              {...listeners}
              className="w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all duration-150 cursor-grab active:cursor-grabbing"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </div>
          ) : <div></div>}

          {/* Delete Button */}
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
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx) }}
            className="w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all duration-150 flex-shrink-0 ml-1"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
