"use client";
import React, { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";

import { getActionErrorMessage } from "@/lib/action-errors";
import { cn } from "@/lib/utils";
import useAlbumStore from "@/store/albumStore";

export default function UploadZone({ className }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")
  const [selectedAlbumId, setSelectedAlbumId] = useState("")
  const fileInputRef = useRef(null)
  const { activeAlbumId, albums, addPhotos } = useAlbumStore()
  const needsAlbumSelection = activeAlbumId === 'all'
  const targetAlbumId = needsAlbumSelection ? selectedAlbumId : activeAlbumId

  useEffect(() => {
    setSelectedAlbumId(activeAlbumId === 'all' ? "" : activeAlbumId)
    setError("")
  }, [activeAlbumId])

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
    if (isUploading) return
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return
    if (!targetAlbumId) {
      setError(albums.length === 0 ? "请先创建一个相册再上传照片" : "请先选择上传到哪个相册")
      return
    }

    setError("")
    setIsUploading(true)

    try {
      const compressedFiles = await Promise.all(imageFiles.map(compressImage))
      await addPhotos(compressedFiles, targetAlbumId)
    } catch (uploadError) {
      setError(getActionErrorMessage(uploadError, "上传失败"))
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
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
        disabled={isUploading || !targetAlbumId}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {needsAlbumSelection && (
        <div
          className="w-full max-w-sm rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.85)] p-4 text-left"
          onClick={(event) => event.stopPropagation()}
        >
          <label className="mb-2 block text-sm font-medium text-[hsl(var(--foreground))]">上传目标相册</label>
          <select
            value={selectedAlbumId}
            onChange={(event) => {
              setSelectedAlbumId(event.target.value)
              setError("")
            }}
            className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          >
            <option value="">请选择一个具体相册</option>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.title}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
            全部相册视图只用于聚合浏览。上传前需要先指定一个目标相册。
          </p>
        </div>
      )}
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
          {isUploading ? "正在上传照片..." : "点击或拖拽上传照片"}
        </p>
        <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">
          {isUploading
            ? "请稍候，图片正在处理并上传"
            : needsAlbumSelection
              ? "先选择目标相册，再上传 JPG、PNG、GIF、WebP 等图片"
              : "支持 JPG、PNG、GIF、WebP 等格式，可批量上传"}
        </p>
        {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}
      </div>
    </div>
  )
}
