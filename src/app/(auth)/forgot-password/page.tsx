'use client';

import { useState, useCallback, type FormEvent } from 'react';
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

export default function ForgotPasswordPage() {
  // Step 1: Enter email
  const [email, setEmail] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  // Step 2: Reset password
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleSendCode = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!email.trim()) {
        toast.error('请输入邮箱');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error('请输入有效的邮箱地址');
        return;
      }

      setSendingCode(true);
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });

        const data: ApiResponse = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || data.error || '发送验证码失败');
          return;
        }

        toast.success('验证码已发送到您的邮箱');
        setCodeSent(true);
      } catch {
        toast.error('网络错误，请稍后重试');
      } finally {
        setSendingCode(false);
      }
    },
    [email]
  );

  const handleResetPassword = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!code.trim()) {
        toast.error('请输入验证码');
        return;
      }
      if (!newPassword) {
        toast.error('请输入新密码');
        return;
      }
      if (newPassword.length < 6) {
        toast.error('密码长度至少为6位');
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('两次输入的密码不一致');
        return;
      }

      setResetting(true);
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            code: code.trim(),
            newPassword,
          }),
        });

        const data: ApiResponse = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || data.error || '重置密码失败');
          return;
        }

        toast.success('密码重置成功，请使用新密码登录');
        // Reset state and go back to step 1
        setCodeSent(false);
        setCode('');
        setNewPassword('');
        setConfirmPassword('');
      } catch {
        toast.error('网络错误，请稍后重试');
      } finally {
        setResetting(false);
      }
    },
    [email, code, newPassword, confirmPassword]
  );

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">忘记密码</CardTitle>
        <CardDescription>
          {codeSent
            ? '输入验证码并设置新密码'
            : '输入您的邮箱以接收验证码'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!codeSent ? (
          /* Step 1: Enter email */
          <form onSubmit={handleSendCode} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sendingCode}
                autoComplete="email"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={sendingCode}
            >
              {sendingCode ? '发送中...' : '发送验证码'}
            </Button>
          </form>
        ) : (
          /* Step 2: Enter code + new password */
          <form onSubmit={handleResetPassword} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="code">验证码</Label>
              <Input
                id="code"
                type="text"
                placeholder="请输入邮箱收到的验证码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={resetting}
                autoComplete="one-time-code"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="至少6位新密码"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={resetting}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="请再次输入新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={resetting}
                autoComplete="new-password"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={resetting}
            >
              {resetting ? '重置中...' : '重置密码'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setCodeSent(false)}
              disabled={resetting}
            >
              重新发送验证码
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-foreground hover:underline"
          >
            返回登录
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
