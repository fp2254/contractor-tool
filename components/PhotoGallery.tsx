"use client";

import { useRef, useState } from "react";

type Photo = {
  id: string;
  url: string;
  filename: string | null;
  created_at: string;
};

type Props = {
  entityType: "job" | "customer" | "lead" | "invoice";
  entityId: string;
  initialPhotos: Photo[];
};

export function PhotoGallery({ entityType, entityId, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        form.append("entity_type", entityType);
        form.append("entity_id", entityId);
        const res = await fetch("/api/photos/upload", { method: "POST", body: form });
        if (res.ok) {
          const photo = await res.json() as Photo;
          setPhotos(prev => [photo, ...prev]);
        }
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function deletePhoto(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPhotos(prev => prev.filter(p => p.id !== id));
        if (lightbox?.id === id) setLightbox(null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase">
            Photos {photos.length > 0 && `(${photos.length})`}
          </p>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg disabled:opacity-60"
            style={{ backgroundColor: "#1B3A6B" }}>
            {uploading ? (
              <>
                <span className="animate-spin text-sm">⟳</span> Uploading…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
                </svg>
                Add Photo
              </>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>

        {photos.length === 0 ? (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 disabled:opacity-60">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21" />
            </svg>
            <span className="text-sm">Tap to add photos</span>
            <span className="text-xs">Camera or gallery</span>
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map(photo => (
              <div key={photo.id} className="relative aspect-square group">
                <button
                  onClick={() => setLightbox(photo)}
                  className="w-full h-full rounded-xl overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.filename ?? "Photo"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
                <button
                  onClick={() => deletePhoto(photo.id)}
                  disabled={deletingId === photo.id}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 flex items-center justify-center text-white disabled:opacity-50">
                  {deletingId === photo.id ? (
                    <span className="text-xs animate-spin">⟳</span>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-1 disabled:opacity-60">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
              </svg>
              <span className="text-[10px]">Add</span>
            </button>
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={() => setLightbox(null)}>
          <div className="flex justify-between items-center px-4 py-3">
            <p className="text-white text-sm truncate flex-1 mr-4">{lightbox.filename ?? "Photo"}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={e => { e.stopPropagation(); deletePhoto(lightbox.id); }}
                className="text-red-400 text-sm font-medium">
                Delete
              </button>
              <button onClick={() => setLightbox(null)} className="text-white text-sm">✕</button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.filename ?? "Photo"}
              className="max-w-full max-h-full object-contain rounded-xl"
            />
          </div>
          <a
            href={lightbox.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-center text-white/60 text-xs pb-4">
            Open full size ↗
          </a>
        </div>
      )}
    </>
  );
}
