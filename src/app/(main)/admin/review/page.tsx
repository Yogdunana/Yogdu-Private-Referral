'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { JobType, JobStatus, WorkMode } from '@prisma/client';

const JOB_TYPE_LABELS: Record<JobType, string> = {
  DAILY_INTERNSHIP: '日常实习',
  SUMMER_INTERNSHIP: '暑期实习',
  RESEARCH_INTERNSHIP: '科研实习',
  FULL_TIME: '全职',
  OTHER: '其他',
};

const WORK_MODE_LABELS: Record<WorkMode, string> = {
  REMOTE: '远程',
  ONSITE: '线下',
  HYBRID: '混合',
};

const STATUS_CONFIG: Record<JobStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { label: '待审核', variant: 'secondary' },
  APPROVED: { label: '已通过', variant: 'default' },
  REJECTED: { label: '已驳回', variant: 'destructive' },
  EXPIRED: { label: '已过期', variant: 'outline' },
  TAKEN_DOWN: { label: '已下架', variant: 'outline' },
};

interface AdminJobItem {
  id: string;
  title: string;
  type: JobType;
  location: string;
  content: string;
  requirements: string;
  researchField?: string | null;
  businessTrack?: string | null;
  bonusPoints?: string | null;
  workMode: WorkMode;
  contactEmail: string;
  emailFormat: string;
  deadline: string;
  tags: string[];
  status: JobStatus;
  rejectReason?: string | null;
  createdAt: string;
  contributor?: {
    name: string;
    email: string;
  };
}

const PAGE_SIZE = 15;

export default function AdminReviewPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<AdminJobItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Batch approve
  const [isBatchApproving, setIsBatchApproving] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.role !== 'ADMIN') {
          toast.error('您没有管理员权限');
          router.push('/');
          return;
        }
        setUser(json.data);
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    }
  }, [router]);

  const fetchJobs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      if (activeTab !== 'all') {
        params.set('status', activeTab.toUpperCase());
      }

      const res = await fetch(`/api/admin/jobs?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setJobs(json.data);
        setTotalPages(json.totalPages || 1);
      } else {
        toast.error(json.error || '获取职位列表失败');
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }, [user, page, activeTab]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [fetchJobs, user]);

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pendingJobs = jobs.filter((j) => j.status === 'PENDING');
    const pendingIds = pendingJobs.map((j) => j.id);
    const allSelected = pendingIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pendingIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pendingIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/jobs/${id}/approve`, {
        method: 'POST',
      });
      const json = await res.json();

      if (json.success) {
        toast.success('已通过');
        fetchJobs();
      } else {
        toast.error(json.error || '操作失败');
      }
    } catch {
      toast.error('操作失败，请重试');
    }
  };

  const openRejectDialog = (id: string) => {
    setRejectTargetId(id);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectTargetId) return;
    if (!rejectReason.trim()) {
      toast.error('请填写驳回原因');
      return;
    }

    setIsRejecting(true);
    try {
      const res = await fetch(`/api/admin/jobs/${rejectTargetId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success('已驳回');
        setRejectDialogOpen(false);
        setRejectTargetId(null);
        setRejectReason('');
        fetchJobs();
      } else {
        toast.error(json.error || '操作失败');
      }
    } catch {
      toast.error('操作失败，请重试');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) {
      toast.error('请先选择待审核的职位');
      return;
    }

    setIsBatchApproving(true);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/admin/jobs/${id}/approve`, { method: 'POST' })
      );
      const results = await Promise.all(promises);

      const successCount = results.filter((r) => r.ok).length;
      toast.success(`已批量通过 ${successCount} 个职位`);
      setSelectedIds(new Set());
      fetchJobs();
    } catch {
      toast.error('批量操作失败，请重试');
    } finally {
      setIsBatchApproving(false);
    }
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

  const pendingJobs = jobs.filter((j) => j.status === 'PENDING');
  const allPendingSelected = pendingJobs.length > 0 && pendingJobs.every((j) => selectedIds.has(j.id));

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">管理后台 - 审核</h1>
          <p className="text-sm text-muted-foreground mt-1">
            审核和管理投稿的职位信息
          </p>
        </div>
        {selectedIds.size > 0 && (
          <Button
            onClick={handleBatchApprove}
            disabled={isBatchApproving}
            className="gap-2"
          >
            {isBatchApproving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            批量通过 ({selectedIds.size})
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="pending">待审核</TabsTrigger>
          <TabsTrigger value="approved">已通过</TabsTrigger>
          <TabsTrigger value="rejected">已驳回</TabsTrigger>
        </TabsList>

        {['all', 'pending', 'approved', 'rejected'].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-lg">暂无数据</p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {activeTab === 'all' || activeTab === 'pending' ? (
                          <TableHead className="w-[40px]">
                            <Checkbox
                              checked={allPendingSelected}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                        ) : null}
                        <TableHead>投稿人</TableHead>
                        <TableHead>提交时间</TableHead>
                        <TableHead className="w-[30%]">标题</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => {
                        const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.PENDING;
                        const isExpanded = expandedRows.has(job.id);
                        const isPending = job.status === 'PENDING';

                        return (
                          <React.Fragment key={job.id}>
                            <TableRow className="hover:bg-muted/50">
                              {(activeTab === 'all' || activeTab === 'pending') && (
                                <TableCell>
                                  {isPending && (
                                    <Checkbox
                                      checked={selectedIds.has(job.id)}
                                      onCheckedChange={() => toggleSelect(job.id)}
                                    />
                                  )}
                                </TableCell>
                              )}
                              <TableCell className="text-sm">
                                {job.contributor?.name || '未知'}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(job.createdAt)}
                              </TableCell>
                              <TableCell>
                                <button
                                  className="flex items-center gap-1 text-left font-medium hover:underline"
                                  onClick={() => toggleRow(job.id)}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="size-4 text-muted-foreground shrink-0" />
                                  ) : (
                                    <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                                  )}
                                  <span className="truncate">{job.title}</span>
                                </button>
                              </TableCell>
                              <TableCell>
                                <Badge variant={statusConfig.variant}>
                                  {statusConfig.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {isPending && (
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleApprove(job.id)}
                                      className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    >
                                      <Check className="size-3" />
                                      通过
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openRejectDialog(job.id)}
                                      className="gap-1 text-destructive hover:bg-destructive/10"
                                    >
                                      <X className="size-3" />
                                      驳回
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell
                                  colSpan={activeTab === 'all' || activeTab === 'pending' ? 6 : 5}
                                  className="bg-muted/30"
                                >
                                  <div className="py-3 px-4 space-y-3 text-sm">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      <div>
                                        <span className="text-muted-foreground">类型: </span>
                                        <Badge variant="outline">{JOB_TYPE_LABELS[job.type]}</Badge>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">地点: </span>
                                        {job.location}
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">方式: </span>
                                        {WORK_MODE_LABELS[job.workMode]}
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">截止: </span>
                                        {formatDate(job.deadline)}
                                      </div>
                                    </div>

                                    {job.researchField && (
                                      <div>
                                        <span className="text-muted-foreground">研究方向: </span>
                                        {job.researchField}
                                      </div>
                                    )}
                                    {job.businessTrack && (
                                      <div>
                                        <span className="text-muted-foreground">业务方向: </span>
                                        {job.businessTrack}
                                      </div>
                                    )}

                                    <div>
                                      <p className="font-medium mb-1">工作内容</p>
                                      <p className="text-muted-foreground whitespace-pre-wrap">
                                        {job.content}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="font-medium mb-1">岗位要求</p>
                                      <p className="text-muted-foreground whitespace-pre-wrap">
                                        {job.requirements}
                                      </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      <span className="text-muted-foreground">联系邮箱: </span>
                                      {job.contactEmail}
                                    </div>

                                    {job.emailFormat && (
                                      <div>
                                        <span className="text-muted-foreground">邮件格式: </span>
                                        <span className="text-xs bg-muted/50 p-2 rounded whitespace-pre-wrap">
                                          {job.emailFormat}
                                        </span>
                                      </div>
                                    )}

                                    {job.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5">
                                        {job.tags.map((tag) => (
                                          <Badge key={tag} variant="outline" className="text-xs">
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}

                                    {job.status === 'REJECTED' && job.rejectReason && (
                                      <div className="flex items-start gap-2 p-2 bg-destructive/5 rounded mt-2">
                                        <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                                        <div>
                                          <p className="text-sm font-medium text-destructive">驳回原因</p>
                                          <p className="text-sm text-muted-foreground">{job.rejectReason}</p>
                                        </div>
                                      </div>
                                    )}
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
                  <div className="flex items-center justify-center gap-2 pt-4">
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
          </TabsContent>
        ))}
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>驳回投稿</DialogTitle>
            <DialogDescription>
              请填写驳回原因，该原因将展示给投稿者
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason">驳回原因</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请输入驳回原因..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isRejecting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || !rejectReason.trim()}
              className="gap-2"
            >
              {isRejecting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
              确认驳回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
