import prisma from './prisma';
import { AuditAction } from '@prisma/client';

export async function createAuditLog(params: {
  userId?: string;
  action: AuditAction;
  detail: Record<string, unknown>;
  ipAddress?: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      detail: JSON.stringify(params.detail),
      ipAddress: params.ipAddress,
    }
  });
}
