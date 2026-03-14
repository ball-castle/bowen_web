import React, { useState } from 'react'
import { X, Upload, LogIn, LogOut, LayoutGrid, Columns } from 'lucide-react'
import PhotoGrid from '@/components/PhotoGrid'
import UploadZone from '@/components/UploadZone'
import LoginModal from '@/components/LoginModal'
import useAlbumStore from '@/store/albumStore'
import useAuthStore from '@/store/authStore'
import { cn } from '@/lib/utils'

export default function App() {
  const [showUpload, setShowUpload] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const { albums, activeAlbumId, setActiveAlbum, layout, setLayout } = useAlbumStore()
  const activeAlbum = albums.find((a) => a.id === activeAlbumId)
  const { isLoggedIn, logout } = useAuthStore()

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/0.8)] backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            {/* Logo and Avatar section */}
            <div className="flex items-center gap-3">
              <img
                src="/logo_chosen.png"
                alt="Vito Logo"
                className="h-14 w-auto object-contain rounded-lg drop-shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setPreviewImage('/logo_chosen.png')}
              />
              <div className="h-10 w-[2px] bg-[hsl(var(--border))] rounded-full hidden sm:block"></div>
              <div
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setPreviewImage('/avatar_chosen.png')}
              >
                <img
                  src="/avatar_chosen.png"
                  alt="Vito Avatar"
                  className="w-12 h-12 rounded-full object-cover border-[3px] border-[hsl(var(--primary)/0.2)] shadow-sm group-hover:border-[hsl(var(--primary)/0.5)] transition-colors"
                />
                <div className="hidden sm:block">
                  <h1 className="font-bold text-base text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors">Vito 的相册</h1>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">博文 • Photography</p>
                </div>
              </div>
            </div>

            <div className="h-8 w-[2px] bg-[hsl(var(--border))] rounded-full hidden md:block ml-2 mr-2"></div>

            <div className="hidden md:block">
              <h2 className="font-semibold text-[hsl(var(--foreground))] text-base leading-tight truncate">
                {activeAlbum?.name || '全部照片'}
              </h2>
              <p className="text-[hsl(var(--muted-foreground))] text-xs">
                {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
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
                  onClick={() => setLayout(layout === 'grid' ? 'columns' : 'grid')}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary)/0.8)] transition-all flex-shrink-0"
                  title="切换布局风格"
                >
                  {layout === 'grid' ? <Columns className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setShowUpload(!showUpload)}
                  className={cn(
                    'flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-medium transition-all flex-shrink-0',
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

      {/* Preview Modal for Logo/Avatar */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out animate-fadeIn"
          onClick={() => setPreviewImage(null)}
        >
          <button className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors">
            <X className="w-8 h-8" />
          </button>
          <img 
            src={previewImage} 
            alt="Preview" 
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl animate-scaleIn cursor-default" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
