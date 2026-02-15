'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Folder } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { LibraryResponse } from '@/types/api';

export default function LibraryPage() {
  const { data, isLoading } = useQuery<LibraryResponse>({
    queryKey: ['library-folders'],
    queryFn: async () => {
      const res = await fetch('/api/library');
      if (!res.ok) throw new Error('Failed to fetch library');
      return res.json();
    },
  });

  const folders = data?.folders ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i} className="h-28 animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-muted-foreground">폴더가 없습니다</p>
        <p className="mt-1 text-sm text-muted-foreground/70">라이브러리 스캔을 먼저 실행해주세요</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {folders.map((folder, index) => {
        const href = folder.path
          ? `/library/${folder.path.split('/').map(encodeURIComponent).join('/')}`
          : '/library';

        return (
          <motion.div
            key={folder.path || 'root'}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Link href={href}>
              <Card className="group overflow-hidden">
                <CardContent className="flex items-center gap-4 p-4">
                  {folder.coverThumbnail ? (
                    <img
                      src={folder.coverThumbnail}
                      alt={folder.name}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                      <Folder className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{folder.name}</p>
                    <p className="text-sm text-muted-foreground">
                      사진 {folder.photoCount}장 · 영상 {folder.videoCount}개
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
