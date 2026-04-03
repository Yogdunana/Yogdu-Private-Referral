import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { handleApiError, successResponse } from '@/lib/errors';
import { JobStatus } from '@prisma/client';

// GET /api/jobs/tags - 获取所有已审核岗位的标签列表
export async function GET() {
  try {
    const jobs = await prisma.job.findMany({
      where: {
        status: JobStatus.APPROVED,
      },
      select: {
        tags: true,
      },
    });

    // 扁平化标签数组并去重
    const allTags = jobs.flatMap((job) => job.tags);
    const uniqueTags = [...new Set(allTags)].sort();

    return successResponse(uniqueTags);
  } catch (error) {
    return handleApiError(error);
  }
}
