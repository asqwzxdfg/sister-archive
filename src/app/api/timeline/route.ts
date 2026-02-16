import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError } from '@/lib/errors';

export async function GET() {
  try {
    await requireAuth();

    const media = await prisma.media.findMany({
      where: { processed: true },
      select: {
        id: true,
        type: true,
        thumbnailPath: true,
        storyAt: true,
        capturedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const yearMap = new Map<number, {
      photoCount: number;
      videoCount: number;
      coverThumbnail: string | null;
      coverMediaId: string | null;
      coverUpdatedAt: string | null;
      months: Map<number, {
        photoCount: number;
        videoCount: number;
        coverThumbnail: string | null;
        coverMediaId: string | null;
        coverUpdatedAt: string | null;
      }>;
    }>();
    let undatedCount = 0;

    for (const item of media) {
      const effectiveDate = item.storyAt ?? item.capturedAt;
      if (!effectiveDate) {
        undatedCount += 1;
        continue;
      }
      const date = new Date(effectiveDate);
      // Force Asia/Seoul timezone
      const seoulDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
      const year = seoulDate.getFullYear();
      const month = seoulDate.getMonth() + 1;

      if (!yearMap.has(year)) {
        yearMap.set(year, {
          photoCount: 0,
          videoCount: 0,
          coverThumbnail: null,
          coverMediaId: null,
          coverUpdatedAt: null,
          months: new Map(),
        });
      }

      const yearData = yearMap.get(year)!;
      if (item.type === 'PHOTO') yearData.photoCount++;
      else yearData.videoCount++;

      if (!yearData.coverThumbnail && item.thumbnailPath) {
        yearData.coverThumbnail = `/api/media/file/${item.thumbnailPath}`;
        yearData.coverMediaId = item.id;
        yearData.coverUpdatedAt = item.updatedAt.toISOString();
      }

      if (!yearData.months.has(month)) {
        yearData.months.set(month, {
          photoCount: 0,
          videoCount: 0,
          coverThumbnail: null,
          coverMediaId: null,
          coverUpdatedAt: null,
        });
      }

      const monthData = yearData.months.get(month)!;
      if (item.type === 'PHOTO') monthData.photoCount++;
      else monthData.videoCount++;

      if (!monthData.coverThumbnail && item.thumbnailPath) {
        monthData.coverThumbnail = `/api/media/file/${item.thumbnailPath}`;
        monthData.coverMediaId = item.id;
        monthData.coverUpdatedAt = item.updatedAt.toISOString();
      }
    }

    const years = Array.from(yearMap.entries())
      .map(([year, data]) => ({
        year,
        photoCount: data.photoCount,
        videoCount: data.videoCount,
        coverThumbnail: data.coverThumbnail,
        coverMediaId: data.coverMediaId,
        coverUpdatedAt: data.coverUpdatedAt,
        months: Array.from(data.months.entries())
          .map(([month, mData]) => ({
            month,
            photoCount: mData.photoCount,
            videoCount: mData.videoCount,
            coverThumbnail: mData.coverThumbnail,
            coverMediaId: mData.coverMediaId,
            coverUpdatedAt: mData.coverUpdatedAt,
          }))
          .sort((a, b) => a.month - b.month),
      }))
      .sort((a, b) => b.year - a.year);

    return Response.json({ years, undatedCount });
  } catch (error) {
    return handleApiError(error);
  }
}
