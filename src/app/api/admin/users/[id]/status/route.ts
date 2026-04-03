import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth-helpers';
import { handleApiError, successResponse, NotFoundError } from '@/lib/errors';
import { Role, AuditAction } from '@prisma/client';

// PATCH /api/admin/users/[id]/status - 启用/禁用用户
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole(Role.ADMIN);
    const { id } = await params;
    const body = await request.json();
    const isActive = body.status;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: '无效的状态' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('用户不存在');

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: isActive ? AuditAction.USER_ENABLE : AuditAction.USER_DISABLE,
        detail: `${isActive ? '启用' : '禁用'}用户: ${user.name} (${user.email})`,
      },
    });

    return successResponse(updated, `已${isActive ? '启用' : '禁用'}该用户`);
  } catch (error) {
    return handleApiError(error);
  }
}
