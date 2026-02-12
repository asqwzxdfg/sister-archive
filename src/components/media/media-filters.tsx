'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Film, LayoutGrid } from 'lucide-react';

interface MediaFiltersProps {
  currentFilter: 'all' | 'PHOTO' | 'VIDEO';
  onFilterChange: (filter: 'all' | 'PHOTO' | 'VIDEO') => void;
}

export function MediaFilters({ currentFilter, onFilterChange }: MediaFiltersProps) {
  return (
    <Tabs value={currentFilter} onValueChange={(v) => onFilterChange(v as 'all' | 'PHOTO' | 'VIDEO')}>
      <TabsList>
        <TabsTrigger value="all" className="gap-1.5">
          <LayoutGrid className="h-3.5 w-3.5" />
          전체
        </TabsTrigger>
        <TabsTrigger value="PHOTO" className="gap-1.5">
          <Camera className="h-3.5 w-3.5" />
          사진
        </TabsTrigger>
        <TabsTrigger value="VIDEO" className="gap-1.5">
          <Film className="h-3.5 w-3.5" />
          영상
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
