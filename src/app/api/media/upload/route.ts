import { requireRole } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { enqueueMediaProcessing } from '@/lib/queue/media-queue';
import { handleApiError, AppError, ConflictError } from '@/lib/errors';
import { computeFileHash } from '@/lib/media/hash';
import { ACCEPTED_IMAGE_TYPES, ACCEPTED_VIDEO_TYPES, MAX_FILE_SIZE } from '@/lib/constants';
import { getUploadDir } from '@/lib/storage/paths';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const session = await requireRole('OWNER', 'EDITOR');

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      throw new AppError('파일이 필요합니다', 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AppError('파일 크기가 500MB를 초과합니다', 400);
    }

    const mimeType = file.type;
    const isImage = ACCEPTED_IMAGE_TYPES.includes(mimeType);
    const isVideo = ACCEPTED_VIDEO_TYPES.includes(mimeType);

    if (!isImage && !isVideo) {
      throw new AppError('지원하지 않는 파일 형식입니다 (jpg, png, webp, mp4, mov)', 400);
    }

    // Save to temp location
    const uploadDir = getUploadDir();
    await fs.mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name) || (isImage ? '.jpg' : '.mp4');
    const tempFilename = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    const tempPath = path.join(uploadDir, tempFilename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempPath, buffer);

    // Compute hash for duplicate detection
    const hash = await computeFileHash(tempPath);

    const existingMedia = await prisma.media.findUnique({ where: { hash } });
    if (existingMedia) {
      await fs.unlink(tempPath).catch(() => {});
      throw new ConflictError('동일한 파일이 이미 존재합니다');
    }

    // Create media record
    const mediaType = isImage ? 'PHOTO' : 'VIDEO';

    const media = await prisma.media.create({
      data: {
        type: mediaType as 'PHOTO' | 'VIDEO',
        filename: file.name,
        originalPath: `uploads/${tempFilename}`,
        size: BigInt(file.size),
        mimeType,
        hash,
        processed: false,
        uploadedById: session.sub,
      },
    });

    // Enqueue processing job
    await enqueueMediaProcessing({
      mediaId: media.id,
      filePath: tempPath,
      mediaType: mediaType as 'PHOTO' | 'VIDEO',
      uploadedById: session.sub,
    });

    await createAuditLog({
      userId: session.sub,
      action: 'media.upload',
      targetType: 'media',
      targetId: media.id,
      metadata: { filename: file.name, mimeType, size: file.size },
    });

    return Response.json(
      {
        id: media.id,
        filename: media.filename,
        type: media.type,
        status: 'processing',
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
