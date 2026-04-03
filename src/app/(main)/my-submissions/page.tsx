'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Edit,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { JobType, JobStatus } from '@prisma/client';

const JOB_TYPE_LABELS: Record<JobType, string> = {
  DAILY_INTERNSHIP: '日常实习',
  SUMMER_INTERNSHIP: '暑期实习',
  RESEARCH_INTERNSHIP: '科研实习',
  FULL_TIME: '全职',
  OTHER: '其他',
};

const STATUS_CONFIG: Record<JobStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { label: '待审核', variant: 'secondary' },
  APPROVED: { label: '已通过', variant: 'default' },
  REJECTED: { label: '已驳回', variant: 'destructive' },
  EXPIRED: { label: '已过期', variant: 'outline' },
  TAKEN_DOWN: { label: '已下架', variant: 'outline' },
};

interface SubmissionItem {
  id: string;
  title: string;
  type: JobType;
  status: JobStatus;
  rejectReason?: string | null;
  createdAt: string;
}

const PAGE_SIZE = 10;

export default function MySubmissionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchUser = useCallback(async () => {
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
          toast.error('您没有查看投稿的权限');
          router.push('/');
          return;
        }
        setUser(userData);
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    }
  }, [router]);

  const fetchSubmissions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      const res = await fetch(`/api/my-submissions?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setSubmissions(json.data);
        setTotalPages(json.totalPages || 1);
      } else {
        toast.error(json.error || '获取投稿列表失败');
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }, [user, page]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user) {
      fetchSubmissions();
    }
  }, [fetchSubmissions, user]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleEdit = (id: string) => {
    router.push(`/submit?edit=${id}`);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (!user && loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">我的投稿</h1>
        <p className="text-sm text-muted-foreground mt-1">
          查看和管理您提交的职位信息
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">暂无投稿记录</p>
          <p className="text-sm mt-1">点击上方&ldquo;投稿&rdquo;按钮提交您的第一个职位信息</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">标题</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((item) => {
                  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                  const isExpanded = expandedRows.has(item.id);

                  return (
                    <React.Fragment key={item.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(item.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="size-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="truncate">{item.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{JOB_TYPE_LABELS[item.type]}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.status === 'REJECTED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(item.id);
                              }}
                              className="gap-1"
                            >
                              <Edit className="size-3" />
                              修改并重新提交
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && item.status === 'REJECTED' && item.rejectReason && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-destructive/5">
                            <div className="flex items-start gap-2 py-2 px-4">
                              <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-destructive">驳回原因</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.rejectReason}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
