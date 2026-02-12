import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { handleApiError, UnauthorizedError } from '@/lib/errors';

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
