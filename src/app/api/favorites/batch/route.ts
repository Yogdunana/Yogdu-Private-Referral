import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { handleApiError, successResponse, AppError } from '@/lib/errors';

// DELETE /api/favorites/batch - 批量取消收藏
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { jobIds } = body as { jobIds: string[] };

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      throw new AppError(400, '请提供要取消收藏的岗位ID列表', 'MISSING_JOB_IDS');
    }

    if (jobIds.length > 100) {
      throw new AppError(400, '单次最多取消100个收藏', 'TOO_MANY_IDS');
    }

    // 删除所有匹配的收藏
    const result = await prisma.favorite.deleteMany({
      where: {
        userId: user.id,
        jobId: { in: jobIds },
      },
    });

    // 减少每个岗位的收藏数
    for (const jobId of jobIds) {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          favoriteCount: {
            decrement: 1,
          },
        },
      });
    }

    // 确保所有岗位的收藏数不为负数
    const affectedJobs = await prisma.job.findMany({
      where: {
        id: { in: jobIds },
        favoriteCount: { lt: 0 },
      },
      select: { id: true },
    });

    if (affectedJobs.length > 0) {
      await prisma.job.updateMany({
        where: {
          id: { in: affectedJobs.map((j) => j.id) },
        },
        data: { favoriteCount: 0 },
      });
    }

    return successResponse({ count: result.count }, `已取消 ${result.count} 个收藏`);
  } catch (error) {
    return handleApiError(error);
  }
}
