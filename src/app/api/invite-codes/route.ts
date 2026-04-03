import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth-helpers';
import { handleApiError, successResponse, AppError } from '@/lib/errors';
import { createAuditLog } from '@/lib/audit';
import { getClientIp } from '@/lib/request';
import { Role, AuditAction } from '@prisma/client';

// 生成随机邀请码：YD-XXXXXXXX（8位大写字母和数字）
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'YOGDU-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /api/invite-codes - 获取邀请码列表
export async function GET(request: NextRequest) {
  try {
    await requireRole(Role.ADMIN);

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 10));

    // 查询总数
    const total = await prisma.inviteCode.count();

    // 分页查询，包含创建者名称
    const codes = await prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return successResponse({
      data: codes,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/invite-codes - 批量生成邀请码
export async function POST(request: NextRequest) {
  try {
    const admin = await requireRole(Role.ADMIN);

    const body = await request.json();
    const { count, maxUses, expiresAt } = body as {
      count: number;
      maxUses: number;
      expiresAt?: string;
    };

    if (!count || count < 1 || count > 100) {
      throw new AppError(400, '生成数量必须在1-100之间', 'INVALID_COUNT');
    }

    if (!maxUses || maxUses < 1) {
      throw new AppError(400, '最大使用次数必须大于0', 'INVALID_MAX_USES');
    }

    // 生成不重复的邀请码
    const codes: string[] = [];
    const existingCodes = new Set<string>();

    // 先查询数据库中已有的邀请码，避免冲突
    const existingCodeRecords = await prisma.inviteCode.findMany({
      select: { code: true },
    });
    for (const record of existingCodeRecords) {
      existingCodes.add(record.code);
    }

    while (codes.length < count) {
      const code = generateInviteCode();
      if (!existingCodes.has(code) && !codes.includes(code)) {
        codes.push(code);
      }
    }

    // 批量创建邀请码
    const inviteCodes = await prisma.inviteCode.createMany({
      data: codes.map((code) => ({
        code,
        createdBy: admin.id,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })),
    });

    // 创建审计日志
    const clientIp = await getClientIp();
    await createAuditLog({
      userId: admin.id,
      action: AuditAction.INVITE_CODE_CREATE,
      detail: { count, maxUses, expiresAt: expiresAt || null, codes },
      ipAddress: clientIp,
    });

    return successResponse({ codes, count: inviteCodes.count }, `成功生成 ${count} 个邀请码`);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/invite-codes - 更新邀请码状态
export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireRole(Role.ADMIN);

    const body = await request.json();
    const { id, isActive } = body as {
      id: string;
      isActive: boolean;
    };

    if (!id) {
      throw new AppError(400, '请提供邀请码ID', 'MISSING_ID');
    }

    if (isActive === undefined) {
      throw new AppError(400, '请提供要更新的状态', 'MISSING_STATUS');
    }

    // 检查邀请码是否存在
    const existingCode = await prisma.inviteCode.findUnique({
      where: { id },
    });

    if (!existingCode) {
      throw new AppError(404, '邀请码不存在', 'INVITE_CODE_NOT_FOUND');
    }

    // 更新邀请码
    const updatedCode = await prisma.inviteCode.update({
      where: { id },
      data: { isActive },
    });

    // 如果是禁用操作，创建审计日志
    if (!isActive) {
      const clientIp = await getClientIp();
      await createAuditLog({
        userId: admin.id,
        action: AuditAction.INVITE_CODE_DISABLE,
        detail: { inviteCodeId: id, code: existingCode.code },
        ipAddress: clientIp,
      });
    }

    return successResponse(updatedCode, '邀请码更新成功');
  } catch (error) {
    return handleApiError(error);
  }
}
