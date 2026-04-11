import { create } from 'zustand';
import type { BookingImage, ImageSyncStatus } from '../types';

interface ImageStore {
  images: BookingImage[];
  getImagesForBooking: (bookingId: string) => BookingImage[];
  addImage: (data: Omit<BookingImage, 'created_at'>) => BookingImage;
  removeImage: (id: string) => void;
  removeImagesForBooking: (bookingId: string) => void;
  remapBookingImages: (oldBookingId: string, newBookingId: string) => void;
  updateSyncStatus: (id: string, status: ImageSyncStatus, remotePath?: string) => void;
}

export const useImageStore = create<ImageStore>((set, get) => ({
  images: [],

  getImagesForBooking: (bookingId) =>
    get().images.filter((img) => img.booking_id === bookingId),

  addImage: (data) => {
    const image: BookingImage = {
      ...data,
      created_at: new Date().toISOString(),
    };
    set((s) => ({ images: [...s.images, image] }));
    return image;
  },

  removeImage: (id) =>
    set((s) => ({ images: s.images.filter((img) => img.id !== id) })),

  removeImagesForBooking: (bookingId) =>
    set((s) => ({ images: s.images.filter((img) => img.booking_id !== bookingId) })),

  remapBookingImages: (oldBookingId, newBookingId) =>
    set((s) => ({
      images: s.images.map((img) =>
        img.booking_id === oldBookingId ? { ...img, booking_id: newBookingId } : img
      ),
    })),

  updateSyncStatus: (id, status, remotePath) =>
    set((s) => ({
      images: s.images.map((img) =>
        img.id === id ? { ...img, sync_status: status, remote_path: remotePath ?? img.remote_path } : img
      ),
    })),
}));
