import { requireRole } from '@/lib/auth/session';
import { enqueueMediaScan } from '@/lib/queue/media-scan-queue';
import { handleApiError } from '@/lib/errors';
import { PROCESSED_DIR } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const session = await requireRole('OWNER');
    const body = await request.json().catch(() => ({}));
    const rootPath = typeof body.rootPath === 'string' ? body.rootPath : '/data';

    const job = await enqueueMediaScan({
      rootPath,
      userId: session.sub,
      ignoreDirs: [PROCESSED_DIR],
    });

    return Response.json({ status: 'queued', jobId: job.id }, { status: 202 });
  } catch (error) {
    return handleApiError(error);
  }
}
