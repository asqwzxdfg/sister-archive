import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/session';
import { createAuditLog } from '@/lib/audit';
import { handleApiError, NotFoundError, AppError } from '@/lib/errors';
import { z } from 'zod';

const updateUserSchema = z.object({
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']).optional(),
  approved: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await requireRole('OWNER');
    const { userId } = await params;

    const body = await request.json();
    const data = updateUserSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('사용자를 찾을 수 없습니다');

    if (userId === session.sub && data.role && data.role !== 'OWNER') {
      throw new AppError('자신의 OWNER 권한은 변경할 수 없습니다', 400);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, name: true, role: true, approved: true },
    });

    await createAuditLog({
      userId: session.sub,
      action: data.approved !== undefined ? 'user.approve' : 'user.update',
      targetType: 'user',
      targetId: userId,
      metadata: data,
    });

    return Response.json({ user: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await requireRole('OWNER');
    const { userId } = await params;

    if (userId === session.sub) {
      throw new AppError('자신의 계정은 삭제할 수 없습니다', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('사용자를 찾을 수 없습니다');

    await prisma.user.delete({ where: { id: userId } });

    await createAuditLog({
      userId: session.sub,
      action: 'user.delete',
      targetType: 'user',
      targetId: userId,
      metadata: { email: user.email },
    });

    return Response.json({ message: '삭제되었습니다' });
  } catch (error) {
    return handleApiError(error);
  }
}
