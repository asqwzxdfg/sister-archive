import { Queue } from 'bullmq';
import { connection } from './connection';

type ScanJobData = {
  rootPath: string;
  userId: string;
  ignoreDirs?: string[];
};

const globalForQueue = globalThis as unknown as {
  mediaScanQueue: Queue<ScanJobData> | undefined;
};

export const mediaScanQueue =
  globalForQueue.mediaScanQueue ??
  new Queue<ScanJobData>('media-scan', {
    connection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForQueue.mediaScanQueue = mediaScanQueue;

export async function enqueueMediaScan(data: ScanJobData) {
  return mediaScanQueue.add('scan', data);
}
