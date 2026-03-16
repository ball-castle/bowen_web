"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Columns, LayoutGrid, Loader2, LogIn, LogOut, Trash2, Upload, X } from "lucide-react";

import { logoutAdmin } from "@/app/actions";
import LoginModal from "@/components/LoginModal";
import PhotoGrid from "@/components/PhotoGrid";
import Sidebar from "@/components/Sidebar";
import UploadZone from "@/components/UploadZone";
import { SYSTEM_ALBUM_ID } from "@/lib/album-constants";
import { getActionErrorMessage } from "@/lib/action-errors";
import { cn } from "@/lib/utils";
import useAlbumStore from "@/store/albumStore";

export default function HomePage({ initialIsLoggedIn }) {
  const [showUpload, setShowUpload] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn);
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const [isDeletingAlbum, startDeleteAlbumTransition] = useTransition();

  const { albums, activeAlbumId, setActiveAlbum, layout, setLayout, hydrate, isLoading, deleteAlbum } = useAlbumStore();
  const activeAlbum = albums.find((album) => album.id === activeAlbumId);
  const canDeleteAlbum =
    isLoggedIn &&
    activeAlbumId !== "all" &&
    Boolean(activeAlbum) &&
    activeAlbum.id !== SYSTEM_ALBUM_ID;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setIsLoggedIn(initialIsLoggedIn);
  }, [initialIsLoggedIn]);

  const handleLogout = () => {
    startLogoutTransition(async () => {
      try {
        await logoutAdmin();
        setIsLoggedIn(false);
        setShowUpload(false);
      } catch (error) {
        console.error("Logout failed:", error);
      }
    });
  };

  const handleDeleteAlbum = () => {
    if (!activeAlbum || activeAlbum.id === SYSTEM_ALBUM_ID) {
      return;
    }

    const confirmed = window.confirm(`确定要删除相册「${activeAlbum.title}」吗？相册内的照片也会一起删除。`);
    if (!confirmed) {
      return;
    }

    startDeleteAlbumTransition(async () => {
      try {
        await deleteAlbum(activeAlbum.id);
        setShowUpload(false);
      } catch (error) {
        console.error("Delete album failed:", error);
        window.alert(getActionErrorMessage(error, "删除相册失败"));
      }
    });
  };

  if (isLoading && albums.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[hsl(var(--primary))]" />
          <p className="animate-pulse text-lg font-medium">正在加载相册...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
      <Sidebar className="hidden w-64 flex-shrink-0 md:flex" isLoggedIn={isLoggedIn} />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/0.8)] px-5 py-4 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo_chosen.png"
                alt="Vito Logo"
                className="h-14 w-auto cursor-pointer rounded-lg object-contain drop-shadow-sm transition-opacity hover:opacity-90"
                onClick={() => setPreviewImage("/logo_chosen.png")}
              />
              <div className="hidden h-10 w-[2px] rounded-full bg-[hsl(var(--border))] sm:block" />
              <div
                className="group flex cursor-pointer items-center gap-3"
                onClick={() => setPreviewImage("/avatar_chosen.png")}
              >
                <img
                  src="/avatar_chosen.png"
                  alt="Vito Avatar"
                  className="h-12 w-12 rounded-full border-[3px] border-[hsl(var(--primary)/0.2)] object-cover shadow-sm transition-colors group-hover:border-[hsl(var(--primary)/0.5)]"
                />
                <div className="hidden sm:block">
                  <h1 className="text-base font-bold text-[hsl(var(--foreground))] transition-colors group-hover:text-[hsl(var(--primary))]">
                    Vito 的相册
                  </h1>
                  <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    博文 • Photography
                  </p>
                </div>
              </div>
            </div>

            <div className="ml-2 mr-2 hidden h-8 w-[2px] rounded-full bg-[hsl(var(--border))] md:block" />

            <div className="hidden md:block">
              <h2 className="truncate text-base font-semibold leading-tight text-[hsl(var(--foreground))]">
                {activeAlbum?.title || "全部照片"}
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {new Date().toLocaleDateString("zh-CN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <select
              value={activeAlbumId}
              onChange={(event) => setActiveAlbum(event.target.value)}
              className="max-w-36 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] sm:max-w-48"
            >
              <option value="all">全部相册</option>
              {albums.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.title}
                </option>
              ))}
            </select>

            {isLoggedIn ? (
              <>
                <button
                  onClick={() => setLayout(layout === "grid" ? "columns" : "grid")}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] transition-all hover:bg-[hsl(var(--secondary)/0.8)]"
                  title="切换布局风格"
                >
                  {layout === "grid" ? <Columns className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
                </button>
                <button
                  onClick={() => setShowUpload((current) => !current)}
                  className={cn(
                    "flex h-10 flex-shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-all",
                    showUpload
                      ? "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
                      : "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/0.25)] hover:opacity-90"
                  )}
                >
                  {showUpload ? <X className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                  <span className="hidden sm:inline">{showUpload ? "收起" : "批量上传"}</span>
                </button>
                {canDeleteAlbum && (
                  <button
                    onClick={handleDeleteAlbum}
                    disabled={isDeletingAlbum}
                    title="删除当前相册"
                    className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeletingAlbum ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{isDeletingAlbum ? "删除中" : "删除相册"}</span>
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  <span className="hidden sm:inline">{isLoggingOut ? "正在退出" : "退出管理"}</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-2 rounded-lg bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition-all hover:bg-[hsl(var(--secondary)/0.8)]"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">管理员登录</span>
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-screen-2xl px-5 py-5">
            {isLoggedIn && showUpload && (
              <div className="mb-6 animate-slideUp">
                <UploadZone />
              </div>
            )}

            <div className="animate-fadeIn">
              <PhotoGrid isLoggedIn={isLoggedIn} />
            </div>
          </div>
        </div>
      </main>

      <LoginModal
        isOpen={showLogin}
        onOpenChange={setShowLogin}
        onSuccess={() => {
          setIsLoggedIn(true);
          setShowLogin(false);
        }}
      />

      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => setPreviewImage(null)}
        >
          <button className="absolute right-6 top-6 text-white/70 transition-colors hover:text-white">
            <X className="h-8 w-8" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-h-[85vh] max-w-[90vw] cursor-default rounded-xl object-contain shadow-2xl animate-scaleIn"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
