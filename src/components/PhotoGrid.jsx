"use client";
import React, { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CheckSquare2, Loader2, Square, Trash2, X } from "lucide-react";

import Lightbox from "./Lightbox";
import { SortablePhoto } from "./SortablePhoto";
import useAlbumStore from "@/store/albumStore";

export default function PhotoGrid({ isLoggedIn }) {
  const { activeAlbumId, getAlbumPhotos, deletePhoto, deletePhotos, layout, reorderPhotos } = useAlbumStore();
  const photos = getAlbumPhotos(activeAlbumId);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);
  const [isDeletingSelection, setIsDeletingSelection] = useState(false);
  const isAlbumSortable = isLoggedIn && activeAlbumId !== "all" && !selectionMode && !isDeletingSelection;
  const activePhoto = activeId ? photos.find((photo) => photo.id === activeId) : null;
  const selectedCount = selectedPhotoIds.length;
  const allSelected = photos.length > 0 && selectedCount === photos.length;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setSelectionMode(false);
    setSelectedPhotoIds([]);
    setActiveId(null);
    setLightboxIndex(null);
  }, [activeAlbumId]);

  useEffect(() => {
    setSelectedPhotoIds((current) =>
      current.filter((photoId) => photos.some((photo) => photo.id === photoId))
    );
  }, [photos]);

  const toggleSelectedPhoto = (photoId) => {
    setSelectedPhotoIds((current) =>
      current.includes(photoId) ? current.filter((id) => id !== photoId) : [...current, photoId]
    );
  };

  const handleSelectionModeChange = (nextValue) => {
    setSelectionMode(nextValue);
    setSelectedPhotoIds([]);
    setActiveId(null);
  };

  const handleDeleteSelected = async () => {
    if (selectedCount === 0 || isDeletingSelection) {
      return;
    }

    const confirmed = window.confirm(`确定要删除选中的 ${selectedCount} 张照片吗？此操作不可撤销。`);
    if (!confirmed) {
      return;
    }

    setIsDeletingSelection(true);

    try {
      await deletePhotos(selectedPhotoIds);
      handleSelectionModeChange(false);
    } catch (error) {
      console.error("Batch delete photos failed:", error);
      window.alert(error instanceof Error ? error.message : "批量删除照片失败");
    } finally {
      setIsDeletingSelection(false);
    }
  };

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[hsl(var(--secondary))] flex items-center justify-center">
          <span className="text-4xl">🖼️</span>
        </div>
        <p className="text-[hsl(var(--foreground))] font-medium text-lg">还没有照片</p>
        <p className="text-[hsl(var(--muted-foreground))] text-sm">上传你的第一张照片开始建立相册</p>
      </div>
    )
  }

  const handleDragEnd = (event) => {
    setActiveId(null);
    if (!isAlbumSortable) {
      return;
    }

    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderPhotos(active.id, over.id);
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {photos.length} 张照片
          {selectionMode ? ` · 已选 ${selectedCount} 张` : ""}
        </p>

        {isLoggedIn && (
          <div className="flex flex-wrap items-center gap-2">
            {selectionMode ? (
              <>
                <button
                  onClick={() => setSelectedPhotoIds(allSelected ? [] : photos.map((photo) => photo.id))}
                  className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition-all hover:bg-[hsl(var(--secondary))]"
                >
                  {allSelected ? <Square className="h-4 w-4" /> : <CheckSquare2 className="h-4 w-4" />}
                  <span>{allSelected ? "取消全选" : "全选当前"}</span>
                </button>
                <button
                  onClick={() => handleSelectionModeChange(false)}
                  className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition-all hover:bg-[hsl(var(--secondary))]"
                >
                  <X className="h-4 w-4" />
                  <span>取消</span>
                </button>
                <button
                  onClick={() => void handleDeleteSelected()}
                  disabled={selectedCount === 0 || isDeletingSelection}
                  className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeletingSelection ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span>{isDeletingSelection ? "删除中..." : `删除已选${selectedCount ? ` (${selectedCount})` : ""}`}</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => handleSelectionModeChange(true)}
                className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition-all hover:bg-[hsl(var(--secondary))]"
              >
                <CheckSquare2 className="h-4 w-4" />
                <span>批量删除</span>
              </button>
            )}
          </div>
        )}
      </div>
      
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={layout === 'grid'
          ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
          : "columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 space-y-3"
        }>
          <SortableContext 
            items={photos.map((photo) => photo.id)}
            strategy={rectSortingStrategy}
          >
            {photos.map((photo, idx) => (
              <SortablePhoto 
                key={photo.id}
                photo={photo}
                idx={idx}
                layout={layout}
                isLoggedIn={isLoggedIn}
                isDraggable={isAlbumSortable}
                deletePhoto={deletePhoto}
                selectionMode={selectionMode}
                isSelected={selectedPhotoIds.includes(photo.id)}
                toggleSelected={toggleSelectedPhoto}
                setLightboxIndex={setLightboxIndex}
              />
            ))}
          </SortableContext>
        </div>

        <DragOverlay>
          {activePhoto ? (
            <SortablePhoto
              photo={activePhoto}
              idx={photos.findIndex((photo) => photo.id === activePhoto.id)}
              layout={layout}
              isLoggedIn={isLoggedIn}
              isDraggable={isAlbumSortable}
              deletePhoto={deletePhoto}
              selectionMode={selectionMode}
              isSelected={selectedPhotoIds.includes(activePhoto.id)}
              toggleSelected={toggleSelectedPhoto}
              setLightboxIndex={setLightboxIndex}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIndex}
          isLoggedIn={isLoggedIn}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
