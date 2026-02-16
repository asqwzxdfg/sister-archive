import fs from 'fs';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/session';
import { handleApiError, NotFoundError, AppError } from '@/lib/errors';
import { enqueueMediaProcessing } from '@/lib/queue/media-queue';
import { resolveOriginalPath, resolveProcessedPath } from '@/lib/storage/paths';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  try {
    await requireRole('OWNER', 'EDITOR');
    const { mediaId } = await params;

    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundError('미디어를 찾을 수 없습니다');

    const originalPath = media.originalPath;
    let filePath: string;
    if (originalPath.startsWith('uploads/')) {
      filePath = resolveProcessedPath(originalPath);
    } else {
      filePath = resolveOriginalPath(originalPath);
    }

    if (!fs.existsSync(filePath)) {
      throw new AppError('원본 파일을 찾을 수 없습니다', 404);
    }

    // Remove previous derivatives first so refresh always starts clean.
    for (const processedPath of [media.thumbnailPath, media.webPath, media.posterPath]) {
      if (!processedPath) continue;
      try {
        await fs.promises.unlink(resolveProcessedPath(processedPath));
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code !== 'ENOENT') {
          throw new AppError('기존 썸네일/파생 파일 삭제에 실패했습니다.', 500);
        }
      }
    }

    await prisma.media.update({
      where: { id: mediaId },
      data: {
        processed: false,
        thumbnailPath: null,
        webPath: null,
        posterPath: null,
      },
    });

    await enqueueMediaProcessing({
      mediaId: media.id,
      filePath,
      mediaType: media.type,
      uploadedById: media.uploadedById,
    });

    return Response.json({ message: '재생성이 시작되었습니다' });
  } catch (error) {
    return handleApiError(error);
  }
}
