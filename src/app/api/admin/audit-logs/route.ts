import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth-helpers';
import { handleApiError, successResponse } from '@/lib/errors';
import { Role, AuditAction } from '@prisma/client';

// GET /api/admin/audit-logs - 获取审计日志
export async function GET(request: NextRequest) {
  try {
    await requireRole(Role.ADMIN);

    const { searchParams } = new URL(request.url);

    const action = searchParams.get('action') as AuditAction | null;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 10));

    // 构建 where 条件
    const where: Record<string, unknown> = {};

    // 操作类型筛选
    if (action && Object.values(AuditAction).includes(action)) {
      where.action = action;
    }

    // 日期范围筛选
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    // 查询总数
    const total = await prisma.auditLog.count({ where });

    // 分页查询，包含用户名称
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
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
