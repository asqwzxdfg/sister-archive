import { Queue } from 'bullmq';
import { connection } from './connection';
import type { MediaJobData } from './types';

const globalForQueue = globalThis as unknown as {
  mediaQueue: Queue<MediaJobData> | undefined;
};

export const mediaQueue =
  globalForQueue.mediaQueue ??
  new Queue<MediaJobData>('media-processing', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForQueue.mediaQueue = mediaQueue;

export async function enqueueMediaProcessing(data: MediaJobData) {
  return mediaQueue.add('process', data);
}
