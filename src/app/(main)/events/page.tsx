'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { EventCard } from '@/components/events/event-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { EVENT_CATEGORIES } from '@/lib/constants';
import type { EventItem } from '@/types/api';
import Link from 'next/link';

export default function EventsPage() {
  const { user } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const isEditor = user?.role === 'OWNER' || user?.role === 'EDITOR';

  const { data, isLoading } = useQuery<{ events: EventItem[] }>({
    queryKey: ['events', selectedCategory],
    queryFn: async () => {
      const params = selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';
      const res = await fetch(`/api/events${params}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json();
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">이벤트</h1>
          <p className="mt-1 text-muted-foreground">특별한 순간들을 모아보세요</p>
        </div>
        {isEditor && (
          <Link href="/events/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              새 이벤트
            </Button>
          </Link>
        )}
      </div>

      {/* Category filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          전체
        </Button>
        {EVENT_CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl">
              <Skeleton className="aspect-[16/9] w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : data?.events && data.events.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.events.map((event, index) => (
            <EventCard key={event.id} event={event} index={index} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-medium text-muted-foreground">이벤트가 없습니다</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            특별한 순간을 이벤트로 만들어보세요
          </p>
        </div>
      )}
    </motion.div>
  );
}
