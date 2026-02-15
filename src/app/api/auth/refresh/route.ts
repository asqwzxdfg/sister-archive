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
    const remember = Boolean(payload.remember);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approved: true,
        avatarPath: true,
      },
    });
    if (!user) throw new UnauthorizedError('사용자를 찾을 수 없습니다');

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      approved: user.approved,
      remember,
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
        avatarUrl: user.avatarPath ? '/api/auth/avatar' : null,
      },
    });

    const headers = new Headers(response.headers);
    const accessCookie = [
      `access_token=${accessToken}`,
      'HttpOnly',
      'Path=/',
      'SameSite=Lax',
    ];
    if (remember) {
      accessCookie.push(`Max-Age=${15 * 60}`);
    }
    headers.append('Set-Cookie', accessCookie.join('; '));
    const refreshCookie = [
      `refresh_token=${refreshToken}`,
      'HttpOnly',
      'Path=/api/auth/refresh',
      'SameSite=Lax',
    ];
    if (remember) {
      refreshCookie.push(`Max-Age=${9999 * 24 * 60 * 60}`);
    }
    headers.append('Set-Cookie', refreshCookie.join('; '));

    return new Response(response.body, { status: 200, headers });
  } catch (error) {
    return handleApiError(error);
  }
}
