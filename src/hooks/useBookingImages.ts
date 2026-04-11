import { useState, useEffect, useCallback, useRef } from 'react';
import { useImageStore } from '../stores/imageStore';
import { saveImage, getThumbnail, getOriginal, deleteImage as deleteImageBlob } from '../lib/imageDb';
import { generateThumbnail } from '../utils/imageProcessing';
import type { BookingImage } from '../types';

export interface ThumbnailEntry {
  id: string;
  url: string;
  meta: BookingImage;
}

export function useBookingImages(bookingId: string | undefined) {
  const images = useImageStore((s) => bookingId ? s.getImagesForBooking(bookingId) : []);
  const addImageMeta = useImageStore((s) => s.addImage);
  const removeImageMeta = useImageStore((s) => s.removeImage);

  const [thumbnails, setThumbnails] = useState<ThumbnailEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const urlsRef = useRef<string[]>([]);

  // Load thumbnails from IndexedDB when image metadata changes
  useEffect(() => {
    if (!images.length) {
      setThumbnails([]);
      return;
    }

    let cancelled = false;

    async function loadThumbnails() {
      const entries: ThumbnailEntry[] = [];
      for (const meta of images) {
        const blob = await getThumbnail(meta.id);
        if (blob && !cancelled) {
          const url = URL.createObjectURL(blob);
          urlsRef.current.push(url);
          entries.push({ id: meta.id, url, meta });
        }
      }
      if (!cancelled) setThumbnails(entries);
    }

    loadThumbnails();

    return () => {
      cancelled = true;
    };
  }, [images]);

  // Revoke all object URLs on unmount
  useEffect(() => {
    return () => {
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      urlsRef.current = [];
    };
  }, []);

  const addImages = useCallback(async (files: FileList) => {
    if (!bookingId) return;
    setIsLoading(true);

    const newEntries: ThumbnailEntry[] = [];

    for (const file of Array.from(files)) {
      const id = crypto.randomUUID();
      const { thumbnail, width, height } = await generateThumbnail(file);

      await saveImage(id, file, thumbnail);

      const meta = addImageMeta({
        id,
        booking_id: bookingId,
        filename: file.name,
        mime_type: file.type || 'image/jpeg',
        size_bytes: file.size,
        width,
        height,
        sync_status: 'local',
      });

      const url = URL.createObjectURL(thumbnail);
      urlsRef.current.push(url);
      newEntries.push({ id: meta.id, url, meta });
    }

    setThumbnails((prev) => [...prev, ...newEntries]);
    setIsLoading(false);
  }, [bookingId, addImageMeta]);

  const removeImage = useCallback(async (id: string) => {
    removeImageMeta(id);
    await deleteImageBlob(id);
    setThumbnails((prev) => {
      const entry = prev.find((t) => t.id === id);
      if (entry) URL.revokeObjectURL(entry.url);
      return prev.filter((t) => t.id !== id);
    });
  }, [removeImageMeta]);

  const getOriginalUrl = useCallback(async (id: string): Promise<string | null> => {
    const blob = await getOriginal(id);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }, []);

  return { thumbnails, isLoading, addImages, removeImage, getOriginalUrl };
}
