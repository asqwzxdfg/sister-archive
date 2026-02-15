import path from 'path';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError } from '@/lib/errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    await requireAuth();
    const { path: parts } = await params;

    const rootPath = path.resolve(process.env.LIBRARY_ROOT_PATH || '/data');
    const folderPath = parts.map((p) => decodeURIComponent(p));
    const absoluteFolder = path.resolve(rootPath, ...folderPath);

    if (!absoluteFolder.startsWith(rootPath)) {
      return Response.json({ error: '잘못된 경로입니다' }, { status: 400 });
    }

    const items = await prisma.media.findMany({
      where: {
        processed: true,
        originalPath: {
          startsWith: absoluteFolder + path.sep,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        filename: true,
        thumbnailPath: true,
        webPath: true,
        posterPath: true,
        width: true,
        height: true,
        capturedAt: true,
        storyAt: true,
        createdAt: true,
        updatedAt: true,
        processed: true,
      },
    });

    const mapped = items.map((item) => ({
      id: item.id,
      type: item.type,
      filename: item.filename,
      thumbnailUrl: item.thumbnailPath ? `/api/media/${item.id}/file?type=thumbnail` : null,
      webUrl: item.webPath ? `/api/media/${item.id}/file?type=web` : null,
      posterUrl: item.posterPath ? `/api/media/${item.id}/file?type=poster` : null,
      width: item.width,
      height: item.height,
      capturedAt: item.capturedAt?.toISOString() ?? null,
      storyAt: item.storyAt?.toISOString() ?? null,
      effectiveDate: (item.storyAt ?? item.capturedAt ?? item.createdAt).toISOString(),
      processed: item.processed,
      updatedAt: item.updatedAt.toISOString(),
    }));

    return Response.json({ items: mapped });
  } catch (error) {
    return handleApiError(error);
  }
}
