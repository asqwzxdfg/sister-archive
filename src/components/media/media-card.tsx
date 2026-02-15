'use client';

import { motion } from 'framer-motion';
import { Film, ImageOff, RefreshCw } from 'lucide-react';
import type { MediaItem } from '@/types/api';
import { useAuthStore } from '@/stores/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface MediaCardProps {
  item: MediaItem;
  index: number;
  onClick: () => void;
}

export function MediaCard({ item, index, onClick }: MediaCardProps) {
  const { user } = useAuthStore();
  const canEdit = user?.role === 'OWNER' || user?.role === 'EDITOR';
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const thumbnailSrc = item.thumbnailUrl
    ? `${item.thumbnailUrl}?v=${encodeURIComponent(item.updatedAt ?? item.effectiveDate)}`
    : null;

  const refreshThumbnail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/media/${item.id}/regenerate`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === 'media' ||
            key === 'timeline' ||
            key === 'library-folder' ||
            key === 'library-folders' ||
            key === 'events'
          );
        },
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: index * 0.03,
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-xl bg-muted aspect-square"
    >
      {thumbnailSrc ? (
        <img
          src={thumbnailSrc}
          alt={item.filename}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <ImageOff className="h-8 w-8 text-muted-foreground/30" />
        </div>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={refreshThumbnail}
          className="absolute right-2 top-2 z-10 rounded-full bg-transparent p-1 text-white/80 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
          aria-label="썸네일 재생성"
          title="썸네일 재생성"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      )}

      {item.type === 'VIDEO' && (
        <div className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
          <Film className="h-3.5 w-3.5 text-white" />
        </div>
      )}

      <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" />
    </motion.div>
  );
}
