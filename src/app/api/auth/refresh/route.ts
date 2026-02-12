import { prisma } from '@/lib/prisma';
import { verifyToken, signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { handleApiError, UnauthorizedError } from '@/lib/errors';

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/refresh_token=([^;]+)/);
    if (!match) throw new UnauthorizedError('리프레시 토큰이 없습니다');

    const payload = verifyToken(match[1]);
    if (!payload || payload.type !== 'refresh') {
      throw new UnauthorizedError('유효하지 않은 토큰입니다');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedError('사용자를 찾을 수 없습니다');

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      approved: user.approved,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    const response = Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        approved: user.approved,
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

    return new Response(response.body, { status: 200, headers });
  } catch (error) {
    return handleApiError(error);
  }
}
