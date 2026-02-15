import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

const querySchema = z.object({
  year: z.coerce.number().optional(),
  month: z.coerce.number().min(1).max(12).optional(),
  type: z.enum(['PHOTO', 'VIDEO']).optional(),
  eventId: z.string().optional(),
  cursor: z.string().optional(),
  // Clamp to avoid hard failures when clients send oversized limits.
  limit: z.coerce
    .number()
    .min(1)
    .default(40)
    .transform((value) => Math.min(value, 100)),
  sort: z.enum(['newest', 'oldest']).default('newest'),
});

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    const where: Prisma.MediaWhereInput = { processed: true };

    if (params.type) {
      where.type = params.type;
    }

    if (params.eventId) {
      where.events = { some: { eventId: params.eventId } };
    }

    // Year/month filtering using raw SQL via Prisma
    if (params.year || params.month) {
      const conditions: Prisma.MediaWhereInput[] = [];

      if (params.year) {
        conditions.push({
          OR: [
            {
              storyAt: {
                gte: new Date(`${params.year}-01-01T00:00:00+09:00`),
                lt: new Date(`${params.year + 1}-01-01T00:00:00+09:00`),
              },
            },
            {
              storyAt: null,
              capturedAt: {
                gte: new Date(`${params.year}-01-01T00:00:00+09:00`),
                lt: new Date(`${params.year + 1}-01-01T00:00:00+09:00`),
              },
            },
          ],
        });
      }

      if (params.month && params.year) {
        const monthStr = String(params.month).padStart(2, '0');
        const nextMonth = params.month === 12 ? 1 : params.month + 1;
        const nextMonthYear = params.month === 12 ? params.year + 1 : params.year;
        const nextMonthStr = String(nextMonth).padStart(2, '0');

        conditions.length = 0; // Reset for combined year+month
        conditions.push({
          OR: [
            {
              storyAt: {
                gte: new Date(`${params.year}-${monthStr}-01T00:00:00+09:00`),
                lt: new Date(`${nextMonthYear}-${nextMonthStr}-01T00:00:00+09:00`),
              },
            },
            {
              storyAt: null,
              capturedAt: {
                gte: new Date(`${params.year}-${monthStr}-01T00:00:00+09:00`),
                lt: new Date(`${nextMonthYear}-${nextMonthStr}-01T00:00:00+09:00`),
              },
            },
          ],
        });
      }

      if (conditions.length > 0) {
        where.AND = conditions;
      }
    }

    const orderBy: Prisma.MediaOrderByWithRelationInput =
      params.sort === 'newest'
        ? { createdAt: 'desc' }
        : { createdAt: 'asc' };

    const items = await prisma.media.findMany({
      where,
      orderBy,
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
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

    const hasMore = items.length > params.limit;
    const resultItems = hasMore ? items.slice(0, -1) : items;
    const nextCursor = hasMore ? resultItems[resultItems.length - 1].id : null;

    const mapped = resultItems.map((item) => ({
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

    return Response.json({ items: mapped, nextCursor });
  } catch (error) {
    return handleApiError(error);
  }
}
