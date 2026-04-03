import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth-helpers';
import { handleApiError, successResponse, AppError } from '@/lib/errors';
import { createAuditLog } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { getClientIp } from '@/lib/request';
import { JobType, WorkMode, JobStatus, EmailType, AuditAction } from '@prisma/client';
import type { JobFormData } from '@/types';

// GET /api/jobs - 获取已审核通过的岗位列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const keyword = searchParams.get('keyword') || undefined;
    const type = searchParams.get('type') as JobType | null;
    const location = searchParams.get('location') || undefined;
    const workMode = searchParams.get('workMode') as WorkMode | null;
    const tagsParam = searchParams.get('tags') || undefined;
    const sortBy = (searchParams.get('sortBy') as 'createdAt' | 'deadline') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 10));

    // 构建 where 条件
    const where: Record<string, unknown> = {
      status: JobStatus.APPROVED,
    };

    // 关键词搜索
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } },
        { requirements: { contains: keyword, mode: 'insensitive' } },
        { location: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    // 类型筛选
    if (type && Object.values(JobType).includes(type)) {
      where.type = type;
    }

    // 地点筛选
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    // 工作模式筛选
    if (workMode && Object.values(WorkMode).includes(workMode)) {
      where.workMode = workMode;
    }

    // 标签筛选
    if (tagsParam) {
      const tags = tagsParam.split(',').map((t) => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        where.tags = { hasSome: tags };
      }
    }

    // 排序
    const orderBy: Record<string, string> = {};
    orderBy[sortBy] = sortOrder;

    // 查询总数
    const total = await prisma.job.count({ where });

    // 分页查询
    const jobs = await prisma.job.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const now = new Date();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    // 为每个岗位计算是否即将截止
    const data = jobs.map((job) => ({
      ...job,
      isExpiringSoon: new Date(job.deadline).getTime() - now.getTime() < threeDaysMs && new Date(job.deadline) > now,
    }));

    return successResponse({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/jobs - 创建新岗位（需要贡献者角色）
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('CONTRIBUTOR', 'ADMIN');

    const body = (await request.json()) as JobFormData;

    const {
      title,
      type,
      location,
      content,
      requirements,
      researchField,
      businessTrack,
      bonusPoints,
      workMode,
      contactEmail,
      emailFormat,
      deadline,
      tags,
    } = body;

    // 参数校验
    if (!title || !type || !location || !content || !requirements || !workMode || !contactEmail || !emailFormat || !deadline) {
      throw new AppError(400, '请填写所有必填字段', 'MISSING_FIELDS');
    }

    if (!Array.isArray(tags)) {
      throw new AppError(400, '标签格式不正确', 'INVALID_TAGS');
    }

    const job = await prisma.job.create({
      data: {
        title: title.trim(),
        type,
        location: location.trim(),
        content: content.trim(),
        requirements: requirements.trim(),
        researchField: researchField?.trim() || null,
        businessTrack: businessTrack?.trim() || null,
        bonusPoints: bonusPoints?.trim() || null,
        workMode,
        contactEmail: contactEmail.trim(),
        emailFormat: emailFormat.trim(),
        deadline: new Date(deadline),
        tags,
        status: JobStatus.PENDING,
        contributorId: user.id,
      },
    });

    // 异步发送邮件通知管理员
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true, email: true, name: true },
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    const submitTime = new Date().toLocaleString('zh-CN');

    for (const admin of admins) {
      sendEmail({
        to: admin.email,
        type: EmailType.NEW_SUBMISSION,
        vars: {
          name: admin.name,
          jobTitle: job.title,
          submitTime,
          siteUrl,
        },
        userId: admin.id,
      }).catch((err) => {
        console.error(`发送新提交通知邮件失败 [${admin.email}]:`, err);
      });
    }

    // 异步创建审计日志
    const clientIp = await getClientIp();
    createAuditLog({
      userId: user.id,
      action: AuditAction.JOB_SUBMIT,
      detail: { jobId: job.id, jobTitle: job.title },
      ipAddress: clientIp,
    }).catch((err) => {
      console.error('Failed to create audit log:', err);
    });

    return successResponse(job, '岗位提交成功，等待管理员审核');
  } catch (error) {
    return handleApiError(error);
  }
}
