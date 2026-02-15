'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Camera, Film, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type React from 'react';

interface MonthCardProps {
  year: number;
  month: number;
  photoCount: number;
  videoCount: number;
  coverThumbnail: string | null;
  coverMediaId?: string | null;
  coverUpdatedAt?: string | null;
  index: number;
}

const MONTH_NAMES = [
  '', '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

export function MonthCard({
  year,
  month,
  photoCount,
  videoCount,
  coverThumbnail,
  coverMediaId,
  coverUpdatedAt,
  index,
}: MonthCardProps) {
  const total = photoCount + videoCount;
  const isEmpty = total === 0;
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
    <Link href={isEmpty ? '#' : `/years/${year}/${month}`}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: index * 0.04,
          duration: 0.35,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        whileHover={isEmpty ? {} : { y: -3, transition: { duration: 0.2 } }}
        className={`group relative overflow-hidden rounded-2xl bg-card shadow-card transition-shadow duration-300 ${
          isEmpty ? 'opacity-40 cursor-default' : 'hover:shadow-card-hover cursor-pointer'
        }`}
      >
        <div className="aspect-square relative bg-muted">
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={`${year}년 ${month}월`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-2xl font-light text-muted-foreground/30">
                {MONTH_NAMES[month]}
              </span>
            </div>
          )}
          {!isEmpty && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          )}
          {canEdit && coverMediaId && !isEmpty && (
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
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className={`text-lg font-semibold ${isEmpty ? 'text-muted-foreground' : 'text-white'}`}>
            {MONTH_NAMES[month]}
          </h3>
          {!isEmpty && (
            <div className="mt-0.5 flex items-center gap-2 text-xs text-white/80">
              {photoCount > 0 && (
                <span className="flex items-center gap-1">
                  <Camera className="h-3 w-3" />
                  {photoCount}
                </span>
              )}
              {videoCount > 0 && (
                <span className="flex items-center gap-1">
                  <Film className="h-3 w-3" />
                  {videoCount}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

export function MonthCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl">
      <Skeleton className="aspect-square w-full" />
    </div>
  );
}
