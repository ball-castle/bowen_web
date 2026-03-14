"use client";
import React, { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react'
import useAlbumStore from '@/store/albumStore'

export default function Lightbox({ photos, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const { deletePhoto } = useAlbumStore()
  const photo = photos[currentIndex]

  const prev = useCallback(() => setCurrentIndex((i) => (i - 1 + photos.length) % photos.length), [photos.length])
  const next = useCallback(() => setCurrentIndex((i) => (i + 1) % photos.length), [photos.length])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next])

  const handleDelete = () => {
    deletePhoto(photo.id)
    if (photos.length === 1) {
      onClose()
    } else {
      setCurrentIndex((i) => Math.min(i, photos.length - 2))
    }
  }

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = photo.url
    a.download = photo.name
    a.click()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/50 to-transparent z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-white font-medium text-sm">{photo.name}</p>
          <p className="text-white/50 text-xs">{currentIndex + 1} / {photos.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-red-500 flex items-center justify-center text-white transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="relative flex items-center justify-center w-full h-full px-16">
        <img
          src={photo.url}
          alt={photo.name}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Prev / Next */}
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-all z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-all z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 backdrop-blur-sm rounded-xl p-2 overflow-x-auto max-w-[90vw]"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-12 h-9 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                i === currentIndex ? 'ring-2 ring-[hsl(var(--primary))] scale-110' : 'opacity-50 hover:opacity-75'
              }`}
            >
              <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
