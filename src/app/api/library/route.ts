import path from 'path';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError } from '@/lib/errors';

type FolderSummary = {
  path: string;
  name: string;
  photoCount: number;
  videoCount: number;
  totalCount: number;
  coverThumbnail: string | null;
  coverMediaId: string | null;
  coverUpdatedAt: string | null;
};

export async function GET() {
  try {
    await requireAuth();

    const rootPath = path.resolve(process.env.LIBRARY_ROOT_PATH || '/data');

    const media = await prisma.media.findMany({
      where: {
        processed: true,
        originalPath: {
          startsWith: rootPath + path.sep,
        },
      },
      select: {
        id: true,
        type: true,
        originalPath: true,
        thumbnailPath: true,
        updatedAt: true,
        storyAt: true,
        capturedAt: true,
        createdAt: true,
      },
    });

    const folderMap = new Map<string, FolderSummary>();

    for (const item of media) {
      const relativePath = path.relative(rootPath, item.originalPath);
      const dir = path.dirname(relativePath);
      const folderPath = dir === '.' ? '' : dir;

      if (!folderMap.has(folderPath)) {
        const name = folderPath === '' ? '(루트)' : folderPath;
        folderMap.set(folderPath, {
          path: folderPath,
          name,
          photoCount: 0,
          videoCount: 0,
          totalCount: 0,
          coverThumbnail: null,
          coverMediaId: null,
          coverUpdatedAt: null,
        });
      }

      const summary = folderMap.get(folderPath)!;
      if (item.type === 'PHOTO') summary.photoCount += 1;
      else summary.videoCount += 1;
      summary.totalCount += 1;

      if (!summary.coverThumbnail && item.thumbnailPath) {
        summary.coverThumbnail = `/api/media/file/${item.thumbnailPath}`;
        summary.coverMediaId = item.id;
        summary.coverUpdatedAt = item.updatedAt.toISOString();
      }
    }

    const folders = Array.from(folderMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    return Response.json({ folders });
  } catch (error) {
    return handleApiError(error);
  }
}
