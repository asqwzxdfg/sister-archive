import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/session';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  action: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    await requireRole('OWNER');

    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    const where = params.action ? { action: params.action } : {};

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const hasMore = logs.length > params.limit;
    const items = hasMore ? logs.slice(0, -1) : logs;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return Response.json({
      items: items.map((log) => ({
        id: log.id,
        userId: log.userId,
        userName: log.user?.name ?? null,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
      })),
      nextCursor,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
