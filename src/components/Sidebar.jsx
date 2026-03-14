import React, { useState } from 'react'
import { Images, FolderOpen, Plus, Trash2, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import useAlbumStore from '@/store/albumStore'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function Sidebar({ className }) {
  const { albums, activeAlbumId, setActiveAlbum, addAlbum, deleteAlbum, photos } = useAlbumStore()
  const [newAlbumName, setNewAlbumName] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleCreate = () => {
    const name = newAlbumName.trim()
    if (!name) return
    const id = addAlbum(name)
    setActiveAlbum(id)
    setNewAlbumName('')
    setDialogOpen(false)
  }

  const getPhotoCount = (albumId) => {
    if (albumId === 'all') return photos.length
    return photos.filter((p) => p.albumId === albumId).length
  }

  return (
    <>
      <aside className={cn('flex flex-col bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] h-full', className)}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-[hsl(var(--foreground))] text-base leading-tight gradient-text">我的相册</h1>
              <p className="text-[hsl(var(--muted-foreground))] text-xs">Personal Album</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <p className="px-2 py-1 text-[hsl(var(--muted-foreground))] text-xs font-semibold uppercase tracking-wider mb-2">相册</p>
          {albums.map((album) => (
            <div
              key={album.id}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150',
                activeAlbumId === album.id
                  ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]'
                  : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]'
              )}
              onClick={() => setActiveAlbum(album.id)}
            >
              {album.cover ? (
                <img src={album.cover} alt={album.name} className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
              ) : (
                <div className={cn(
                  'w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center',
                  activeAlbumId === album.id ? 'bg-[hsl(var(--primary)/0.2)]' : 'bg-[hsl(var(--secondary))]'
                )}>
                  {album.id === 'all' ? (
                    <Images className="w-3.5 h-3.5" />
                  ) : (
                    <FolderOpen className="w-3.5 h-3.5" />
                  )}
                </div>
              )}
              <span className="flex-1 text-sm font-medium truncate">{album.name}</span>
              <span className={cn(
                'text-xs font-medium px-1.5 py-0.5 rounded-md',
                activeAlbumId === album.id
                  ? 'bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))]'
                  : 'text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))]'
              )}>
                {getPhotoCount(album.id)}
              </span>
              {album.id !== 'all' && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteAlbum(album.id) }}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </nav>

        {/* Create album button */}
        <div className="px-3 py-3 border-t border-[hsl(var(--border))]">
          <button
            onClick={() => setDialogOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-all group"
          >
            <div className="w-7 h-7 rounded-md bg-[hsl(var(--secondary))] group-hover:bg-[hsl(var(--primary)/0.15)] group-hover:text-[hsl(var(--primary))] flex items-center justify-center transition-all">
              <Plus className="w-3.5 h-3.5" />
            </div>
            新建相册
          </button>
        </div>
      </aside>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>新建相册</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            value={newAlbumName}
            onChange={(e) => setNewAlbumName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="输入相册名称..."
            className="w-full px-3 py-2.5 rounded-lg bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            autoFocus
          />
          <DialogFooter className="flex gap-2 flex-row justify-end">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button size="sm" onClick={handleCreate} disabled={!newAlbumName.trim()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
