import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { get, set as setItem, del } from 'idb-keyval'
import initialData from '../data/initialData.json'

const storage = {
  getItem: async (name) => {
    return (await get(name)) || null
  },
  setItem: async (name, value) => {
    await setItem(name, value)
  },
  removeItem: async (name) => {
    await del(name)
  },
}

// We store photos as base64 or paths in localStorage/IndexedDB
// Each photo: { id, albumId, name, url, size, type, uploadedAt }
// Each album: { id, name, cover (url|null), createdAt }

const useAlbumStore = create(
  persist(
    (set, get) => ({
      albums: initialData.albums,
      photos: initialData.photos,
      activeAlbumId: 'all',
      layout: 'grid', // 'grid' | 'masonry' | 'large'

      setLayout: (layout) => set({ layout }),
      setActiveAlbum: (id) => set({ activeAlbumId: id }),

      addAlbum: (name) => {
        const newAlbum = {
          id: crypto.randomUUID(),
          name,
          cover: null,
          createdAt: Date.now(),
        }
        set((state) => ({ albums: [...state.albums, newAlbum] }))
        return newAlbum.id
      },

      deleteAlbum: (id) => {
        set((state) => ({
          albums: state.albums.filter((a) => a.id !== id),
          photos: state.photos.filter((p) => p.albumId !== id),
          activeAlbumId: state.activeAlbumId === id ? 'all' : state.activeAlbumId,
        }))
      },

      addPhotos: (files, albumId) => {
        return Promise.all(
          files.map(
            (file) =>
              new Promise((resolve) => {
                const reader = new FileReader()
                reader.onload = (e) => {
                  const photo = {
                    id: crypto.randomUUID(),
                    albumId: albumId === 'all' ? 'uncategorized' : albumId,
                    name: file.name,
                    url: e.target.result,
                    size: file.size,
                    type: file.type,
                    uploadedAt: Date.now(),
                  }
                  resolve(photo)
                }
                reader.readAsDataURL(file)
              })
          )
        ).then((newPhotos) => {
          set((state) => {
            const updatedPhotos = [...state.photos, ...newPhotos]
            // Update album cover if it doesn't have one
            const updatedAlbums = state.albums.map((album) => {
              const targetId = albumId === 'all' ? 'uncategorized' : albumId
              if (album.id === targetId && !album.cover && newPhotos.length > 0) {
                return { ...album, cover: newPhotos[0].url }
              }
              return album
            })
            return { photos: updatedPhotos, albums: updatedAlbums }
          })
        })
      },

      deletePhoto: (id) => {
        set((state) => ({ photos: state.photos.filter((p) => p.id !== id) }))
      },

      getAlbumPhotos: (albumId) => {
        const { photos } = get()
        if (albumId === 'all') return photos
        return photos.filter((p) => p.albumId === albumId)
      },
    }),
    {
      name: 'album-storage',
      storage,
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0) {
          // Migrate old state by combining with initialData
          const existingPhotos = persistedState.photos || []
          // Check if we need to seed the data (only if the user hasn't already uploaded these paths)
          const mergedPhotos = [...initialData.photos, ...existingPhotos]
          
          let mergedAlbums = [
             ...initialData.albums, 
             ...(persistedState.albums || []).filter(a => a.id !== 'all')
          ]
          
          return {
            ...persistedState,
            albums: mergedAlbums,
            photos: mergedPhotos,
          }
        }
        return persistedState
      }
    }
  )
)

export default useAlbumStore
