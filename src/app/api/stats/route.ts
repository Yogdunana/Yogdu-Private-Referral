import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth-helpers';
import { handleApiError, successResponse } from '@/lib/errors';
import { JobStatus, Role } from '@prisma/client';
import type { DashboardStats } from '@/types';

// GET /api/stats - 获取仪表盘统计数据
export async function GET(request: NextRequest) {
  try {
    await requireRole(Role.ADMIN);

    const { searchParams } = new URL(request.url);

    // 日期范围，默认最近30天
    const endDateParam = searchParams.get('endDate');
    const startDateParam = searchParams.get('startDate');

    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 并行执行所有查询
    const [
      submissionStatsResult,
      activeCount,
      expiredCount,
      takenDownCount,
      expiringSoonCount,
      userTotal,
      activeRecentCount,
      userByRole,
      topJobs,
      submissionTrendResult,
      reviewTimeResult,
    ] = await Promise.all([
      // a. 投稿统计：按状态分组计数
      prisma.job.groupBy({
        by: ['status'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: { status: true },
      }),

      // b. 岗位统计 - 活跃（已审核通过）
      prisma.job.count({ where: { status: JobStatus.APPROVED } }),

      // b. 岗位统计 - 已过期
      prisma.job.count({ where: { status: JobStatus.EXPIRED } }),

      // b. 岗位统计 - 已下架
      prisma.job.count({ where: { status: JobStatus.TAKEN_DOWN } }),

      // b. 岗位统计 - 即将截止（截止日期在3天内且状态为APPROVED）
      prisma.job.count({
        where: {
          status: JobStatus.APPROVED,
          deadline: {
            gt: new Date(),
            lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // c. 用户统计 - 总数
      prisma.user.count(),

      // c. 用户统计 - 近期活跃（7天内登录）
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // c. 用户统计 - 按角色分组
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),

      // d. Top 10 岗位（按收藏数降序，再按浏览量降序）
      prisma.job.findMany({
        orderBy: [
          { favoriteCount: 'desc' },
          { viewCount: 'desc' },
        ],
        take: 10,
        select: {
          id: true,
          title: true,
          viewCount: true,
          favoriteCount: true,
        },
      }),

      // e. 投稿趋势：按创建日期分组，每天计数
      prisma.job.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: { createdAt: true },
      }),

      // f. 平均审核时间：查询已审核岗位，计算 updatedAt - createdAt 的平均值
      prisma.job.findMany({
        where: {
          status: { in: [JobStatus.APPROVED, JobStatus.REJECTED] },
        },
        select: { createdAt: true, updatedAt: true },
        take: 1000,
      }),
    ]);

    // f. 计算平均审核时间
    const reviewedJobs = reviewTimeResult;
    let avgReviewTime = 0;
    if (reviewedJobs.length > 0) {
      const totalMs = reviewedJobs.reduce((sum, job) => {
        return sum + (job.updatedAt.getTime() - job.createdAt.getTime());
      }, 0);
      avgReviewTime = Math.round(totalMs / reviewedJobs.length / (1000 * 60 * 60)); // 转为小时
    }

    // a. 组装投稿统计
    const submissionStats = {
      total: submissionStatsResult.reduce((sum, item) => sum + item._count.status, 0),
      pending: submissionStatsResult.find((item) => item.status === JobStatus.PENDING)?._count.status || 0,
      approved: submissionStatsResult.find((item) => item.status === JobStatus.APPROVED)?._count.status || 0,
      rejected: submissionStatsResult.find((item) => item.status === JobStatus.REJECTED)?._count.status || 0,
    };

    // c. 组装用户按角色统计
    const byRole = userByRole.map((item) => ({
      role: item.role,
      count: item._count.role,
    }));

    // e. 组装投稿趋势（按日期聚合）
    const trendMap = new Map<string, number>();
    for (const item of submissionTrendResult) {
      const dateStr = item.createdAt.toISOString().split('T')[0];
      trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + item._count.createdAt);
    }

    // 填充日期范围内的所有日期（没有数据的日期补0）
    const submissionTrend: { date: string; count: number }[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      submissionTrend.push({
        date: dateStr,
        count: trendMap.get(dateStr) || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    const stats: DashboardStats = {
      submissionStats,
      jobStats: {
        active: activeCount,
        expired: expiredCount,
        takenDown: takenDownCount,
        expiringSoon: expiringSoonCount,
      },
      userStats: {
        total: userTotal,
        activeRecent: activeRecentCount,
        byRole,
      },
      topJobs,
      submissionTrend,
      avgReviewTime,
    };

    return successResponse(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
