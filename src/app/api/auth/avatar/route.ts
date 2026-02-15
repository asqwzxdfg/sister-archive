import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { resolveProcessedPath, getProcessedDir } from '@/lib/storage/paths';
import { handleApiError, AppError, NotFoundError } from '@/lib/errors';
import sharp from 'sharp';
import { mkdir, readFile, unlink } from 'fs/promises';
import path from 'path';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_SIZE = 256;

export async function GET() {
  try {
    const session = await requireAuth();
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { avatarPath: true },
    });

    if (!user?.avatarPath) throw new NotFoundError('아바타가 없습니다');

    const filePath = resolveProcessedPath(user.avatarPath);
    const file = await readFile(filePath);

    return new Response(file, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file !== 'object' || !('arrayBuffer' in file)) {
      throw new AppError('파일이 필요합니다', 400);
    }

    const typedFile = file as File;
    if (!ACCEPTED_TYPES.includes(typedFile.type)) {
      throw new AppError('이미지 파일(jpg/png/webp)만 업로드할 수 있습니다', 400);
    }

    const buffer = Buffer.from(await typedFile.arrayBuffer());
    const avatarDir = path.join(getProcessedDir(), 'avatars');
    await mkdir(avatarDir, { recursive: true });

    const relativePath = `avatars/${session.sub}.webp`;
    const outputPath = path.join(avatarDir, `${session.sub}.webp`);

    await sharp(buffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
      .webp({ quality: 82 })
      .toFile(outputPath);

    await prisma.user.update({
      where: { id: session.sub },
      data: { avatarPath: relativePath },
    });

    return Response.json({
      avatarUrl: '/api/auth/avatar',
      message: '아바타가 업데이트되었습니다',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const session = await requireAuth();
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { avatarPath: true },
    });

    if (!user?.avatarPath) {
      return Response.json({ message: '아바타가 없습니다' });
    }

    await prisma.user.update({
      where: { id: session.sub },
      data: { avatarPath: null },
    });

    const filePath = resolveProcessedPath(user.avatarPath);
    await unlink(filePath).catch(() => {});

    return Response.json({ message: '아바타가 삭제되었습니다' });
  } catch (error) {
    return handleApiError(error);
  }
}
