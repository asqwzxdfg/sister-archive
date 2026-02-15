'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { MediaGrid } from '@/components/media/media-grid';
import { MediaFilters } from '@/components/media/media-filters';
import { MediaLightbox } from '@/components/media/media-lightbox';
import { Button } from '@/components/ui/button';
import { formatMonthYear } from '@/lib/utils';
import type { MediaItem, PaginatedResponse } from '@/types/api';

export default function MonthDetailPage() {
  const params = useParams();
  const year = Number(params.year);
  const month = Number(params.month);
  const [filter, setFilter] = useState<'all' | 'PHOTO' | 'VIDEO'>('all');

  const { data, isLoading } = useQuery<PaginatedResponse<MediaItem>>({
    queryKey: ['media', year, month, filter],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        year: String(year),
        month: String(month),
        limit: '100',
      });
      if (filter !== 'all') {
        searchParams.set('type', filter);
      }
      const res = await fetch(`/api/media?${searchParams}`);
      if (!res.ok) throw new Error('Failed to fetch media');
      return res.json();
    },
  });

  const items = data?.items || [];

  // Group by date
  const groupedByDate = items.reduce<Record<string, MediaItem[]>>((acc, item) => {
    const date = new Date(item.effectiveDate).toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-6">
          <Link href={`/years/${year}`}>
            <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1 text-muted-foreground">
              <ChevronLeft className="h-4 w-4" />
              {year}년
            </Button>
          </Link>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {formatMonthYear(year, month)}
              </h1>
              {items.length > 0 && (
                <p className="mt-1 text-muted-foreground">{items.length}개의 미디어</p>
              )}
            </div>
            <MediaFilters currentFilter={filter} onFilterChange={setFilter} />
          </div>
        </div>

        {sortedDates.length > 0 ? (
          <div className="space-y-8">
            {sortedDates.map((date) => (
              <div key={date}>
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                  {new Date(date).toLocaleDateString('ko-KR', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                    timeZone: 'Asia/Seoul',
                  })}
                </h3>
                <MediaGrid items={groupedByDate[date]} />
              </div>
            ))}
          </div>
        ) : (
          <MediaGrid items={[]} isLoading={isLoading} />
        )}
      </motion.div>

      <MediaLightbox />
    </>
  );
}
