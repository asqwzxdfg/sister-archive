'use client';

import { create } from 'zustand';
import type { MediaItem } from '@/types/api';

interface LightboxState {
  isOpen: boolean;
  items: MediaItem[];
  currentIndex: number;
  open: (items: MediaItem[], index: number) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  removeById: (id: string) => void;
}

export const useLightboxStore = create<LightboxState>((set, get) => ({
  isOpen: false,
  items: [],
  currentIndex: 0,
  open: (items, index) => set({ isOpen: true, items, currentIndex: index }),
  close: () => set({ isOpen: false }),
  next: () => {
    const { currentIndex, items } = get();
    if (currentIndex < items.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },
  prev: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
    }
  },
  goTo: (index) => set({ currentIndex: index }),
  removeById: (id) => {
    const { items, currentIndex, isOpen } = get();
    const nextItems = items.filter((item) => item.id !== id);
    if (nextItems.length === 0) {
      set({ items: nextItems, currentIndex: 0, isOpen: false });
      return;
    }
    const nextIndex = Math.min(currentIndex, nextItems.length - 1);
    set({ items: nextItems, currentIndex: nextIndex, isOpen });
  },
}));
