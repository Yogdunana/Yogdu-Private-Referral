import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { handleApiError, successResponse, AppError } from '@/lib/errors';
import { JobType, WorkMode, JobStatus } from '@prisma/client';

// GET /api/favorites - 获取当前用户的收藏列表
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);

    const keyword = searchParams.get('keyword') || undefined;
    const type = searchParams.get('type') as JobType | null;
    const location = searchParams.get('location') || undefined;
    const workMode = searchParams.get('workMode') as WorkMode | null;
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 10));

    // 构建收藏的 where 条件
    const favoriteWhere: Record<string, unknown> = {
      userId: user.id,
    };

    // 构建关联岗位的过滤条件
    const jobFilter: Record<string, unknown> = {};

    if (keyword) {
      jobFilter.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } },
        { requirements: { contains: keyword, mode: 'insensitive' } },
        { location: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    if (type && Object.values(JobType).includes(type)) {
      jobFilter.type = type;
    }

    if (location) {
      jobFilter.location = { contains: location, mode: 'insensitive' };
    }

    if (workMode && Object.values(WorkMode).includes(workMode)) {
      jobFilter.workMode = workMode;
    }

    if (Object.keys(jobFilter).length > 0) {
      favoriteWhere.job = jobFilter;
    }

    // 查询总数
    const total = await prisma.favorite.count({ where: favoriteWhere });

    // 分页查询收藏及关联岗位
    const favorites = await prisma.favorite.findMany({
      where: favoriteWhere,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        job: true,
      },
    });

    // 为每个岗位标记不可用状态
    const data = favorites.map((fav) => {
      const job = fav.job;
      let isUnavailable = false;
      let reason: string | undefined;

      if (job.status === JobStatus.REJECTED) {
        isUnavailable = true;
        reason = job.rejectReason || '该岗位已被拒绝';
      } else if (job.status === JobStatus.TAKEN_DOWN) {
        isUnavailable = true;
        reason = '该岗位已下架';
      } else if (job.status === JobStatus.EXPIRED) {
        isUnavailable = true;
        reason = '该岗位已过期';
      } else if (job.status === JobStatus.PENDING) {
        isUnavailable = true;
        reason = '该岗位正在审核中';
      }

      return {
        id: fav.id,
        createdAt: fav.createdAt,
        job: {
          ...job,
          isUnavailable,
          reason,
        },
      };
    });

    return successResponse({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/favorites - 添加收藏
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { jobId } = body as { jobId: string };

    if (!jobId) {
      throw new AppError(400, '请提供岗位ID', 'MISSING_JOB_ID');
    }

    // 检查岗位是否存在
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new AppError(404, '岗位不存在', 'JOB_NOT_FOUND');
    }

    // 创建收藏（利用 unique 约束自动去重）
    const favorite = await prisma.favorite.create({
      data: {
        userId: user.id,
        jobId,
      },
    });

    // 增加收藏数
    await prisma.job.update({
      where: { id: jobId },
      data: { favoriteCount: { increment: 1 } },
    });

    return successResponse(favorite, '收藏成功');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/favorites - 取消收藏
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { jobId } = body as { jobId: string };

    if (!jobId) {
      throw new AppError(400, '请提供岗位ID', 'MISSING_JOB_ID');
    }

    // 删除收藏
    const favorite = await prisma.favorite.deleteMany({
      where: {
        userId: user.id,
        jobId,
      },
    });

    if (favorite.count === 0) {
      throw new AppError(404, '收藏不存在', 'FAVORITE_NOT_FOUND');
    }

    // 减少收藏数（最小为0）
    await prisma.job.update({
      where: { id: jobId },
      data: {
        favoriteCount: {
          decrement: 1,
        },
      },
    });

    // 确保收藏数不为负数
    const updatedJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: { favoriteCount: true },
    });

    if (updatedJob && updatedJob.favoriteCount < 0) {
      await prisma.job.update({
        where: { id: jobId },
        data: { favoriteCount: 0 },
      });
    }

    return successResponse(null, '取消收藏成功');
  } catch (error) {
    return handleApiError(error);
  }
}
