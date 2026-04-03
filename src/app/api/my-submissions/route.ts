import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { handleApiError, successResponse } from '@/lib/errors';
import { JobStatus } from '@prisma/client';

// GET /api/my-submissions - 获取当前用户的提交列表
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') as JobStatus | null;
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 10));

    // 构建 where 条件
    const where: Record<string, unknown> = {
      contributorId: user.id,
    };

    // 状态筛选
    if (status && Object.values(JobStatus).includes(status)) {
      where.status = status;
    }

    // 查询总数
    const total = await prisma.job.count({ where });

    // 分页查询
    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return successResponse({
      data: jobs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
