'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, Calendar } from 'lucide-react';
import { MediaGrid } from '@/components/media/media-grid';
import { MediaLightbox } from '@/components/media/media-lightbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EVENT_CATEGORIES } from '@/lib/constants';

interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  category: string;
  coverUrl: string | null;
  startDate: string;
  endDate: string | null;
  media: Array<{
    id: string;
    type: 'PHOTO' | 'VIDEO';
    filename: string;
    thumbnailUrl: string | null;
    webUrl: string | null;
    posterUrl: string | null;
    width: number | null;
    height: number | null;
    capturedAt: string | null;
    storyAt: string | null;
    effectiveDate: string;
    processed: boolean;
  }>;
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const { data, isLoading } = useQuery<EventDetail>({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) throw new Error('Failed to fetch event');
      return res.json();
    },
  });

  const categoryLabel = EVENT_CATEGORIES.find((c) => c.value === data?.category)?.label || data?.category;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Link href="/events">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2 gap-1 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
            이벤트
          </Button>
        </Link>

        {data && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{categoryLabel}</Badge>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(data.startDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                {data.endDate && (
                  <>
                    {' ~ '}
                    {new Date(data.endDate).toLocaleDateString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                    })}
                  </>
                )}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{data.title}</h1>
            {data.description && (
              <p className="mt-2 text-muted-foreground">{data.description}</p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">{data.media.length}개의 미디어</p>
          </div>
        )}

        <MediaGrid items={data?.media || []} isLoading={isLoading} />
      </motion.div>

      <MediaLightbox />
    </>
  );
}
