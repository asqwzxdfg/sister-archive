import path from 'path';
import fs from 'fs';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError, NotFoundError, AppError } from '@/lib/errors';
import { PROCESSED_DIR } from '@/lib/constants';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    await requireAuth();
    const { path: parts } = await params;

    const decodedParts = parts.map((part) => decodeURIComponent(part));
    const filePath = path.resolve(PROCESSED_DIR, ...decodedParts);
    const normalizedRoot = path.resolve(PROCESSED_DIR);

    if (!filePath.startsWith(normalizedRoot + path.sep)) {
      throw new AppError('잘못된 파일 경로입니다', 400);
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
        'Content-Type': 'image/webp',
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
