import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { createAuditLog } from '@/lib/audit';
import { handleApiError, AppError } from '@/lib/errors';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approved: true,
        passwordHash: true,
        avatarPath: true,
      },
    });
    if (!user) {
      throw new AppError('이메일 또는 비밀번호가 올바르지 않습니다', 401);
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new AppError('이메일 또는 비밀번호가 올바르지 않습니다', 401);
    }

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      approved: user.approved,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    await createAuditLog({
      userId: user.id,
      action: 'auth.login',
    });

    const response = Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        approved: user.approved,
        avatarUrl: user.avatarPath ? '/api/auth/avatar' : null,
      },
    });

    const headers = new Headers(response.headers);
    headers.append(
      'Set-Cookie',
      `access_token=${accessToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${15 * 60}`,
    );
    headers.append(
      'Set-Cookie',
      `refresh_token=${refreshToken}; HttpOnly; Path=/api/auth/refresh; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`,
    );

    return new Response(response.body, {
      status: 200,
      headers,
    });
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
