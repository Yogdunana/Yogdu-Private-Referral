import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/errors';
import { Role } from '@prisma/client';

// GET /api/stats/export - 导出统计数据为CSV
export async function GET() {
  try {
    await requireRole(Role.ADMIN);

    // 查询所有岗位及投稿人名称
    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        contributor: {
          select: { name: true },
        },
      },
    });

    // CSV 表头
    const headers = ['标题', '类型', '地点', '状态', '投稿人', '截止日期', '浏览量', '收藏量', '创建时间'];

    // 状态映射
    const statusMap: Record<string, string> = {
      PENDING: '待审核',
      APPROVED: '已通过',
      REJECTED: '已拒绝',
      EXPIRED: '已过期',
      TAKEN_DOWN: '已下架',
    };

    // 类型映射
    const typeMap: Record<string, string> = {
      DAILY_INTERNSHIP: '日常实习',
      SUMMER_INTERNSHIP: '暑期实习',
      RESEARCH_INTERNSHIP: '科研实习',
      FULL_TIME: '全职',
      OTHER: '其他',
    };

    // 生成 CSV 行
    const rows = jobs.map((job) => {
      const values = [
        job.title,
        typeMap[job.type] || job.type,
        job.location,
        statusMap[job.status] || job.status,
        job.contributor.name,
        job.deadline.toISOString().split('T')[0],
        String(job.viewCount),
        String(job.favoriteCount),
        job.createdAt.toISOString().split('T')[0],
      ];
      // 转义 CSV 中的特殊字符
      return values.map((v) => {
        if (v.includes(',') || v.includes('"') || v.includes('\n')) {
          return `"${v.replace(/"/g, '""')}"`;
        }
        return v;
      }).join(',');
    });

    // 添加 BOM 以支持中文在 Excel 中正确显示
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');

    // 设置响应头
    const filename = `岗位数据导出_${new Date().toISOString().split('T')[0]}.csv`;
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
