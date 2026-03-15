"use client";
import React, { useState } from "react";
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

import Lightbox from "./Lightbox";
import { SortablePhoto } from "./SortablePhoto";
import useAlbumStore from "@/store/albumStore";

export default function PhotoGrid({ isLoggedIn }) {
  const { activeAlbumId, getAlbumPhotos, deletePhoto, layout, reorderPhotos } = useAlbumStore();
  const photos = getAlbumPhotos(activeAlbumId);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const isAlbumSortable = isLoggedIn && activeAlbumId !== "all";
  const activePhoto = activeId ? photos.find((photo) => photo.id === activeId) : null;

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
      <p className="text-[hsl(var(--muted-foreground))] text-sm mb-4">{photos.length} 张照片</p>
      
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
