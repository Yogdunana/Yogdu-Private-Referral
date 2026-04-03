import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth-helpers';
import { handleApiError, successResponse } from '@/lib/errors';
import { Role, EmailType } from '@prisma/client';

// GET /api/admin/email-logs - 获取邮件发送日志
export async function GET(request: NextRequest) {
  try {
    await requireRole(Role.ADMIN);

    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type') as EmailType | null;
    const status = searchParams.get('status') || undefined;
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 10));

    // 构建 where 条件
    const where: Record<string, unknown> = {};

    // 类型筛选
    if (type && Object.values(EmailType).includes(type)) {
      where.type = type;
    }

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 查询总数
    const total = await prisma.emailLog.count({ where });

    // 分页查询
    const logs = await prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return successResponse({
      data: logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
