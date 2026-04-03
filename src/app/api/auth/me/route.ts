import { handleApiError, successResponse, UnauthorizedError } from '@/lib/errors';
import { getCurrentUser } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const payload = await getCurrentUser();

    if (!payload) {
      throw new UnauthorizedError();
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('账号不存在或已被禁用');
    }

    return successResponse(user);
  } catch (error) {
    return handleApiError(error);
  }
}
