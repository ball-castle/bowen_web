"use client";

import React, { useState } from "react";
import { Camera, FolderOpen, Images, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SYSTEM_ALBUM_ID } from "@/lib/album-constants";
import { getActionErrorMessage } from "@/lib/action-errors";
import { cn } from "@/lib/utils";
import useAlbumStore from "@/store/albumStore";

export default function Sidebar({ className, isLoggedIn }) {
  const { albums, activeAlbumId, setActiveAlbum, addAlbum, deleteAlbum, photos } = useAlbumStore();
  const [newAlbumName, setNewAlbumName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    const name = newAlbumName.trim();

    if (!name) {
      return;
    }

    setCreateError("");
    setIsCreating(true);

    try {
      const id = await addAlbum(name);
      setActiveAlbum(id);
      setNewAlbumName("");
      setDialogOpen(false);
    } catch (error) {
      setCreateError(getActionErrorMessage(error, "新建相册失败"));
    } finally {
      setIsCreating(false);
    }
  };

  const getPhotoCount = (albumId) => {
    if (albumId === "all") return photos.length;
    return photos.filter((photo) => photo.albumId === albumId).length;
  };

  return (
    <>
      <aside className={cn("flex h-full flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))]", className)}>
        <div className="border-b border-[hsl(var(--border))] px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-blue-500 shadow-lg">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="gradient-text text-base font-bold leading-tight text-[hsl(var(--foreground))]">我的相册</h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Personal Album</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          <p className="mb-2 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            相册系统
          </p>

          <div
            className={cn(
              "group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150",
              activeAlbumId === "all"
                ? "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]"
                : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
            )}
            onClick={() => setActiveAlbum("all")}
          >
            <div
              className={cn(
                "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md",
                activeAlbumId === "all" ? "bg-[hsl(var(--primary)/0.2)]" : "bg-[hsl(var(--secondary))]"
              )}
            >
              <Images className="h-3.5 w-3.5" />
            </div>
            <span className="flex-1 truncate text-sm font-medium">全部相册</span>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-xs font-medium",
                activeAlbumId === "all"
                  ? "bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))]"
                  : "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
              )}
            >
              {getPhotoCount("all")}
            </span>
          </div>

          <div className="h-4" />
          <p className="mb-2 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            我的相册
          </p>

          {albums.map((album) => (
            <div
              key={album.id}
              className={cn(
                "group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150",
                activeAlbumId === album.id
                  ? "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]"
                  : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
              )}
              onClick={() => setActiveAlbum(album.id)}
            >
              {album.cover ? (
                <img src={album.cover} alt={album.title} className="h-7 w-7 flex-shrink-0 rounded-md object-cover" />
              ) : (
                <div
                  className={cn(
                    "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md",
                    activeAlbumId === album.id ? "bg-[hsl(var(--primary)/0.2)]" : "bg-[hsl(var(--secondary))]"
                  )}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                </div>
              )}
              <span className="flex-1 truncate text-sm font-medium">{album.title}</span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-xs font-medium",
                  activeAlbumId === album.id
                    ? "bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))]"
                    : "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
                )}
              >
                {getPhotoCount(album.id)}
              </span>
              {isLoggedIn && album.id !== SYSTEM_ALBUM_ID && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteAlbum(album.id);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded text-[hsl(var(--muted-foreground))] opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </nav>

        {isLoggedIn && (
          <div className="border-t border-[hsl(var(--border))] px-3 py-3">
            <button
              onClick={() => {
                setCreateError("");
                setDialogOpen(true);
              }}
              className="group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-all hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(var(--secondary))] transition-all group-hover:bg-[hsl(var(--primary)/0.15)] group-hover:text-[hsl(var(--primary))]">
                <Plus className="h-3.5 w-3.5" />
              </div>
              新建相册
            </button>
          </div>
        )}
      </aside>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>新建相册</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            value={newAlbumName}
            onChange={(event) => setNewAlbumName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && !isCreating && handleCreate()}
            placeholder="输入相册名称..."
            className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            autoFocus
            disabled={isCreating}
          />
          {createError && <p className="text-sm font-medium text-red-500">{createError}</p>}
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={isCreating}>
              取消
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={!newAlbumName.trim() || isCreating}>
              {isCreating ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
