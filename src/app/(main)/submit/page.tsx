'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import JobForm from '@/components/job-form';
import type { JobFormData } from '@/types';

export default function SubmitPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editData, setEditData] = useState<Partial<JobFormData> & { id?: string } | undefined>();

  useEffect(() => {
    async function checkRole() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const json = await res.json();
        if (json.success && json.data) {
          const userData = json.data;
          if (userData.role !== 'CONTRIBUTOR' && userData.role !== 'ADMIN') {
            toast.error('您没有投稿权限');
            router.push('/');
            return;
          }
          setUser(userData);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkRole();
  }, [router]);

  const handleSubmit = async (data: JobFormData) => {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!json.success) {
      throw new Error(json.error || '提交失败');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">投稿</h1>
        <p className="text-sm text-muted-foreground mt-1">
          填写职位信息并提交，等待管理员审核通过后将展示在首页
        </p>
      </div>

      <JobForm
        initialData={editData}
        onSubmit={handleSubmit}
        mode="create"
      />
    </div>
  );
}
