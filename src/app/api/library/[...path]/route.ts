import path from 'path';
import fs from 'fs/promises';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth/session';
import { handleApiError, AppError } from '@/lib/errors';
import { createAuditLog } from '@/lib/audit';
import { resolveOriginalPath, resolveProcessedPath } from '@/lib/storage/paths';
import { registerDeletedMediaTombstone } from '@/lib/media/deleted-tombstone';
import { z } from 'zod';

const renameSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

const bulkDeleteSchema = z.object({
  mediaIds: z.array(z.string()).min(1),
});

function resolveLibraryFolder(parts: string[]) {
  const rootPath = path.resolve(process.env.LIBRARY_ROOT_PATH || '/data');
  const folderPath = parts.map((p) => decodeURIComponent(p));
  const absoluteFolder = path.resolve(rootPath, ...folderPath);
  const folderPrefix = absoluteFolder + path.sep;

  if (!absoluteFolder.startsWith(rootPath + path.sep) && absoluteFolder !== rootPath) {
    throw new AppError('잘못된 경로입니다', 400);
  }

  return { rootPath, folderPath, absoluteFolder, folderPrefix };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    await requireAuth();
    const { path: parts } = await params;
    const { folderPrefix } = resolveLibraryFolder(parts);

    const items = await prisma.media.findMany({
      where: {
        processed: true,
        originalPath: {
          startsWith: folderPrefix,
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const session = await requireRole('OWNER', 'EDITOR');
    const { path: parts } = await params;
    const { rootPath, folderPath, absoluteFolder, folderPrefix } = resolveLibraryFolder(parts);
    if (folderPath.length === 0) {
      throw new AppError('루트 폴더는 이름을 변경할 수 없습니다', 400);
    }

    const body = await request.json();
    const data = renameSchema.parse(body);
    if (data.name.includes('/') || data.name.includes('\\')) {
      throw new AppError('폴더명에는 / 또는 \\ 문자를 사용할 수 없습니다', 400);
    }

    const parentDir = path.dirname(absoluteFolder);
    const renamedFolder = path.resolve(parentDir, data.name);
    if (renamedFolder === absoluteFolder) {
      return Response.json({
        message: '이름이 동일합니다',
        path: folderPath.join('/'),
      });
    }
    if (!renamedFolder.startsWith(rootPath + path.sep)) {
      throw new AppError('잘못된 폴더명입니다', 400);
    }

    const targetExists = await fs.stat(renamedFolder).then(() => true).catch(() => false);
    if (targetExists) {
      throw new AppError('동일한 이름의 폴더가 이미 존재합니다', 409);
    }

    await fs.rename(absoluteFolder, renamedFolder);

    const medias = await prisma.media.findMany({
      where: {
        originalPath: { startsWith: folderPrefix },
      },
      select: { id: true, originalPath: true },
    });

    if (medias.length > 0) {
      await prisma.$transaction(
        medias.map((media) =>
          prisma.media.update({
            where: { id: media.id },
            data: {
              originalPath: path.join(renamedFolder, path.relative(absoluteFolder, media.originalPath)),
            },
          }),
        ),
      );
    }

    const newParts = [...folderPath];
    newParts[newParts.length - 1] = data.name;

    await createAuditLog({
      userId: session.sub,
      action: 'library.rename',
      targetType: 'folder',
      targetId: absoluteFolder,
      metadata: {
        from: folderPath.join('/'),
        to: newParts.join('/'),
      },
    });

    return Response.json({
      message: '폴더명을 변경했습니다',
      path: newParts.join('/'),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const session = await requireRole('OWNER', 'EDITOR');
    const { path: parts } = await params;
    const { absoluteFolder, folderPrefix } = resolveLibraryFolder(parts);
    const body = await request.json();
    const data = bulkDeleteSchema.parse(body);

    const medias = await prisma.media.findMany({
      where: {
        id: { in: data.mediaIds },
        originalPath: { startsWith: folderPrefix },
      },
      select: {
        id: true,
        filename: true,
        hash: true,
        originalPath: true,
        thumbnailPath: true,
        webPath: true,
        posterPath: true,
      },
    });

    if (medias.length === 0) {
      return Response.json({ deletedCount: 0, remainingCount: 0, folderRemoved: false });
    }

    for (const media of medias) {
      for (const filePath of [media.thumbnailPath, media.webPath, media.posterPath]) {
        if (!filePath) continue;
        await fs.unlink(resolveProcessedPath(filePath)).catch(() => {});
      }

      const originalFilePath = media.originalPath.startsWith('uploads/')
        ? resolveProcessedPath(media.originalPath)
        : resolveOriginalPath(media.originalPath);

      try {
        await fs.unlink(originalFilePath);
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code !== 'ENOENT') {
          throw new AppError(`원본 파일 삭제에 실패했습니다: ${media.filename}`, 500);
        }
      }

      await registerDeletedMediaTombstone({
        originalPath: originalFilePath,
        hash: media.hash,
      });

      await prisma.media.delete({ where: { id: media.id } });

      await createAuditLog({
        userId: session.sub,
        action: 'media.delete',
        targetType: 'media',
        targetId: media.id,
        metadata: { filename: media.filename, bulk: true, folder: absoluteFolder },
      });
    }

    const remainingCount = await prisma.media.count({
      where: { originalPath: { startsWith: folderPrefix } },
    });

    let folderRemoved = false;
    if (remainingCount === 0) {
      await fs.rm(absoluteFolder, { recursive: true, force: true }).catch(() => {});
      folderRemoved = true;
    }

    return Response.json({
      deletedCount: medias.length,
      remainingCount,
      folderRemoved,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return handleApiError(error);
  }
}
