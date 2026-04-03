import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { handleApiError, successResponse } from '@/lib/errors';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      // 即使缺少字段也返回成功，防止邮箱枚举
      return successResponse(null, '如果该邮箱已注册，重置密码链接已发送');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // 无论用户是否存在都返回成功，防止邮箱枚举攻击
    if (!user) {
      return successResponse(null, '如果该邮箱已注册，重置密码链接已发送');
    }

    if (!user.isActive) {
      return successResponse(null, '如果该邮箱已注册，重置密码链接已发送');
    }

    // 生成 6 位数字验证码
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 分钟后过期

    // 保存验证码到用户记录
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetCode,
        resetCodeExpiresAt,
      },
    });

    // 发送忘记密码邮件（异步，不阻塞响应）
    sendEmail({
      to: user.email,
      type: 'FORGOT_PASSWORD',
      vars: {
        userName: user.name,
        resetCode,
      },
      userId: user.id,
    }).catch((err) => {
      console.error('Failed to send forgot password email:', err);
    });

    return successResponse(null, '如果该邮箱已注册，重置密码链接已发送');
  } catch (error) {
    // 即使出错也返回成功，防止信息泄露
    console.error('Forgot password error:', error);
    return successResponse(null, '如果该邮箱已注册，重置密码链接已发送');
  }
}
