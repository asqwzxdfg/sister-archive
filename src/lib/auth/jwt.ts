import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import type { Role } from '@prisma/client';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'dev-secret-change-me';
const ACCESS_EXPIRY = (process.env.JWT_ACCESS_EXPIRY ?? '15m') as SignOptions['expiresIn'];
const REFRESH_EXPIRY = (process.env.JWT_REFRESH_EXPIRY ?? '7d') as SignOptions['expiresIn'];

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  approved: boolean;
  remember?: boolean;
  type: 'access' | 'refresh';
}

export function signAccessToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'access' }, JWT_SECRET, {
    expiresIn: ACCESS_EXPIRY,
  });
}

const LONG_REFRESH_EXPIRY_SECONDS = 9999 * 24 * 60 * 60;

export function signRefreshToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, {
    expiresIn: payload.remember ? LONG_REFRESH_EXPIRY_SECONDS : REFRESH_EXPIRY,
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
