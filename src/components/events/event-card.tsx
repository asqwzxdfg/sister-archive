'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Calendar, ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EVENT_CATEGORIES } from '@/lib/constants';
import type { EventItem } from '@/types/api';

interface EventCardProps {
  event: EventItem;
  index: number;
}

function getCategoryLabel(value: string): string {
  return EVENT_CATEGORIES.find((c) => c.value === value)?.label || value;
}

export function EventCard({ event, index }: EventCardProps) {
  const startDate = new Date(event.startDate);

  return (
    <Link href={`/events/${event.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: index * 0.05,
          duration: 0.35,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
        className="group overflow-hidden rounded-2xl bg-card shadow-card hover:shadow-card-hover transition-shadow duration-300 cursor-pointer"
      >
        <div className="aspect-[16/9] relative bg-muted">
          {event.coverUrl ? (
            <img
              src={event.coverUrl}
              alt={event.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Calendar className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              {getCategoryLabel(event.category)}
            </Badge>
          </div>
          <h3 className="font-semibold line-clamp-1">{event.title}</h3>
          {event.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{event.description}</p>
          )}
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {startDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
            {event.mediaCount !== undefined && event.mediaCount > 0 && (
              <span className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                {event.mediaCount}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
