import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { createAuditLog } from '@/lib/audit';
import { handleApiError, ConflictError } from '@/lib/errors';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  name: z.string().min(1, '이름을 입력해주세요').max(50),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError('이미 등록된 이메일입니다');
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        approved: false,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: 'auth.register',
      targetType: 'user',
      targetId: user.id,
    });

    return Response.json(
      {
        message: '회원가입이 완료되었습니다. 관리자 승인을 기다려주세요.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          approved: false,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: error.errors[0].message },
        { status: 400 },
      );
    }
    return handleApiError(error);
  }
}
