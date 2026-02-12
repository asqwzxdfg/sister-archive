'use client';

import { AnimatePresence } from 'framer-motion';
import { MediaCard } from './media-card';
import { useLightboxStore } from '@/stores/lightbox-store';
import type { MediaItem } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';

interface MediaGridProps {
  items: MediaItem[];
  isLoading?: boolean;
}

export function MediaGrid({ items, isLoading }: MediaGridProps) {
  const { open } = useLightboxStore();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 20 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-muted-foreground">사진이 없습니다</p>
        <p className="mt-1 text-sm text-muted-foreground/70">이 기간에 업로드된 미디어가 없어요</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <MediaCard
            key={item.id}
            item={item}
            index={index}
            onClick={() => open(items, index)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
