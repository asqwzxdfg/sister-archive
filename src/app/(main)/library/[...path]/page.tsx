'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MediaGrid } from '@/components/media/media-grid';
import { MediaCard } from '@/components/media/media-card';
import { MediaLightbox } from '@/components/media/media-lightbox';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import type { MediaItem } from '@/types/api';

type FolderResponse = {
  items: MediaItem[];
};

type RenameResponse = {
  path: string;
  message: string;
};

type BulkDeleteResponse = {
  deletedCount: number;
  remainingCount: number;
  folderRemoved: boolean;
};

export default function LibraryFolderPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'OWNER' || user?.role === 'EDITOR';

  const rawPath = Array.isArray(params.path) ? params.path : [params.path];
  const decodedParts = rawPath
    .filter((p): p is string => typeof p === 'string')
    .map((p) => decodeURIComponent(p));
  const encodedPath = decodedParts.map((p) => encodeURIComponent(p)).join('/');
  const folderPath = decodedParts.join('/');
  const folderName = decodedParts[decodedParts.length - 1] ?? '';

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery<FolderResponse>({
    queryKey: ['library-folder', folderPath],
    queryFn: async () => {
      const res = await fetch(`/api/library/${encodedPath}`);
      if (!res.ok) throw new Error('Failed to fetch folder');
      return res.json();
    },
  });

  const items = data?.items ?? [];
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const renameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const res = await fetch(`/api/library/${encodedPath}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || '폴더명 변경에 실패했습니다');
      }
      return (await res.json()) as RenameResponse;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['library-folders'] });
      queryClient.invalidateQueries({ queryKey: ['library-folder'] });
      const nextPath = result.path
        .split('/')
        .map((p) => encodeURIComponent(p))
        .join('/');
      router.replace(`/library/${nextPath}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (mediaIds: string[]) => {
      const res = await fetch(`/api/library/${encodedPath}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaIds }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || '삭제에 실패했습니다');
      }
      return (await res.json()) as BulkDeleteResponse;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['library-folders'] });
      queryClient.invalidateQueries({ queryKey: ['library-folder', folderPath] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      setSelectedIds([]);
      setIsSelectMode(false);
      if (result.remainingCount === 0 || result.folderRemoved) {
        router.replace('/library');
      }
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const selectAll = () => {
    setSelectedIds(items.map((item) => item.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const onClickRename = () => {
    const next = prompt('새 폴더명을 입력하세요', folderName);
    if (!next) return;
    const trimmed = next.trim();
    if (!trimmed) return;
    if (trimmed === folderName) return;
    void renameMutation.mutate(trimmed);
  };

  const onClickDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const ok = confirm(`선택한 ${selectedIds.length}개 항목을 삭제할까요? 원본 파일도 삭제됩니다.`);
    if (!ok) return;
    void deleteMutation.mutate(selectedIds);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{folderPath}</h1>
          <p className="text-sm text-muted-foreground">폴더 내 미디어를 시간순으로 표시합니다.</p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClickRename}
              disabled={renameMutation.isPending || deleteMutation.isPending}
            >
              폴더명 변경
            </Button>

            {!isSelectMode && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setIsSelectMode(true);
                  setSelectedIds([]);
                }}
                disabled={deleteMutation.isPending}
              >
                삭제 모드
              </Button>
            )}

            {isSelectMode && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={selectAll}
                  disabled={items.length === 0 || deleteMutation.isPending}
                >
                  전체 선택
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearSelection}
                  disabled={selectedIds.length === 0 || deleteMutation.isPending}
                >
                  선택 해제
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onClickDeleteSelected}
                  disabled={selectedIds.length === 0 || deleteMutation.isPending}
                >
                  선택 삭제 ({selectedIds.length})
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsSelectMode(false);
                    setSelectedIds([]);
                  }}
                  disabled={deleteMutation.isPending}
                >
                  취소
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {isSelectMode ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">삭제할 항목을 선택하세요.</p>
          {isLoading ? (
            <MediaGrid items={[]} isLoading />
          ) : items.length === 0 ? (
            <MediaGrid items={[]} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map((item, index) => {
                const selected = selectedSet.has(item.id);
                return (
                  <div key={item.id} className="relative">
                    <MediaCard
                      item={item}
                      index={index}
                      onClick={() => toggleSelect(item.id)}
                    />
                    <div
                      className={`pointer-events-none absolute inset-0 rounded-xl border-2 ${
                        selected ? 'border-destructive bg-destructive/10' : 'border-transparent'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          <MediaGrid items={items} isLoading={isLoading} />
          <MediaLightbox />
        </>
      )}
    </div>
  );
}
