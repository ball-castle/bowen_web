import React, { useState } from 'react'
import { X, Upload, LogIn, LogOut } from 'lucide-react'
import PhotoGrid from '@/components/PhotoGrid'
import UploadZone from '@/components/UploadZone'
import LoginModal from '@/components/LoginModal'
import useAlbumStore from '@/store/albumStore'
import useAuthStore from '@/store/authStore'
import { cn } from '@/lib/utils'

export default function App() {
  const [showUpload, setShowUpload] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const { albums, activeAlbumId, setActiveAlbum } = useAlbumStore()
  const activeAlbum = albums.find((a) => a.id === activeAlbumId)
  const { isLoggedIn, logout } = useAuthStore()

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/0.8)] backdrop-blur-sm flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-semibold text-[hsl(var(--foreground))] text-base leading-tight truncate">
              {activeAlbum?.name || '全部照片'}
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] text-xs">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <select
              value={activeAlbumId}
              onChange={(e) => setActiveAlbum(e.target.value)}
              className="max-w-36 sm:max-w-48 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            >
              {albums.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.name}
                </option>
              ))}
            </select>
            {isLoggedIn ? (
              <>
                <button
                  onClick={() => setShowUpload(!showUpload)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    showUpload
                      ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
                      : 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/0.25)] hover:opacity-90'
                  )}
                >
                  {showUpload ? <X className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                  <span className="hidden sm:inline">{showUpload ? '收起' : '上传照片'}</span>
                </button>
                <button
                  onClick={() => {
                    logout()
                    setShowUpload(false)
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-red-500/10 text-red-500 hover:bg-red-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">退出管理</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary)/0.8)]"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">管理员登录</span>
              </button>
            )}
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 max-w-screen-2xl mx-auto">
            {/* Upload zone */}
            {isLoggedIn && showUpload && (
              <div className="mb-6 animate-slideUp">
                <UploadZone />
              </div>
            )}

            {/* Photo grid */}
            <div className="animate-fadeIn">
              <PhotoGrid />
            </div>
          </div>
        </div>
      </main>

      <LoginModal isOpen={showLogin} onOpenChange={setShowLogin} />
    </div>
  )
}
