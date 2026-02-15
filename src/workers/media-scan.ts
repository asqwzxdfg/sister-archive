import { PrismaClient } from '@prisma/client';
import type { Job } from 'bullmq';
import { scanAndRegisterLocalMedia } from '@/lib/media/scan';

const prisma = new PrismaClient();

type ScanJobData = {
  rootPath: string;
  userId: string;
  ignoreDirs?: string[];
};

export async function processMediaScan(job: Job<ScanJobData>) {
  const { rootPath, userId, ignoreDirs } = job.data;
  console.log(`[Worker] Starting media scan: ${rootPath}`);

  const result = await scanAndRegisterLocalMedia(prisma, {
    rootPath,
    userId,
    ignoreDirs,
  });

  console.log('[Worker] Media scan completed:', result);
  return result;
}
