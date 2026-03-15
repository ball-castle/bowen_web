"use client"
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getAlbums, getPhotos, createAlbum as dbCreateAlbum, deleteAlbum as dbDeleteAlbum, addPhoto as dbAddPhoto, deletePhoto as dbDeletePhoto } from '@/app/actions'
import { SYSTEM_ALBUM_ID } from '@/lib/album-constants'

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
          const albums = await getAlbums()
          const photos = await getPhotos('all')
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
        // Local reorder for UI responsiveness, ideally sync with DB if order is persisted
        set((state) => {
          const oldIndex = state.photos.findIndex(p => p.id === activeId)
          const newIndex = state.photos.findIndex(p => p.id === overId)
          if (oldIndex !== -1 && newIndex !== -1) {
            const newPhotos = [...state.photos]
            const [movedItem] = newPhotos.splice(oldIndex, 1)
            newPhotos.splice(newIndex, 0, movedItem)
            return { photos: newPhotos }
          }
          return state
        })
      },

      addPhotos: async (files, albumId) => {
        const targetAlbumId = albumId === 'all' ? SYSTEM_ALBUM_ID : albumId
        const uploadedPhotos = []
        
        for (const file of files) {
          const photo = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = async (e) => {
              try {
                const photoData = {
                  url: e.target.result,
                  title: file.name,
                  size: file.size,
                  type: file.type,
                  albumId: targetAlbumId,
                }
                const result = await dbAddPhoto(photoData)
                if (!result.ok) {
                  reject(new Error(result.error || `上传 ${file.name} 失败`))
                  return
                }

                resolve(result.photo)
              } catch (error) {
                reject(error)
              }
            }
            reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
            reader.readAsDataURL(file)
          })
          uploadedPhotos.push(photo)
        }

        set((state) => ({ photos: [...state.photos, ...uploadedPhotos] }))
      },

      deletePhoto: async (id) => {
        const result = await dbDeletePhoto(id)
        if (!result.ok) {
          throw new Error(result.error || '删除照片失败')
        }

        set((state) => ({ photos: state.photos.filter((p) => p.id !== id) }))
      },

      getAlbumPhotos: (albumId) => {
        const { photos } = get()
        if (albumId === 'all') return photos
        return photos.filter((p) => p.albumId === albumId)
      },
    }),
    {
      name: 'album-ui-storage',
      partialize: (state) => ({ layout: state.layout, activeAlbumId: state.activeAlbumId }),
    }
  )
)

export default useAlbumStore
