"use client"
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  getAlbums,
  getPhotos,
  createAlbum as dbCreateAlbum,
  deleteAlbum as dbDeleteAlbum,
  addPhoto as dbAddPhoto,
  deletePhoto as dbDeletePhoto,
  reorderAlbumPhotos as dbReorderAlbumPhotos,
} from '@/app/actions'

function parseCreatedAt(value) {
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function arrayMove(items, oldIndex, newIndex) {
  const nextItems = [...items]
  const [movedItem] = nextItems.splice(oldIndex, 1)
  nextItems.splice(newIndex, 0, movedItem)
  return nextItems
}

const useAlbumStore = create(
  persist(
    (set, get) => ({
      albums: [],
      photos: [],
      activeAlbumId: 'all',
      layout: 'grid',
      isLoading: false,

      // Initial hydration from DB
      hydrate: async () => {
        set({ isLoading: true })
        try {
          const [albums, photos] = await Promise.all([getAlbums(), getPhotos('all')])
          set((state) => ({
            albums,
            photos,
            isLoading: false,
            activeAlbumId:
              state.activeAlbumId === 'all' || albums.some((album) => album.id === state.activeAlbumId)
                ? state.activeAlbumId
                : 'all',
          }))
        } catch (error) {
          console.error("Hydration failed:", error)
          set({ isLoading: false })
        }
      },

      setLayout: (layout) => set({ layout }),
      setActiveAlbum: (id) => set({ activeAlbumId: id }),

      addAlbum: async (title) => {
        const result = await dbCreateAlbum(title)
        if (!result.ok) {
          throw new Error(result.error || '新建相册失败')
        }

        const newAlbum = result.album
        set((state) => ({ albums: [newAlbum, ...state.albums] }))
        return newAlbum.id
      },

      deleteAlbum: async (id) => {
        const result = await dbDeleteAlbum(id)
        if (!result.ok) {
          throw new Error(result.error || '删除相册失败')
        }

        set((state) => ({
          albums: state.albums.filter((a) => a.id !== id),
          photos: state.photos.filter((p) => p.albumId !== id),
          activeAlbumId: state.activeAlbumId === id ? 'all' : state.activeAlbumId,
        }))
      },

      reorderPhotos: (activeId, overId) => {
        const { activeAlbumId, getAlbumPhotos, photos } = get()

        if (!activeAlbumId || activeAlbumId === 'all') {
          return
        }

        const albumPhotos = getAlbumPhotos(activeAlbumId)
        const oldIndex = albumPhotos.findIndex((photo) => photo.id === activeId)
        const newIndex = albumPhotos.findIndex((photo) => photo.id === overId)

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
          return
        }

        const reorderedPhotos = arrayMove(albumPhotos, oldIndex, newIndex)
        const previousSortOrders = new Map(albumPhotos.map((photo) => [photo.id, photo.sortOrder]))
        const nextSortOrders = new Map(reorderedPhotos.map((photo, index) => [photo.id, index]))

        set({
          photos: photos.map((photo) =>
            nextSortOrders.has(photo.id) ? { ...photo, sortOrder: nextSortOrders.get(photo.id) } : photo
          ),
        })

        dbReorderAlbumPhotos(activeAlbumId, reorderedPhotos.map((photo) => photo.id)).then((result) => {
          if (result.ok) {
            return
          }

          set((state) => ({
            photos: state.photos.map((photo) =>
              previousSortOrders.has(photo.id)
                ? { ...photo, sortOrder: previousSortOrders.get(photo.id) }
                : photo
            ),
          }))
          console.error(result.error || '保存排序失败')
        }).catch((error) => {
          set((state) => ({
            photos: state.photos.map((photo) =>
              previousSortOrders.has(photo.id)
                ? { ...photo, sortOrder: previousSortOrders.get(photo.id) }
                : photo
            ),
          }))
          console.error('保存排序失败', error)
        })
      },

      addPhotos: async (files, albumId) => {
        const targetAlbumId = albumId?.trim()

        if (!targetAlbumId || targetAlbumId === 'all') {
          throw new Error('请选择上传到哪个相册')
        }
        
        for (const file of files) {
          try {
            const formData = new FormData()
            formData.append('file', file)
            
            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            })
            
            const uploadData = await uploadRes.json()
            
            if (!uploadRes.ok) {
              throw new Error(uploadData.error || `上传 ${file.name} 到图床失败`)
            }

            const photoData = {
              url: uploadData.url,
              publicId: uploadData.publicId,
              title: file.name,
              size: file.size,
              type: file.type,
              albumId: targetAlbumId,
            }

            const result = await dbAddPhoto(photoData)

            if (!result.ok) {
              throw new Error(result.error || `保存 ${file.name} 失败`)
            }

            const albums = await getAlbums()
            set((state) => ({
              albums,
              photos: [...state.photos, result.photo],
            }))
          } catch (error) {
            console.error("Detailed upload process error:", error)
            throw error // 抛出异常由外部 UploadZone 处理
          }
        }
      },

      deletePhoto: async (id) => {
        const result = await dbDeletePhoto(id)
        if (!result.ok) {
          throw new Error(result.error || '删除照片失败')
        }

        const albums = await getAlbums()
        set((state) => ({
          albums,
          photos: state.photos.filter((p) => p.id !== id),
        }))
      },

      getAlbumPhotos: (albumId) => {
        const { photos } = get()

        if (albumId === 'all') {
          return [...photos].sort((left, right) => parseCreatedAt(right.createdAt) - parseCreatedAt(left.createdAt))
        }

        return photos
          .filter((photo) => photo.albumId === albumId)
          .sort((left, right) => {
            const leftOrder = Number.isInteger(left.sortOrder) ? left.sortOrder : Number.MAX_SAFE_INTEGER
            const rightOrder = Number.isInteger(right.sortOrder) ? right.sortOrder : Number.MAX_SAFE_INTEGER

            if (leftOrder !== rightOrder) {
              return leftOrder - rightOrder
            }

            return parseCreatedAt(right.createdAt) - parseCreatedAt(left.createdAt)
          })
      },
    }),
    {
      name: 'album-ui-storage',
      partialize: (state) => ({ layout: state.layout, activeAlbumId: state.activeAlbumId }),
    }
  )
)

export default useAlbumStore
