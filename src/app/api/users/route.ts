import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/session';
import { handleApiError } from '@/lib/errors';

export async function GET() {
  try {
    await requireRole('OWNER');

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approved: true,
        createdAt: true,
      },
    });

    return Response.json({ users });
  } catch (error) {
    return handleApiError(error);
  }
}
