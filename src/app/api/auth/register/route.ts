import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { handleApiError, successResponse, AppError } from '@/lib/errors';
import { createAuditLog } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { getClientIp } from '@/lib/request';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, inviteCode } = body;

    if (!name || !email || !password || !inviteCode) {
      throw new AppError(400, '请填写所有必填字段', 'MISSING_FIELDS');
    }

    if (password.length < 6) {
      throw new AppError(400, '密码长度不能少于 6 位', 'INVALID_PASSWORD');
    }

    // 验证邀请码
    const code = await prisma.inviteCode.findUnique({
      where: { code: inviteCode.trim() },
    });

    if (!code) {
      throw new AppError(400, '邀请码不存在', 'INVALID_INVITE_CODE');
    }

    if (!code.isActive) {
      throw new AppError(400, '邀请码已被禁用', 'INVALID_INVITE_CODE');
    }

    if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
      throw new AppError(400, '邀请码已过期', 'INVALID_INVITE_CODE');
    }

    if (code.usedCount >= code.maxUses) {
      throw new AppError(400, '邀请码已达到最大使用次数', 'INVALID_INVITE_CODE');
    }

    // 检查邮箱是否已注册
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new AppError(409, '该邮箱已被注册', 'EMAIL_ALREADY_EXISTS');
    }

    // 哈希密码
    const hashedPassword = await hashPassword(password);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'USER',
      },
    });

    // 增加邀请码使用次数
    await prisma.inviteCode.update({
      where: { id: code.id },
      data: { usedCount: { increment: 1 } },
    });

    // 发送注册邮件（异步，不阻塞响应）
    const clientIp = await getClientIp();
    sendEmail({
      to: user.email,
      type: 'REGISTRATION',
      vars: {
        userName: user.name,
      },
      userId: user.id,
    }).catch((err) => {
      console.error('Failed to send registration email:', err);
    });

    // 创建审计日志（异步，不阻塞响应）
    createAuditLog({
      userId: user.id,
      action: 'USER_REGISTER',
      detail: { message: `用户 ${user.email} 注册成功，使用邀请码 ${inviteCode}` },
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
      '注册成功'
    );
  } catch (error) {
    return handleApiError(error);
  }
}
