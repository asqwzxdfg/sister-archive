'use client';

import { motion } from 'framer-motion';
import { Film, ImageOff } from 'lucide-react';
import type { MediaItem } from '@/types/api';

interface MediaCardProps {
  item: MediaItem;
  index: number;
  onClick: () => void;
}

export function MediaCard({ item, index, onClick }: MediaCardProps) {
  const thumbnailSrc = item.thumbnailUrl;

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

      {item.type === 'VIDEO' && (
        <div className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
          <Film className="h-3.5 w-3.5 text-white" />
        </div>
      )}

      <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" />
    </motion.div>
  );
}
