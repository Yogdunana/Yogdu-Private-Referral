import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth-helpers';
import { handleApiError, successResponse, NotFoundError, AppError } from '@/lib/errors';
import { createAuditLog } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { getClientIp } from '@/lib/request';
import { JobStatus, EmailType, AuditAction } from '@prisma/client';

// POST /api/jobs/[id]/review - 审核岗位（需要管理员角色）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole('ADMIN');
    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        contributor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundError('岗位不存在');
    }

    if (job.status !== JobStatus.PENDING) {
      throw new AppError(400, '该岗位不在待审核状态', 'INVALID_STATUS');
    }

    const body = await request.json();
    const { action, reason } = body as { action: 'approve' | 'reject'; reason?: string };

    if (action !== 'approve' && action !== 'reject') {
      throw new AppError(400, '审核操作只能是 approve 或 reject', 'INVALID_ACTION');
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    const reviewTime = new Date().toLocaleString('zh-CN');

    if (action === 'approve') {
      // 通过审核
      await prisma.job.update({
        where: { id },
        data: { status: JobStatus.APPROVED },
      });

      // 通知贡献者
      sendEmail({
        to: job.contributor.email,
        type: EmailType.REVIEW_APPROVED,
        vars: {
          name: job.contributor.name,
          jobTitle: job.title,
          reviewTime,
          jobUrl: `${siteUrl}/jobs/${id}`,
        },
        userId: job.contributor.id,
      }).catch((err) => {
        console.error(`发送审核通过邮件失败 [${job.contributor.email}]:`, err);
      });

      // 异步创建审计日志
      const clientIp = await getClientIp();
      createAuditLog({
        userId: admin.id,
        action: AuditAction.JOB_APPROVE,
        detail: { jobId: id, jobTitle: job.title },
        ipAddress: clientIp,
      }).catch((err) => {
        console.error('Failed to create audit log:', err);
      });

      return successResponse(null, '岗位审核通过');
    } else {
      // 拒绝审核
      if (!reason || reason.trim().length === 0) {
        throw new AppError(400, '拒绝审核时必须提供拒绝原因', 'MISSING_REASON');
      }

      await prisma.job.update({
        where: { id },
        data: {
          status: JobStatus.REJECTED,
          rejectReason: reason.trim(),
        },
      });

      // 通知贡献者
      sendEmail({
        to: job.contributor.email,
        type: EmailType.REVIEW_REJECTED,
        vars: {
          name: job.contributor.name,
          jobTitle: job.title,
          reviewTime,
          rejectReason: reason.trim(),
        },
        userId: job.contributor.id,
      }).catch((err) => {
        console.error(`发送审核拒绝邮件失败 [${job.contributor.email}]:`, err);
      });

      // 异步创建审计日志
      const clientIp = await getClientIp();
      createAuditLog({
        userId: admin.id,
        action: AuditAction.JOB_REJECT,
        detail: { jobId: id, jobTitle: job.title, reason: reason.trim() },
        ipAddress: clientIp,
      }).catch((err) => {
        console.error('Failed to create audit log:', err);
      });

      return successResponse(null, '岗位已拒绝');
    }
  } catch (error) {
    return handleApiError(error);
  }
}
