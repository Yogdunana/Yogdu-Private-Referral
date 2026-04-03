import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth-helpers';
import { handleApiError, successResponse } from '@/lib/errors';
import { Role, JobStatus } from '@prisma/client';

// GET /api/admin/jobs - 获取所有岗位列表（管理员视角）
export async function GET(request: NextRequest) {
  try {
    await requireRole(Role.ADMIN);

    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') as JobStatus | null;
    const keyword = searchParams.get('keyword') || undefined;
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 10));

    // 构建 where 条件
    const where: Record<string, unknown> = {};

    // 状态筛选
    if (status && Object.values(JobStatus).includes(status)) {
      where.status = status;
    }

    // 关键词搜索
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } },
        { location: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    // 查询总数
    const total = await prisma.job.count({ where });

    // 分页查询，包含投稿人名称
    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        contributor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
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
