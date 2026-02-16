import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth/session';
import { createAuditLog } from '@/lib/audit';
import { handleApiError, NotFoundError, AppError } from '@/lib/errors';
import { resolveOriginalPath, resolveProcessedPath } from '@/lib/storage/paths';
import { registerDeletedMediaTombstone } from '@/lib/media/deleted-tombstone';
import { z } from 'zod';
import fs from 'fs/promises';

const updateSchema = z.object({
  storyAt: z.string().datetime().nullable().optional(),
  eventIds: z.array(z.string()).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  try {
    await requireAuth();
    const { mediaId } = await params;

    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        events: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                category: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
    });

    if (!media) throw new NotFoundError('미디어를 찾을 수 없습니다');

    return Response.json({
      id: media.id,
      type: media.type,
      filename: media.filename,
      thumbnailUrl: media.thumbnailPath ? `/api/media/${media.id}/file?type=thumbnail` : null,
      webUrl: media.webPath ? `/api/media/${media.id}/file?type=web` : null,
      posterUrl: media.posterPath ? `/api/media/${media.id}/file?type=poster` : null,
      originalUrl: `/api/media/${media.id}/file?type=original`,
      width: media.width,
      height: media.height,
      size: media.size.toString(),
      mimeType: media.mimeType,
      hash: media.hash,
      capturedAt: media.capturedAt?.toISOString() ?? null,
      storyAt: media.storyAt?.toISOString() ?? null,
      effectiveDate: (media.storyAt ?? media.capturedAt ?? media.createdAt).toISOString(),
      processed: media.processed,
      uploadedBy: media.uploadedBy,
      events: media.events.map((me) => ({
        id: me.event.id,
        title: me.event.title,
        category: me.event.category,
        startDate: me.event.startDate.toISOString(),
        endDate: me.event.endDate?.toISOString() ?? null,
      })),
      createdAt: media.createdAt.toISOString(),
      updatedAt: media.updatedAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  try {
    const session = await requireRole('OWNER', 'EDITOR');
    const { mediaId } = await params;

    const body = await request.json();
    const data = updateSchema.parse(body);

    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundError('미디어를 찾을 수 없습니다');

    const updateData: Record<string, unknown> = {};
    if (data.storyAt !== undefined) {
      updateData.storyAt = data.storyAt ? new Date(data.storyAt) : null;
    }

    const updated = await prisma.media.update({
      where: { id: mediaId },
      data: updateData,
    });

    // Update event associations if provided
    if (data.eventIds !== undefined) {
      await prisma.mediaEvent.deleteMany({ where: { mediaId } });
      if (data.eventIds.length > 0) {
        await prisma.mediaEvent.createMany({
          data: data.eventIds.map((eventId) => ({ mediaId, eventId })),
        });
      }
    }

    await createAuditLog({
      userId: session.sub,
      action: 'media.update',
      targetType: 'media',
      targetId: mediaId,
      metadata: data,
    });

    return Response.json({ id: updated.id, message: '수정되었습니다' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  try {
    const session = await requireRole('OWNER', 'EDITOR');
    const { mediaId } = await params;

    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundError('미디어를 찾을 수 없습니다');

    // Delete processed files (best effort)
    for (const filePath of [media.thumbnailPath, media.webPath, media.posterPath]) {
      if (filePath) {
        await fs.unlink(resolveProcessedPath(filePath)).catch(() => {});
      }
    }

    // Original file must be removed so it cannot be re-discovered by scans.
    const originalFilePath = media.originalPath.startsWith('uploads/')
      ? resolveProcessedPath(media.originalPath)
      : resolveOriginalPath(media.originalPath);

    try {
      await fs.unlink(originalFilePath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        throw new AppError('원본 파일 삭제에 실패했습니다. 권한/경로를 확인해주세요.', 500);
      }
    }

    await registerDeletedMediaTombstone({
      originalPath: originalFilePath,
      hash: media.hash,
    });

    await prisma.media.delete({ where: { id: mediaId } });

    await createAuditLog({
      userId: session.sub,
      action: 'media.delete',
      targetType: 'media',
      targetId: mediaId,
      metadata: { filename: media.filename },
    });

    return Response.json({ message: '삭제되었습니다' });
  } catch (error) {
    return handleApiError(error);
  }
}
