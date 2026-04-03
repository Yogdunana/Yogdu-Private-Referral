import { cookies } from 'next/headers';
import { verifyToken } from './auth';
import { Role, JwtPayload } from '@/types';
import { UnauthorizedError, ForbiddenError } from './errors';

export interface AuthUser extends JwtPayload {
  id: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return { ...payload, id: payload.userId };
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireRole(...roles: Role[]): Promise<AuthUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}
