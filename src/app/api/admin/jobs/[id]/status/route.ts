import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth-helpers';
import { handleApiError, successResponse, NotFoundError } from '@/lib/errors';
import { Role, JobStatus, AuditAction } from '@prisma/client';

// PATCH /api/admin/jobs/[id]/status - 修改岗位状态（上架/下架/恢复）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole(Role.ADMIN);
    const { id } = await params;
    const body = await request.json();
    const newStatus = body.status as JobStatus;

    if (!newStatus || !Object.values(JobStatus).includes(newStatus)) {
      return NextResponse.json(
        { success: false, error: '无效的状态' },
        { status: 400 }
      );
    }

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundError('岗位不存在');

    const updated = await prisma.job.update({
      where: { id },
      data: { status: newStatus },
    });

    const actionMap: Record<string, AuditAction> = {
      TAKEN_DOWN: AuditAction.JOB_TAKE_DOWN,
      APPROVED: AuditAction.JOB_RESTORE,
    };

    const auditAction = actionMap[newStatus];
    if (auditAction) {
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: auditAction,
          detail: `岗位 ${job.title} 状态变更为 ${newStatus}`,
        },
      });
    }

    return successResponse(updated, '状态已更新');
  } catch (error) {
    return handleApiError(error);
  }
}
