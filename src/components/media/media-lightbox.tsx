'use client';

import { useEffect, useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download, Trash2, PlusSquare } from 'lucide-react';
import { useLightboxStore } from '@/stores/lightbox-store';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { EventItem } from '@/types/api';

export function MediaLightbox() {
  const { isOpen, items, currentIndex, close, next, prev, removeById } = useLightboxStore();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'OWNER' || user?.role === 'EDITOR';
  const queryClient = useQueryClient();

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [isSavingEvents, setIsSavingEvents] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentItem = items[currentIndex];

  const { data: eventsData, isLoading: isEventsLoading } = useQuery<{ events: EventItem[] }>({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: eventDialogOpen && canEdit,
  });

  const events = useMemo(() => eventsData?.events ?? [], [eventsData]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      switch (e.key) {
        case 'Escape':
          close();
          break;
        case 'ArrowLeft':
          prev();
          break;
        case 'ArrowRight':
          next();
          break;
      }
    },
    [isOpen, close, prev, next],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!eventDialogOpen || !currentItem) return;
    (async () => {
      const res = await fetch(`/api/media/${currentItem.id}`);
      if (!res.ok) return;
      const data = await res.json();
      const ids = Array.isArray(data.events) ? data.events.map((e: EventItem) => e.id) : [];
      setSelectedEventIds(ids);
    })();
  }, [eventDialogOpen, currentItem?.id]);

  const toggleEventId = (eventId: string) => {
    setSelectedEventIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId],
    );
  };

  const saveEvents = async () => {
    if (!currentItem) return;
    setIsSavingEvents(true);
    try {
      const res = await fetch(`/api/media/${currentItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventIds: selectedEventIds }),
      });
      if (!res.ok) throw new Error('Failed');
      setEventDialogOpen(false);
    } finally {
      setIsSavingEvents(false);
    }
  };

  const deleteCurrent = async () => {
    if (!currentItem || isDeleting) return;
    if (!confirm('이 미디어를 삭제할까요? 원본 파일도 삭제됩니다.')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/media/${currentItem.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      removeById(currentItem.id);
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === 'media' ||
            key === 'timeline' ||
            key === 'library-folder' ||
            key === 'library-folders' ||
            key === 'events'
          );
        },
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!currentItem) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={close}
        >
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
            <div className="text-sm text-white/70">
              {currentIndex + 1} / {items.length}
              {currentItem.effectiveDate && (
                <span className="ml-3">
                  {formatDate(currentItem.effectiveDate)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEventDialogOpen(true);
                    }}
                  >
                    <PlusSquare className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteCurrent();
                    }}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentItem.webUrl || currentItem.thumbnailUrl) {
                    window.open(
                      `/api/media/${currentItem.id}/file?type=original`,
                      '_blank',
                    );
                  }
                }}
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 z-10 h-12 w-12 rounded-full text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {currentIndex < items.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 z-10 h-12 w-12 rounded-full text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Content */}
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative max-h-[85vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {currentItem.type === 'PHOTO' ? (
              <img
                src={currentItem.webUrl || currentItem.thumbnailUrl || ''}
                alt={currentItem.filename}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
              />
            ) : (
              <video
                src={`/api/media/${currentItem.id}/file?type=original`}
                poster={currentItem.posterUrl || currentItem.thumbnailUrl || undefined}
                controls
                className="max-h-[85vh] max-w-[90vw] rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>이벤트 추가</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {isEventsLoading && (
            <p className="text-sm text-muted-foreground">이벤트를 불러오는 중...</p>
          )}
          {!isEventsLoading && events.length === 0 && (
            <p className="text-sm text-muted-foreground">등록된 이벤트가 없습니다</p>
          )}
          {!isEventsLoading && events.length > 0 && (
            <div className="max-h-64 space-y-2 overflow-auto rounded-md border p-3">
              {events.map((event) => (
                <label key={event.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedEventIds.includes(event.id)}
                    onChange={() => toggleEventId(event.id)}
                  />
                  <span className="text-muted-foreground">{event.category}</span>
                  <span>{event.title}</span>
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEventDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={saveEvents} disabled={isSavingEvents}>
              {isSavingEvents ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
