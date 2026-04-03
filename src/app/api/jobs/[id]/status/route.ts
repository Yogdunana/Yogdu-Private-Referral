import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth-helpers';
import { handleApiError, successResponse, NotFoundError, AppError } from '@/lib/errors';
import { createAuditLog } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { getClientIp } from '@/lib/request';
import { JobStatus, EmailType, AuditAction } from '@prisma/client';

// PATCH /api/jobs/[id]/status - 更新岗位状态（需要管理员角色）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole('ADMIN');
    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundError('岗位不存在');
    }

    const body = await request.json();
    const { status } = body as { status: 'APPROVED' | 'TAKEN_DOWN' };

    if (status !== 'APPROVED' && status !== 'TAKEN_DOWN') {
      throw new AppError(400, '状态值只能是 APPROVED 或 TAKEN_DOWN', 'INVALID_STATUS');
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

    if (status === 'TAKEN_DOWN') {
      // 下架岗位
      await prisma.job.update({
        where: { id },
        data: {
          status: JobStatus.TAKEN_DOWN,
          expiredAt: new Date(),
        },
      });

      // 异步创建审计日志
      const clientIp = await getClientIp();
      createAuditLog({
        userId: admin.id,
        action: AuditAction.JOB_TAKE_DOWN,
        detail: { jobId: id, jobTitle: job.title },
        ipAddress: clientIp,
      }).catch((err) => {
        console.error('Failed to create audit log:', err);
      });

      return successResponse(null, '岗位已下架');
    } else {
      // 恢复岗位
      await prisma.job.update({
        where: { id },
        data: {
          status: JobStatus.APPROVED,
          expiredAt: null,
        },
      });

      // 通知收藏了该岗位的用户
      const favorites = await prisma.favorite.findMany({
        where: { jobId: id },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      for (const fav of favorites) {
        sendEmail({
          to: fav.user.email,
          type: EmailType.JOB_UPDATED,
          vars: {
            name: fav.user.name,
            jobTitle: job.title,
            updateTime: new Date().toLocaleString('zh-CN'),
            jobUrl: `${siteUrl}/jobs/${id}`,
          },
          userId: fav.user.id,
        }).catch((err) => {
          console.error(`发送岗位恢复通知邮件失败 [${fav.user.email}]:`, err);
        });
      }

      // 异步创建审计日志
      const clientIp = await getClientIp();
      createAuditLog({
        userId: admin.id,
        action: AuditAction.JOB_RESTORE,
        detail: { jobId: id, jobTitle: job.title },
        ipAddress: clientIp,
      }).catch((err) => {
        console.error('Failed to create audit log:', err);
      });

      return successResponse(null, '岗位已恢复');
    }
  } catch (error) {
    return handleApiError(error);
  }
}
