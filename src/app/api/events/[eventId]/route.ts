import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth/session';
import { createAuditLog } from '@/lib/audit';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { z } from 'zod';

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().nullable().optional(),
  addMediaIds: z.array(z.string()).optional(),
  removeMediaIds: z.array(z.string()).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    await requireAuth();
    const { eventId } = await params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        media: {
          include: {
            media: {
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
                processed: true,
              },
            },
          },
        },
      },
    });

    if (!event) throw new NotFoundError('이벤트를 찾을 수 없습니다');

    return Response.json({
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      coverUrl: event.coverPath ? `/api/media/file/${event.coverPath}` : null,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate?.toISOString() ?? null,
      media: event.media.map((me) => ({
        id: me.media.id,
        type: me.media.type,
        filename: me.media.filename,
        thumbnailUrl: me.media.thumbnailPath ? `/api/media/${me.media.id}/file?type=thumbnail` : null,
        webUrl: me.media.webPath ? `/api/media/${me.media.id}/file?type=web` : null,
        posterUrl: me.media.posterPath ? `/api/media/${me.media.id}/file?type=poster` : null,
        width: me.media.width,
        height: me.media.height,
        capturedAt: me.media.capturedAt?.toISOString() ?? null,
        storyAt: me.media.storyAt?.toISOString() ?? null,
        effectiveDate: (me.media.storyAt ?? me.media.capturedAt ?? me.media.createdAt).toISOString(),
        processed: me.media.processed,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const session = await requireRole('OWNER', 'EDITOR');
    const { eventId } = await params;

    const body = await request.json();
    const data = updateEventSchema.parse(body);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundError('이벤트를 찾을 수 없습니다');

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

    await prisma.event.update({ where: { id: eventId }, data: updateData });

    if (data.addMediaIds?.length) {
      await prisma.mediaEvent.createMany({
        data: data.addMediaIds.map((mediaId) => ({ mediaId, eventId })),
        skipDuplicates: true,
      });
    }

    if (data.removeMediaIds?.length) {
      await prisma.mediaEvent.deleteMany({
        where: { eventId, mediaId: { in: data.removeMediaIds } },
      });
    }

    await createAuditLog({
      userId: session.sub,
      action: 'event.update',
      targetType: 'event',
      targetId: eventId,
      metadata: data,
    });

    return Response.json({ message: '수정되었습니다' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const session = await requireRole('OWNER', 'EDITOR');
    const { eventId } = await params;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundError('이벤트를 찾을 수 없습니다');

    await prisma.event.delete({ where: { id: eventId } });

    await createAuditLog({
      userId: session.sub,
      action: 'event.delete',
      targetType: 'event',
      targetId: eventId,
      metadata: { title: event.title },
    });

    return Response.json({ message: '삭제되었습니다' });
  } catch (error) {
    return handleApiError(error);
  }
}
