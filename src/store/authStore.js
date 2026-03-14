import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set) => ({
      isLoggedIn: false,
      login: (username, password) => {
        if (username === 'bowen' && password === 'bowen') {
          set({ isLoggedIn: true })
          return true
        }
        return false
      },
      logout: () => set({ isLoggedIn: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
)

export default useAuthStore
