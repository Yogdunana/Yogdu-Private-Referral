import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth-helpers';
import { handleApiError, successResponse, NotFoundError } from '@/lib/errors';
import { Role, JobStatus, AuditAction } from '@prisma/client';

// POST /api/admin/jobs/[id]/approve - 审核通过
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole(Role.ADMIN);
    const { id } = await params;

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundError('岗位不存在');

    const updated = await prisma.job.update({
      where: { id },
      data: { status: JobStatus.APPROVED, rejectReason: null },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: AuditAction.JOB_APPROVE,
        detail: `审核通过岗位: ${job.title}`,
      },
    });

    return successResponse(updated, '审核通过');
  } catch (error) {
    return handleApiError(error);
  }
}
