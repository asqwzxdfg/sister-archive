import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

interface AuditEntry {
  userId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function createAuditLog(entry: AuditEntry) {
  return prisma.auditLog.create({
    data: {
      userId: entry.userId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata ?? undefined,
    },
  });
}
