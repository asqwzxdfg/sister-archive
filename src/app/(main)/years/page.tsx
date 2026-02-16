'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { YearCard, YearCardSkeleton } from '@/components/timeline/year-card';
import { MediaLightbox } from '@/components/media/media-lightbox';
import { Button } from '@/components/ui/button';
import type { TimelineResponse } from '@/types/api';

export default function YearsPage() {
  const { data, isLoading } = useQuery<TimelineResponse>({
    queryKey: ['timeline'],
    queryFn: async () => {
      const res = await fetch('/api/timeline');
      if (!res.ok) throw new Error('Failed to fetch timeline');
      return res.json();
    },
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">타임라인</h1>
          <p className="mt-1 text-muted-foreground">연도별 추억을 시간순으로 확인하세요</p>
          {(data?.undatedCount ?? 0) > 0 && (
            <div className="mt-3">
              <Link href="/years/undated">
                <Button variant="outline" size="sm">
                  날짜 미지정 {data?.undatedCount}개
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <YearCardSkeleton key={i} />)
            : data?.years.map((year, index) => (
                <YearCard
                  key={year.year}
                  year={year.year}
                  photoCount={year.photoCount}
                  videoCount={year.videoCount}
                  coverThumbnail={year.coverThumbnail}
                  coverMediaId={year.coverMediaId ?? null}
                  coverUpdatedAt={year.coverUpdatedAt ?? null}
                  index={index}
                />
              ))}
        </div>

        {!isLoading && (!data?.years || data.years.length === 0) && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-medium text-muted-foreground">아직 사진이 없어요</p>
            <p className="mt-1 text-sm text-muted-foreground/70">사진을 업로드해 추억을 기록해보세요</p>
          </div>
        )}
      </motion.div>

      <MediaLightbox />
    </>
  );
}
