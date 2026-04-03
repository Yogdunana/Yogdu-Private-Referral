'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ApiResponse } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = useCallback((): boolean => {
    if (!name.trim()) {
      toast.error('请输入姓名');
      return false;
    }
    if (!email.trim()) {
      toast.error('请输入邮箱');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('请输入有效的邮箱地址');
      return false;
    }
    if (!password) {
      toast.error('请输入密码');
      return false;
    }
    if (password.length < 6) {
      toast.error('密码长度至少为6位');
      return false;
    }
    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return false;
    }
    return true;
  }, [name, email, password, confirmPassword]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!validateForm()) return;

      setLoading(true);
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            inviteCode: inviteCode.trim() || undefined,
          }),
        });

        const data: ApiResponse = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || data.error || '注册失败，请稍后重试');
          return;
        }

        toast.success('注册成功，请登录');
        router.push('/login');
      } catch {
        toast.error('网络错误，请稍后重试');
      } finally {
        setLoading(false);
      }
    },
    [name, email, password, inviteCode, validateForm, router]
  );

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">注册</CardTitle>
        <CardDescription>创建您的悠渡脉选账号</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              type="text"
              placeholder="请输入姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoComplete="name"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              placeholder="至少6位密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">确认密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="请再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="inviteCode">
              邀请码 <span className="text-muted-foreground font-normal">(选填)</span>
            </Label>
            <Input
              id="inviteCode"
              type="text"
              placeholder="请输入邀请码"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          已有账号？{' '}
          <Link
            href="/login"
            className="font-medium text-foreground hover:underline"
          >
            去登录
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
