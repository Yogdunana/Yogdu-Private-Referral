import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, generateToken } from '@/lib/auth';
import { handleApiError, successResponse, AppError } from '@/lib/errors';
import { createAuditLog } from '@/lib/audit';
import { getClientIp } from '@/lib/request';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      throw new AppError(400, '请提供邮箱和密码', 'MISSING_FIELDS');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new AppError(401, '邮箱或密码错误', 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError(403, '账号已被禁用，请联系管理员', 'ACCOUNT_DISABLED');
    }

    // 检查账号是否被锁定
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMs = new Date(user.lockedUntil).getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
      throw new AppError(
        429,
        `账号已被锁定，请在 ${remainingMinutes} 分钟后重试`,
        'ACCOUNT_LOCKED'
      );
    }

    // 如果锁定时间已过，重置锁定状态
    if (user.lockedUntil && new Date(user.lockedUntil) <= new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lockedUntil: null, loginAttempts: 0 },
      });
    }

    // 验证密码
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      // 密码错误，增加登录尝试次数
      const newAttempts = user.loginAttempts + 1;
      const updateData: {
        loginAttempts: number;
        lockedUntil?: Date;
      } = { loginAttempts: newAttempts };

      // 如果连续失败 >= 3 次，锁定账号 1 小时
      if (newAttempts >= 3) {
        updateData.lockedUntil = new Date(Date.now() + 60 * 60 * 1000);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      const remainingAttempts = 3 - newAttempts;
      if (remainingAttempts > 0) {
        throw new AppError(
          401,
          `邮箱或密码错误，还有 ${remainingAttempts} 次尝试机会`,
          'INVALID_CREDENTIALS'
        );
      } else {
        throw new AppError(
          429,
          '密码错误次数过多，账号已被锁定 1 小时',
          'ACCOUNT_LOCKED'
        );
      }
    }

    // 登录成功：重置登录尝试次数，更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // 生成 JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // 设置 httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    // 创建审计日志（异步，不阻塞响应）
    const clientIp = await getClientIp();
    createAuditLog({
      userId: user.id,
      action: 'USER_LOGIN',
      detail: { message: `用户 ${user.email} 登录成功` },
      ipAddress: clientIp,
    }).catch((err) => {
      console.error('Failed to create audit log:', err);
    });

    return successResponse(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      '登录成功'
    );
  } catch (error) {
    return handleApiError(error);
  }
}
