import { cookies } from 'next/headers';
import { verifyToken, type JwtPayload } from './jwt';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import type { Role } from '@prisma/client';

export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(): Promise<JwtPayload> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  if (!session.approved) throw new ForbiddenError('계정 승인 대기 중입니다');
  return session;
}

export async function requireRole(...roles: Role[]): Promise<JwtPayload> {
  const session = await requireAuth();
  if (!roles.includes(session.role)) throw new ForbiddenError();
  return session;
}

export function getSessionFromRequest(request: Request): JwtPayload | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/access_token=([^;]+)/);
  if (!match) return null;
  return verifyToken(match[1]);
}
