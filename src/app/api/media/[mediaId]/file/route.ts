import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError, NotFoundError, AppError } from '@/lib/errors';
import { resolveProcessedPath, resolveOriginalPath } from '@/lib/storage/paths';
import { PROCESSED_DIR } from '@/lib/constants';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  try {
    await requireAuth();
    const { mediaId } = await params;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'thumbnail';

    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      select: {
        originalPath: true,
        thumbnailPath: true,
        webPath: true,
        posterPath: true,
        mimeType: true,
      },
    });

    if (!media) throw new NotFoundError('미디어를 찾을 수 없습니다');

    let filePath: string;
    let contentType: string;

    switch (type) {
      case 'original':
        filePath = path.join(PROCESSED_DIR, media.originalPath);
        if (!fs.existsSync(filePath)) {
          filePath = resolveOriginalPath(media.originalPath);
        }
        contentType = media.mimeType;
        break;
      case 'thumbnail':
        if (!media.thumbnailPath) throw new NotFoundError('썸네일이 없습니다');
        filePath = resolveProcessedPath(media.thumbnailPath);
        contentType = 'image/webp';
        break;
      case 'web':
        if (!media.webPath) throw new NotFoundError('웹 최적화 이미지가 없습니다');
        filePath = resolveProcessedPath(media.webPath);
        contentType = 'image/webp';
        break;
      case 'poster':
        if (!media.posterPath) throw new NotFoundError('포스터가 없습니다');
        filePath = resolveProcessedPath(media.posterPath);
        contentType = 'image/webp';
        break;
      default:
        throw new AppError('잘못된 파일 타입입니다', 400);
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('파일을 찾을 수 없습니다');
    }

    const stat = fs.statSync(filePath);
    const stream = fs.createReadStream(filePath);

    const readableStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
