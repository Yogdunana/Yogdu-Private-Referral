import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth-helpers';
import { handleApiError, successResponse, NotFoundError } from '@/lib/errors';
import { Role, AuditAction } from '@prisma/client';

// PATCH /api/invite-codes/[id]/toggle - 启用/禁用邀请码
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole(Role.ADMIN);
    const { id } = await params;

    const code = await prisma.inviteCode.findUnique({ where: { id } });
    if (!code) throw new NotFoundError('邀请码不存在');

    const updated = await prisma.inviteCode.update({
      where: { id },
      data: { isActive: !code.isActive },
    });

    if (!code.isActive) {
      // 之前是禁用的，现在启用了 - 不记录审计日志
    } else {
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: AuditAction.INVITE_CODE_DISABLE,
          detail: `禁用邀请码: ${code.code}`,
        },
      });
    }

    return successResponse(updated, `已${updated.isActive ? '启用' : '禁用'}`);
  } catch (error) {
    return handleApiError(error);
  }
}
