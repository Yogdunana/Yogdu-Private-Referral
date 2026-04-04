import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth-helpers';
import { handleApiError, successResponse, AppError } from '@/lib/errors';
import { createAuditLog } from '@/lib/audit';
import { getClientIp } from '@/lib/request';
import { Role, AuditAction } from '@prisma/client';

// GET /api/admin/users - 获取用户列表
export async function GET(request: NextRequest) {
  try {
    await requireRole(Role.ADMIN);

    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || undefined;
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 10));

    // 构建 where 条件
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 查询总数
    const total = await prisma.user.count({ where });

    // 分页查询用户（不返回密码）
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        loginAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/admin/users - 更新用户状态
export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireRole(Role.ADMIN);

    const body = await request.json();
    const { userId, isActive, role } = body as {
      userId: string;
      isActive?: boolean;
      role?: Role;
    };

    if (!userId) {
      throw new AppError(400, '请提供用户ID', 'MISSING_USER_ID');
    }

    if (isActive === undefined && role === undefined) {
      throw new AppError(400, '请提供要更新的字段', 'MISSING_FIELDS');
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new AppError(404, '用户不存在', 'USER_NOT_FOUND');
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {};
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    if (role !== undefined) {
      updateData.role = role;
    }

    // 更新用户
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 创建审计日志
    const clientIp = await getClientIp();
    if (isActive !== undefined) {
      await createAuditLog({
        userId: admin.id,
        action: isActive ? AuditAction.USER_ENABLE : AuditAction.USER_DISABLE,
        detail: { targetUserId: userId, targetUserName: existingUser.name, targetUserEmail: existingUser.email },
        ipAddress: clientIp,
      });
    }

    return successResponse(user, '用户更新成功');
  } catch (error) {
    return handleApiError(error);
  }
}
