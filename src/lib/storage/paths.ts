import path from 'path';
import { PROCESSED_DIR, SOURCE_PHOTO_DIR, SOURCE_VIDEO_DIR } from '@/lib/constants';

export function getProcessedDir(): string {
  return PROCESSED_DIR;
}

export function getSourcePhotoDir(): string {
  return SOURCE_PHOTO_DIR;
}

export function getSourceVideoDir(): string {
  return SOURCE_VIDEO_DIR;
}

export function resolveProcessedPath(relativePath: string): string {
  return path.join(PROCESSED_DIR, relativePath);
}

export function resolveOriginalPath(relativePath: string): string {
  if (relativePath.startsWith('/')) return relativePath;
  // Determine if it's photo or video based on path prefix
  if (relativePath.startsWith('video/')) {
    return path.join(SOURCE_VIDEO_DIR, relativePath.replace(/^video\//, ''));
  }
  return path.join(SOURCE_PHOTO_DIR, relativePath.replace(/^photo\//, ''));
}

export function getUploadDir(): string {
  return path.join(PROCESSED_DIR, 'uploads');
}

export function getThumbnailPath(mediaId: string): string {
  return `thumbnails/${mediaId}.webp`;
}

export function getWebOptimizedPath(mediaId: string): string {
  return `web/${mediaId}.webp`;
}

export function getPosterPath(mediaId: string): string {
  return `posters/${mediaId}.webp`;
}
