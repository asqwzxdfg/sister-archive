import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth/session';
import { createAuditLog } from '@/lib/audit';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

const createEventSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  description: z.string().optional(),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  mediaIds: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where = category ? { category } : {};

    const events = await prisma.event.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        _count: { select: { media: true } },
      },
    });

    const mapped = events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      coverUrl: event.coverPath ? `/api/media/file/${event.coverPath}` : null,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate?.toISOString() ?? null,
      mediaCount: event._count.media,
    }));

    return Response.json({ events: mapped });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole('OWNER', 'EDITOR');

    const body = await request.json();
    const data = createEventSchema.parse(body);

    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });

    // Link media if provided
    if (data.mediaIds && data.mediaIds.length > 0) {
      await prisma.mediaEvent.createMany({
        data: data.mediaIds.map((mediaId) => ({
          mediaId,
          eventId: event.id,
        })),
      });
    }

    await createAuditLog({
      userId: session.sub,
      action: 'event.create',
      targetType: 'event',
      targetId: event.id,
      metadata: { title: data.title, category: data.category },
    });

    return Response.json({ id: event.id, message: '이벤트가 생성되었습니다' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return handleApiError(error);
  }
}
