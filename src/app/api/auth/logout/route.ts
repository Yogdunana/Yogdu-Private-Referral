import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { successResponse } from '@/lib/errors';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return successResponse(null, '登出成功');
}
