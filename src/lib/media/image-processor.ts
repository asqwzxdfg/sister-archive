import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { THUMBNAIL_SIZE, WEB_OPTIMIZED_MAX } from '@/lib/constants';
import { getProcessedDir, getThumbnailPath, getWebOptimizedPath } from '@/lib/storage/paths';

export async function generateThumbnail(filePath: string, mediaId: string): Promise<string> {
  const relativePath = getThumbnailPath(mediaId);
  const outputPath = path.join(getProcessedDir(), relativePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  await sharp(filePath)
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
      fit: 'cover',
      position: 'attention',
    })
    .webp({ quality: 80 })
    .toFile(outputPath);

  return relativePath;
}

export async function generateWebOptimized(filePath: string, mediaId: string): Promise<string> {
  const relativePath = getWebOptimizedPath(mediaId);
  const outputPath = path.join(getProcessedDir(), relativePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  await sharp(filePath)
    .resize(WEB_OPTIMIZED_MAX, WEB_OPTIMIZED_MAX, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toFile(outputPath);

  return relativePath;
}

export async function getImageDimensions(filePath: string): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await sharp(filePath).metadata();
    if (metadata.width && metadata.height) {
      return { width: metadata.width, height: metadata.height };
    }
    return null;
  } catch {
    return null;
  }
}
