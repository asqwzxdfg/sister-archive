'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { MediaGrid } from '@/components/media/media-grid';
import { MediaLightbox } from '@/components/media/media-lightbox';
import type { MediaItem } from '@/types/api';

export default function LibraryFolderPage() {
  const params = useParams();
  const rawPath = Array.isArray(params.path) ? params.path : [params.path];
  const safeParts = rawPath.filter((p): p is string => typeof p === 'string');
  const folderPath = safeParts.map((p) => decodeURIComponent(p)).join('/');

  const { data, isLoading } = useQuery<{ items: MediaItem[] }>({
    queryKey: ['library-folder', folderPath],
    queryFn: async () => {
      const res = await fetch(`/api/library/${safeParts.join('/')}`);
      if (!res.ok) throw new Error('Failed to fetch folder');
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{folderPath}</h1>
        <p className="text-sm text-muted-foreground">폴더 내 미디어를 시간순으로 표시합니다</p>
      </div>
      <MediaGrid items={data?.items ?? []} isLoading={isLoading} />
      <MediaLightbox />
    </div>
  );
}
