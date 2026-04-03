import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth-helpers';
import { handleApiError, successResponse, NotFoundError } from '@/lib/errors';
import { Role, JobStatus, AuditAction } from '@prisma/client';

// POST /api/admin/jobs/[id]/reject - 审核驳回
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole(Role.ADMIN);
    const { id } = await params;
    const body = await request.json();
    const reason = body.reason || '';

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundError('岗位不存在');

    const updated = await prisma.job.update({
      where: { id },
      data: { status: JobStatus.REJECTED, rejectReason: reason },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: AuditAction.JOB_REJECT,
        detail: `驳回岗位: ${job.title}，原因: ${reason}`,
      },
    });

    return successResponse(updated, '已驳回');
  } catch (error) {
    return handleApiError(error);
  }
}
