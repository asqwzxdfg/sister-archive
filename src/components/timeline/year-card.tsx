'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Camera, Film, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type React from 'react';

interface YearCardProps {
  year: number;
  photoCount: number;
  videoCount: number;
  coverThumbnail: string | null;
  coverMediaId?: string | null;
  coverUpdatedAt?: string | null;
  index: number;
}

export function YearCard({
  year,
  photoCount,
  videoCount,
  coverThumbnail,
  coverMediaId,
  coverUpdatedAt,
  index,
}: YearCardProps) {
  const total = photoCount + videoCount;
  const { user } = useAuthStore();
  const canEdit = user?.role === 'OWNER' || user?.role === 'EDITOR';
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const coverSrc = coverThumbnail
    ? `${coverThumbnail}?v=${encodeURIComponent(coverUpdatedAt ?? '')}`
    : null;

  const refreshThumbnail = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!coverMediaId || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/media/${coverMediaId}/regenerate`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Link href={`/years/${year}`}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: index * 0.06,
          duration: 0.4,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="group relative overflow-hidden rounded-2xl bg-card shadow-card hover:shadow-card-hover transition-shadow duration-300 cursor-pointer"
      >
        <div className="aspect-[4/3] relative bg-muted">
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={`${year}년`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Camera className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
          {canEdit && coverMediaId && (
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h2 className="text-3xl font-bold text-white">{year}</h2>
          <div className="mt-1 flex items-center gap-3 text-sm text-white/80">
            {photoCount > 0 && (
              <span className="flex items-center gap-1">
                <Camera className="h-3.5 w-3.5" />
                {photoCount}
              </span>
            )}
            {videoCount > 0 && (
              <span className="flex items-center gap-1">
                <Film className="h-3.5 w-3.5" />
                {videoCount}
              </span>
            )}
            {total === 0 && <span>아직 사진이 없어요</span>}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export function YearCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl">
      <Skeleton className="aspect-[4/3] w-full" />
    </div>
  );
}
