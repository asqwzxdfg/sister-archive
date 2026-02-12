import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/session';
import { createAuditLog } from '@/lib/audit';
import { handleApiError, NotFoundError } from '@/lib/errors';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await requireRole('OWNER');
    const { userId } = await params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('사용자를 찾을 수 없습니다');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { approved: true },
      select: { id: true, email: true, name: true, role: true, approved: true },
    });

    await createAuditLog({
      userId: session.sub,
      action: 'user.approve',
      targetType: 'user',
      targetId: userId,
      metadata: { email: user.email },
    });

    return Response.json({ user: updated, message: '승인되었습니다' });
  } catch (error) {
    return handleApiError(error);
  }
}
