import cron from 'node-cron';
import prisma from './prisma';
import { JobStatus, EmailType } from '@prisma/client';
import { sendEmail } from './email';
import { createAuditLog } from './audit';
import { addDays, format, differenceInHours } from 'date-fns';

export function startCronJobs(): void {
  // Job 1: 每小时检查过期岗位
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();

      const expiredJobs = await prisma.job.findMany({
        where: {
          deadline: { lt: now },
          status: JobStatus.APPROVED,
        },
      });

      if (expiredJobs.length === 0) return;

      const jobIds = expiredJobs.map((job) => job.id);

      await prisma.job.updateMany({
        where: { id: { in: jobIds } },
        data: {
          status: JobStatus.EXPIRED,
          expiredAt: now,
        },
      });

      // 为每个过期岗位创建审计日志
      for (const job of expiredJobs) {
        await createAuditLog({
          userId: job.contributorId,
          action: 'JOB_AUTO_EXPIRE',
          detail: {
            jobId: job.id,
            jobTitle: job.title,
            deadline: job.deadline.toISOString(),
          },
        });

        // 通知收藏了该岗位的用户
        const favorites = await prisma.favorite.findMany({
          where: { jobId: job.id },
          include: { user: true },
        });

        for (const favorite of favorites) {
          sendEmail({
            to: favorite.user.email,
            type: EmailType.JOB_EXPIRED,
            vars: {
              name: favorite.user.name,
              jobTitle: job.title,
              deadline: format(job.deadline, 'yyyy-MM-dd'),
              siteUrl: process.env.NEXT_PUBLIC_APP_URL || '',
            },
            userId: favorite.user.id,
          }).catch(() => {
            // 邮件发送失败不影响主流程
          });
        }
      }

      console.log(`[Cron] 已将 ${expiredJobs.length} 个岗位标记为过期`);
    } catch (error) {
      console.error('[Cron] 过期岗位检查失败:', error);
    }
  });

  // Job 2: 每天 9:00 检查即将过期的岗位（24小时内截止）
  cron.schedule('0 9 * * *', async () => {
    try {
      const now = new Date();
      const oneDayLater = addDays(now, 1);

      const expiringJobs = await prisma.job.findMany({
        where: {
          deadline: { gt: now, lte: oneDayLater },
          status: JobStatus.APPROVED,
        },
      });

      if (expiringJobs.length === 0) return;

      for (const job of expiringJobs) {
        const remainingHours = differenceInHours(job.deadline, now);
        const remainingTime = remainingHours >= 1
          ? `约 ${remainingHours} 小时`
          : '不到 1 小时';

        const favorites = await prisma.favorite.findMany({
          where: { jobId: job.id },
          include: { user: true },
        });

        for (const favorite of favorites) {
          sendEmail({
            to: favorite.user.email,
            type: EmailType.JOB_EXPIRING,
            vars: {
              name: favorite.user.name,
              jobTitle: job.title,
              deadline: format(job.deadline, 'yyyy-MM-dd HH:mm'),
              remainingTime,
              jobUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/jobs/${job.id}`,
            },
            userId: favorite.user.id,
          }).catch(() => {
            // 邮件发送失败不影响主流程
          });
        }
      }

      console.log(`[Cron] 已发送 ${expiringJobs.length} 个即将过期岗位的提醒邮件`);
    } catch (error) {
      console.error('[Cron] 即将过期岗位检查失败:', error);
    }
  });

  console.log('[Cron] 定时任务已启动');
}
