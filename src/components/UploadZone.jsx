"use client";
import React, { useState, useRef } from 'react'
import { Upload, FolderPlus, ImagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import useAlbumStore from '@/store/albumStore'

export default function UploadZone({ className }) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  const { activeAlbumId, addPhotos } = useAlbumStore()

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 1920
          const MAX_HEIGHT = 1080
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          }, 'image/jpeg', 0.8)
        }
        img.onerror = () => resolve(file)
        img.src = e.target.result
      }
      reader.onerror = () => resolve(file)
      reader.readAsDataURL(file)
    })
  }

  const handleFiles = async (files) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return
    const compressedFiles = await Promise.all(imageFiles.map(compressImage))
    await addPhotos(compressedFiles, activeAlbumId)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  return (
    <div
      className={cn(
        'relative group flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed transition-all duration-300 p-10 cursor-pointer select-none',
        isDragging
          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] scale-[1.01]'
          : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)] hover:bg-[hsl(var(--secondary)/0.5)]',
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className={cn(
        'w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300',
        isDragging
          ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
          : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] group-hover:bg-[hsl(var(--primary)/0.15)] group-hover:text-[hsl(var(--primary))]'
      )}>
        <Upload className="w-7 h-7" />
      </div>
      <div className="text-center">
        <p className="text-[hsl(var(--foreground))] font-semibold text-base">
          点击或拖拽上传照片
        </p>
        <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">
          支持 JPG、PNG、GIF、WebP 等格式，可批量上传
        </p>
      </div>
    </div>
  )
}
