import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { handleApiError, successResponse } from '@/lib/errors';

// GET /api/favorites/check - 检查收藏状态
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const jobIdsParam = searchParams.get('jobIds');

    if (!jobIdsParam) {
      return successResponse({});
    }

    const jobIds = jobIdsParam.split(',').map((id) => id.trim()).filter(Boolean);

    if (jobIds.length === 0) {
      return successResponse({});
    }

    if (jobIds.length > 100) {
      jobIds.length = 100;
    }

    // 查询当前用户对这些岗位的收藏记录
    const favorites = await prisma.favorite.findMany({
      where: {
        userId: user.id,
        jobId: { in: jobIds },
      },
      select: {
        jobId: true,
      },
    });

    // 构建映射 jobId -> boolean
    const favoriteSet = new Set(favorites.map((f) => f.jobId));
    const result: Record<string, boolean> = {};
    for (const jobId of jobIds) {
      result[jobId] = favoriteSet.has(jobId);
    }

    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
