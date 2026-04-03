import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { handleApiError, successResponse, AppError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, newPassword } = body;

    if (!email || !code || !newPassword) {
      throw new AppError(400, '请填写所有必填字段', 'MISSING_FIELDS');
    }

    if (newPassword.length < 6) {
      throw new AppError(400, '密码长度不能少于 6 位', 'INVALID_PASSWORD');
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new AppError(400, '验证码无效或已过期', 'INVALID_RESET_CODE');
    }

    if (!user.isActive) {
      throw new AppError(403, '账号已被禁用，请联系管理员', 'ACCOUNT_DISABLED');
    }

    // 验证重置码
    if (!user.resetCode || user.resetCode !== code.trim()) {
      throw new AppError(400, '验证码无效或已过期', 'INVALID_RESET_CODE');
    }

    // 验证验证码是否过期
    if (!user.resetCodeExpiresAt || new Date(user.resetCodeExpiresAt) < new Date()) {
      // 清除过期的验证码
      await prisma.user.update({
        where: { id: user.id },
        data: { resetCode: null, resetCodeExpiresAt: null },
      });
      throw new AppError(400, '验证码已过期，请重新获取', 'RESET_CODE_EXPIRED');
    }

    // 哈希新密码并更新用户
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetCodeExpiresAt: null,
      },
    });

    return successResponse(null, '密码重置成功');
  } catch (error) {
    return handleApiError(error);
  }
}
