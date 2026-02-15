import fs from 'fs/promises';
import path from 'path';
import type { PrismaClient } from '@prisma/client';
import { enqueueMediaProcessing } from '@/lib/queue/media-queue';
import { computeFileHash } from '@/lib/media/hash';
import { PROCESSED_DIR } from '@/lib/constants';

type ScanCacheEntry = {
  size: number;
  mtimeMs: number;
};

type ScanCache = Record<string, ScanCacheEntry>;

type ScanResult = {
  totalFiles: number;
  created: number;
  updated: number;
  skippedUnchanged: number;
  skippedUnsupported: number;
  skippedDuplicate: number;
  errors: number;
};

type ScanOptions = {
  rootPath: string;
  userId: string;
  ignoreDirs?: string[];
};

const EXT_TO_MIME: Record<string, { mimeType: string; mediaType: 'PHOTO' | 'VIDEO' }> = {
  '.jpg': { mimeType: 'image/jpeg', mediaType: 'PHOTO' },
  '.jpeg': { mimeType: 'image/jpeg', mediaType: 'PHOTO' },
  '.png': { mimeType: 'image/png', mediaType: 'PHOTO' },
  '.webp': { mimeType: 'image/webp', mediaType: 'PHOTO' },
  '.mp4': { mimeType: 'video/mp4', mediaType: 'VIDEO' },
  '.mov': { mimeType: 'video/quicktime', mediaType: 'VIDEO' },
};

const CACHE_PATH = path.join(PROCESSED_DIR, 'scan-cache.json');

async function loadCache(): Promise<ScanCache> {
  try {
    const raw = await fs.readFile(CACHE_PATH, 'utf8');
    return JSON.parse(raw) as ScanCache;
  } catch {
    return {};
  }
}

async function saveCache(cache: ScanCache): Promise<void> {
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache), 'utf8');
}

export async function scanAndRegisterLocalMedia(
  prisma: PrismaClient,
  options: ScanOptions,
): Promise<ScanResult> {
  const rootPath = path.resolve(options.rootPath);
  const ignore = new Set(
    (options.ignoreDirs || []).map((dir) => path.resolve(dir)),
  );
  ignore.add(path.resolve(rootPath, 'lost+found'));

  const result: ScanResult = {
    totalFiles: 0,
    created: 0,
    updated: 0,
    skippedUnchanged: 0,
    skippedUnsupported: 0,
    skippedDuplicate: 0,
    errors: 0,
  };

  const cache = await loadCache();

  const existing = await prisma.media.findMany({
    select: {
      id: true,
      originalPath: true,
      hash: true,
      size: true,
      uploadedById: true,
    },
  });

  const existingByPath = new Map<string, typeof existing[number]>();
  const existingByHash = new Map<string, string>();

  for (const item of existing) {
    existingByPath.set(item.originalPath, item);
    existingByHash.set(item.hash, item.id);
  }

  const stack = [rootPath];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) continue;

    const resolvedDir = path.resolve(currentDir);
    if (ignore.has(resolvedDir)) continue;

    let entries;
    try {
      entries = await fs.readdir(resolvedDir, { withFileTypes: true });
    } catch {
      result.errors += 1;
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(resolvedDir, entry.name);
      const resolvedPath = path.resolve(fullPath);

      if (entry.isDirectory()) {
        if (ignore.has(resolvedPath)) continue;
        stack.push(resolvedPath);
        continue;
      }

      if (!entry.isFile()) continue;

      result.totalFiles += 1;

      const ext = path.extname(entry.name).toLowerCase();
      const mapping = EXT_TO_MIME[ext];
      if (!mapping) {
        result.skippedUnsupported += 1;
        continue;
      }

      let stat;
      try {
        stat = await fs.stat(resolvedPath);
      } catch {
        result.errors += 1;
        continue;
      }

      const existingItem = existingByPath.get(resolvedPath);
      const cacheEntry = cache[resolvedPath];
      if (
        existingItem &&
        cacheEntry &&
        cacheEntry.size === stat.size &&
        cacheEntry.mtimeMs === stat.mtimeMs
      ) {
        result.skippedUnchanged += 1;
        continue;
      }

      let hash: string;
      try {
        hash = await computeFileHash(resolvedPath);
      } catch {
        result.errors += 1;
        continue;
      }

      const duplicateId = existingByHash.get(hash);
      if (duplicateId && (!existingItem || existingItem.id !== duplicateId)) {
        cache[resolvedPath] = { size: stat.size, mtimeMs: stat.mtimeMs };
        result.skippedDuplicate += 1;
        continue;
      }

      if (existingItem) {
        await prisma.media.update({
          where: { id: existingItem.id },
          data: {
            filename: entry.name,
            originalPath: resolvedPath,
            size: BigInt(stat.size),
            mimeType: mapping.mimeType,
            hash,
            processed: false,
          },
        });

        await enqueueMediaProcessing({
          mediaId: existingItem.id,
          filePath: resolvedPath,
          mediaType: mapping.mediaType,
          uploadedById: existingItem.uploadedById,
        });

        existingByHash.set(hash, existingItem.id);
        result.updated += 1;
      } else {
        const media = await prisma.media.create({
          data: {
            type: mapping.mediaType,
            filename: entry.name,
            originalPath: resolvedPath,
            size: BigInt(stat.size),
            mimeType: mapping.mimeType,
            hash,
            processed: false,
            uploadedById: options.userId,
          },
        });

        await enqueueMediaProcessing({
          mediaId: media.id,
          filePath: resolvedPath,
          mediaType: mapping.mediaType,
          uploadedById: options.userId,
        });

        existingByPath.set(resolvedPath, {
          id: media.id,
          originalPath: resolvedPath,
          hash,
          size: BigInt(stat.size),
          uploadedById: options.userId,
        });
        existingByHash.set(hash, media.id);
        result.created += 1;
      }

      cache[resolvedPath] = { size: stat.size, mtimeMs: stat.mtimeMs };
    }
  }

  await saveCache(cache);
  return result;
}
