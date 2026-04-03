import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth-helpers';
import { successResponse, NotFoundError } from '@/lib/errors';
import { Role } from '@prisma/client';

// PATCH /api/admin/users/[id]/role - 修改用户角色
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole(Role.ADMIN);
    const { id } = await params;
    const body = await request.json();
    const newRole = body.role as Role;

    if (!newRole || !Object.values(Role).includes(newRole)) {
      return NextResponse.json(
        { success: false, error: '无效的角色' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('用户不存在');

    const updated = await prisma.user.update({
      where: { id },
      data: { role: newRole },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'USER_ROLE_CHANGE' as 'USER_ROLE_CHANGE',
        detail: `将用户 ${user.name} (${user.email}) 的角色从 ${user.role} 变更为 ${newRole}`,
      },
    });

    return successResponse(updated, '角色已更新');
  } catch (error) {
    const message = error instanceof Error ? error.message : '服务器内部错误';
    const status = error instanceof NotFoundError ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
