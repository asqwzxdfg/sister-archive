import { getSession, requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { handleApiError, UnauthorizedError, AppError } from '@/lib/errors';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { z } from 'zod';

const updateMeSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요').max(50).optional(),
  email: z.string().email('유효한 이메일을 입력해주세요').optional(),
  currentPassword: z.string().min(6, '현재 비밀번호를 입력해주세요').optional(),
  newPassword: z.string().min(6, '새 비밀번호는 6자 이상이어야 합니다').optional(),
}).refine((data) => !data.newPassword || data.currentPassword, {
  message: '현재 비밀번호가 필요합니다',
  path: ['currentPassword'],
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approved: true,
        createdAt: true,
      },
    });

    if (!user) throw new UnauthorizedError('사용자를 찾을 수 없습니다');

    return Response.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = updateMeSchema.parse(body);

    if (!data.name && !data.email && !data.newPassword) {
      throw new AppError('수정할 내용이 없습니다', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    if (!user) throw new UnauthorizedError('사용자를 찾을 수 없습니다');

    if (data.newPassword) {
      const isValid = await verifyPassword(data.currentPassword || '', user.passwordHash);
      if (!isValid) throw new AppError('현재 비밀번호가 올바르지 않습니다', 400);
    }

    const updated = await prisma.user.update({
      where: { id: session.sub },
      data: {
        name: data.name ?? undefined,
        email: data.email ?? undefined,
        passwordHash: data.newPassword ? await hashPassword(data.newPassword) : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approved: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      userId: session.sub,
      action: 'user.self_update',
      targetType: 'user',
      targetId: session.sub,
      metadata: {
        nameChanged: data.name !== undefined,
        emailChanged: data.email !== undefined,
        passwordChanged: data.newPassword !== undefined,
      },
    });

    return Response.json({ user: updated, message: '회원정보가 수정되었습니다' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    if ((error as { code?: string }).code === 'P2002') {
      return Response.json({ error: '이미 사용 중인 이메일입니다' }, { status: 409 });
    }
    return handleApiError(error);
  }
}
