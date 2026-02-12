import { Worker } from 'bullmq';
import { processMedia } from '../src/workers/media-processor';

const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');

const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null,
};

console.log('[Worker] Starting media processing worker...');
console.log(`[Worker] Redis: ${redisUrl.hostname}:${redisUrl.port}`);

const worker = new Worker('media-processing', processMedia, {
  connection,
  concurrency: 3,
});

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed for media ${job.data.mediaId}`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[Worker] Worker error:', err);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('[Worker] Shutting down...');
  await worker.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('[Worker] Worker is ready and waiting for jobs.');
