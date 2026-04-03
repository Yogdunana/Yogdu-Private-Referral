import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { handleApiError, successResponse } from '@/lib/errors';
import { JobStatus } from '@prisma/client';

// GET /api/jobs/cities - 获取所有已审核岗位的城市列表
export async function GET() {
  try {
    const cities = await prisma.job.findMany({
      where: {
        status: JobStatus.APPROVED,
      },
      select: {
        location: true,
      },
      distinct: ['location'],
      orderBy: {
        location: 'asc',
      },
    });

    const cityList = cities.map((c) => c.location);

    return successResponse(cityList);
  } catch (error) {
    return handleApiError(error);
  }
}
