'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { MonthCard, MonthCardSkeleton } from '@/components/timeline/month-card';
import { Button } from '@/components/ui/button';
import type { TimelineResponse } from '@/types/api';

export default function YearDetailPage() {
  const params = useParams();
  const year = Number(params.year);

  const { data, isLoading } = useQuery<TimelineResponse>({
    queryKey: ['timeline'],
    queryFn: async () => {
      const res = await fetch('/api/timeline');
      if (!res.ok) throw new Error('Failed to fetch timeline');
      return res.json();
    },
  });

  const yearData = data?.years.find((y) => y.year === year);

  // Fill all 12 months
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthData = yearData?.months.find((m) => m.month === month);
    return {
      month,
      photoCount: monthData?.photoCount || 0,
      videoCount: monthData?.videoCount || 0,
      coverThumbnail: monthData?.coverThumbnail || null,
      coverMediaId: monthData?.coverMediaId || null,
      coverUpdatedAt: monthData?.coverUpdatedAt || null,
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-8">
        <Link href="/years">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
            타임라인
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{year}년</h1>
        {yearData && (
          <p className="mt-1 text-muted-foreground">
            사진 {yearData.photoCount}장
            {yearData.videoCount > 0 && ` · 영상 ${yearData.videoCount}개`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => <MonthCardSkeleton key={i} />)
          : months.map((month, index) => (
              <MonthCard
                key={month.month}
                year={year}
                month={month.month}
                photoCount={month.photoCount}
                videoCount={month.videoCount}
                coverThumbnail={month.coverThumbnail}
                coverMediaId={month.coverMediaId}
                coverUpdatedAt={month.coverUpdatedAt}
                index={index}
              />
            ))}
      </div>
    </motion.div>
  );
}
