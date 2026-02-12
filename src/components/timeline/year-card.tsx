'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Camera, Film } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface YearCardProps {
  year: number;
  photoCount: number;
  videoCount: number;
  coverThumbnail: string | null;
  index: number;
}

export function YearCard({ year, photoCount, videoCount, coverThumbnail, index }: YearCardProps) {
  const total = photoCount + videoCount;

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
          {coverThumbnail ? (
            <img
              src={coverThumbnail}
              alt={`${year}년`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Camera className="h-12 w-12 text-muted-foreground/30" />
            </div>
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
