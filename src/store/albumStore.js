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
        const newAlbum = await dbCreateAlbum(title)
        set((state) => ({ albums: [newAlbum, ...state.albums] }))
        return newAlbum.id
      },

      deleteAlbum: async (id) => {
        await dbDeleteAlbum(id)
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
        
        const photoPromises = files.map(async (file) => {
          return new Promise((resolve, reject) => {
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
                const newPhoto = await dbAddPhoto(photoData)
                resolve(newPhoto)
              } catch (error) {
                reject(error)
              }
            }
            reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
            reader.readAsDataURL(file)
          })
        })

        const newPhotos = await Promise.all(photoPromises)
        set((state) => ({ photos: [...state.photos, ...newPhotos] }))
      },

      deletePhoto: async (id) => {
        await dbDeletePhoto(id)
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
