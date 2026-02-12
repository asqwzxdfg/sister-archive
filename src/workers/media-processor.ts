import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import type { MediaJobData } from '@/lib/queue/types';
import { computeFileHash } from '@/lib/media/hash';
import { extractExif } from '@/lib/media/exif';
import { generateThumbnail, generateWebOptimized, getImageDimensions } from '@/lib/media/image-processor';
import { generateVideoThumbnail, generateVideoPoster, getVideoDimensions, getVideoCapturedAt } from '@/lib/media/video-processor';

const prisma = new PrismaClient();

export async function processMedia(job: Job<MediaJobData>) {
  const { mediaId, filePath, mediaType } = job.data;

  console.log(`[Worker] Processing media ${mediaId} (${mediaType}): ${filePath}`);

  try {
    // Stage 1: Extract metadata
    await job.updateProgress(10);
    let capturedAt: Date | null = null;
    let width: number | null = null;
    let height: number | null = null;

    if (mediaType === 'PHOTO') {
      const exif = await extractExif(filePath);
      capturedAt = exif.capturedAt;
      width = exif.width;
      height = exif.height;

      // Fallback: get dimensions from sharp if EXIF didn't have them
      if (!width || !height) {
        const dims = await getImageDimensions(filePath);
        if (dims) {
          width = dims.width;
          height = dims.height;
        }
      }
    } else {
      capturedAt = await getVideoCapturedAt(filePath);
      const dims = await getVideoDimensions(filePath);
      if (dims) {
        width = dims.width;
        height = dims.height;
      }
    }

    // Stage 2: Hash + duplicate check
    await job.updateProgress(20);
    const hash = await computeFileHash(filePath);

    const existing = await prisma.media.findFirst({
      where: { hash, id: { not: mediaId } },
    });

    if (existing) {
      console.log(`[Worker] Duplicate detected for ${mediaId}, hash: ${hash}`);
      await prisma.media.update({
        where: { id: mediaId },
        data: { hash, processed: true },
      });
      return { status: 'duplicate', existingId: existing.id };
    }

    // Stage 3: Generate thumbnail
    await job.updateProgress(40);
    let thumbnailPath: string;

    if (mediaType === 'PHOTO') {
      thumbnailPath = await generateThumbnail(filePath, mediaId);
    } else {
      thumbnailPath = await generateVideoThumbnail(filePath, mediaId);
    }

    // Stage 4: Web-optimized / poster
    await job.updateProgress(60);
    let webPath: string | null = null;
    let posterPath: string | null = null;

    if (mediaType === 'PHOTO') {
      webPath = await generateWebOptimized(filePath, mediaId);
    } else {
      posterPath = await generateVideoPoster(filePath, mediaId);
    }

    // Stage 5: Update database
    await job.updateProgress(90);
    await prisma.media.update({
      where: { id: mediaId },
      data: {
        hash,
        capturedAt,
        width,
        height,
        thumbnailPath,
        webPath,
        posterPath,
        processed: true,
      },
    });

    await job.updateProgress(100);
    console.log(`[Worker] Completed processing media ${mediaId}`);
    return { status: 'completed' };
  } catch (error) {
    console.error(`[Worker] Failed to process media ${mediaId}:`, error);
    throw error;
  }
}
