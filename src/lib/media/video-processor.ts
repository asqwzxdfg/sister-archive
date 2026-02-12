import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { THUMBNAIL_SIZE } from '@/lib/constants';
import { getProcessedDir, getThumbnailPath, getPosterPath } from '@/lib/storage/paths';

const execFileAsync = promisify(execFile);

async function extractFrame(videoPath: string, outputPath: string, timestamp = '00:00:01'): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  await execFileAsync('ffmpeg', [
    '-i', videoPath,
    '-ss', timestamp,
    '-vframes', '1',
    '-f', 'image2',
    '-y',
    outputPath,
  ]);
}

export async function generateVideoThumbnail(videoPath: string, mediaId: string): Promise<string> {
  const tempFramePath = path.join(getProcessedDir(), 'temp', `${mediaId}_frame.jpg`);
  const relativePath = getThumbnailPath(mediaId);
  const outputPath = path.join(getProcessedDir(), relativePath);

  await fs.mkdir(path.dirname(tempFramePath), { recursive: true });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  await extractFrame(videoPath, tempFramePath);

  await sharp(tempFramePath)
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 80 })
    .toFile(outputPath);

  await fs.unlink(tempFramePath).catch(() => {});

  return relativePath;
}

export async function generateVideoPoster(videoPath: string, mediaId: string): Promise<string> {
  const tempFramePath = path.join(getProcessedDir(), 'temp', `${mediaId}_poster_frame.jpg`);
  const relativePath = getPosterPath(mediaId);
  const outputPath = path.join(getProcessedDir(), relativePath);

  await fs.mkdir(path.dirname(tempFramePath), { recursive: true });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  await extractFrame(videoPath, tempFramePath);

  await sharp(tempFramePath)
    .resize(1920, 1080, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toFile(outputPath);

  await fs.unlink(tempFramePath).catch(() => {});

  return relativePath;
}

export async function getVideoDimensions(videoPath: string): Promise<{ width: number; height: number } | null> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-select_streams', 'v:0',
      videoPath,
    ]);

    const data = JSON.parse(stdout);
    const stream = data.streams?.[0];
    if (stream?.width && stream?.height) {
      return { width: stream.width, height: stream.height };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getVideoCapturedAt(videoPath: string): Promise<Date | null> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      videoPath,
    ]);

    const data = JSON.parse(stdout);
    const creationTime = data.format?.tags?.creation_time;
    if (creationTime) {
      return new Date(creationTime);
    }
    return null;
  } catch {
    return null;
  }
}
