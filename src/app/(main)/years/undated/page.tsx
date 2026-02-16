'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { MediaGrid } from '@/components/media/media-grid';
import { MediaFilters } from '@/components/media/media-filters';
import { MediaLightbox } from '@/components/media/media-lightbox';
import { Button } from '@/components/ui/button';
import type { MediaItem, PaginatedResponse } from '@/types/api';

export default function UndatedMediaPage() {
  const [filter, setFilter] = useState<'all' | 'PHOTO' | 'VIDEO'>('all');

  const { data, isLoading } = useQuery<PaginatedResponse<MediaItem>>({
    queryKey: ['media-undated', filter],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        undated: 'true',
        limit: '100',
      });
      if (filter !== 'all') {
        searchParams.set('type', filter);
      }
      const res = await fetch(`/api/media?${searchParams}`);
      if (!res.ok) throw new Error('Failed to fetch undated media');
      return res.json();
    },
  });

  const items = data?.items || [];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-6">
          <Link href="/years">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1 text-muted-foreground">
              <ChevronLeft className="h-4 w-4" />
              타임라인
            </Button>
          </Link>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">날짜 미지정</h1>
              <p className="mt-1 text-muted-foreground">촬영일/스토리일이 없는 미디어입니다.</p>
            </div>
            <MediaFilters currentFilter={filter} onFilterChange={setFilter} />
          </div>
        </div>

        <MediaGrid items={items} isLoading={isLoading} />
      </motion.div>

      <MediaLightbox />
    </>
  );
}
