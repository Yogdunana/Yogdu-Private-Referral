import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth-helpers';
import { handleApiError, successResponse, NotFoundError, AppError } from '@/lib/errors';
import { createAuditLog } from '@/lib/audit';
import { getClientIp } from '@/lib/request';
import { AuditAction } from '@prisma/client';
import type { JobFormData } from '@/types';

// GET /api/jobs/[id] - 获取岗位详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        contributor: {
          select: { name: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundError('岗位不存在');
    }

    // 增加浏览量
    await prisma.job.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    const now = new Date();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    return successResponse({
      ...job,
      isExpiringSoon:
        new Date(job.deadline).getTime() - now.getTime() < threeDaysMs &&
        new Date(job.deadline) > now,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/jobs/[id] - 更新岗位（需要管理员角色）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN');
    const { id } = await params;

    const existingJob = await prisma.job.findUnique({ where: { id } });
    if (!existingJob) {
      throw new NotFoundError('岗位不存在');
    }

    const body = (await request.json()) as Partial<JobFormData>;

    // 构建更新数据
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.type !== undefined) updateData.type = body.type;
    if (body.location !== undefined) updateData.location = body.location.trim();
    if (body.content !== undefined) updateData.content = body.content.trim();
    if (body.requirements !== undefined) updateData.requirements = body.requirements.trim();
    if (body.researchField !== undefined) updateData.researchField = body.researchField?.trim() || null;
    if (body.businessTrack !== undefined) updateData.businessTrack = body.businessTrack?.trim() || null;
    if (body.bonusPoints !== undefined) updateData.bonusPoints = body.bonusPoints?.trim() || null;
    if (body.workMode !== undefined) updateData.workMode = body.workMode;
    if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail.trim();
    if (body.emailFormat !== undefined) updateData.emailFormat = body.emailFormat.trim();
    if (body.deadline !== undefined) updateData.deadline = new Date(body.deadline);
    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags)) {
        throw new AppError(400, '标签格式不正确', 'INVALID_TAGS');
      }
      updateData.tags = body.tags;
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: updateData,
    });

    // 异步创建审计日志
    const clientIp = await getClientIp();
    createAuditLog({
      action: AuditAction.JOB_EDIT,
      detail: {
        jobId: id,
        jobTitle: updatedJob.title,
        changes: Object.keys(updateData),
      },
      ipAddress: clientIp,
    }).catch((err) => {
      console.error('Failed to create audit log:', err);
    });

    return successResponse(updatedJob, '岗位更新成功');
  } catch (error) {
    return handleApiError(error);
  }
}
