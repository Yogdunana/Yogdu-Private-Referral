'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  Search,
  Eye,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import type { JobType, JobStatus, WorkMode } from '@prisma/client';

const JOB_TYPE_LABELS: Record<JobType, string> = {
  DAILY_INTERNSHIP: '日常实习',
  SUMMER_INTERNSHIP: '暑期实习',
  RESEARCH_INTERNSHIP: '科研实习',
  FULL_TIME: '全职',
  OTHER: '其他',
};

const STATUS_CONFIG: Record<JobStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { label: '待审核', variant: 'secondary' },
  APPROVED: { label: '已上架', variant: 'default' },
  REJECTED: { label: '已驳回', variant: 'destructive' },
  EXPIRED: { label: '已过期', variant: 'outline' },
  TAKEN_DOWN: { label: '已下架', variant: 'outline' },
};

interface AdminJobItem {
  id: string;
  title: string;
  type: JobType;
  location: string;
  status: JobStatus;
  deadline: string;
  createdAt: string;
  contributor?: {
    name: string;
    email: string;
  };
  content?: string;
  requirements?: string;
  workMode?: WorkMode;
  contactEmail?: string;
  tags?: string[];
}

const PAGE_SIZE = 15;

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('active');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      if (activeTab !== 'all') {
        params.set('tab', activeTab);
      }
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/jobs?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setJobs(json.data);
        setTotalPages(json.totalPages || 1);
      } else {
        toast.error(json.error || '获取岗位列表失败');
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, search]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleToggleStatus = async (jobId: string, currentStatus: JobStatus) => {
    const newStatus = currentStatus === 'APPROVED' ? 'TAKEN_DOWN' : 'APPROVED';
    const action = newStatus === 'TAKEN_DOWN' ? '下架' : '恢复上架';

    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(`已${action}`);
        fetchJobs();
      } else {
        toast.error(json.error || '操作失败');
      }
    } catch {
      toast.error('操作失败，请重试');
    }
  };

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

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">岗位管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理所有岗位信息
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜索岗位标题..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button type="submit" size="sm">
          搜索
        </Button>
      </form>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="active">已上架</TabsTrigger>
          <TabsTrigger value="takenDown">已下架</TabsTrigger>
          <TabsTrigger value="expired">已过期</TabsTrigger>
          <TabsTrigger value="all">全部</TabsTrigger>
        </TabsList>

        {['active', 'takenDown', 'expired', 'all'].map((tab) => (
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
                        <TableHead>标题</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>地点</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>投稿人</TableHead>
                        <TableHead>截止日期</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => {
                        const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.PENDING;
                        const isExpanded = expandedRows.has(job.id);

                        return (
                          <React.Fragment key={job.id}>
                            <TableRow className="hover:bg-muted/50">
                              <TableCell>
                                <button
                                  className="flex items-center gap-1 text-left font-medium hover:underline max-w-[250px]"
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
                              <TableCell className="text-sm">
                                {JOB_TYPE_LABELS[job.type]}
                              </TableCell>
                              <TableCell className="text-sm">{job.location}</TableCell>
                              <TableCell>
                                <Badge variant={statusConfig.variant}>
                                  {statusConfig.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {job.contributor?.name || '未知'}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(job.deadline)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleRow(job.id)}
                                    className="gap-1"
                                  >
                                    <Eye className="size-3" />
                                    详情
                                  </Button>
                                  {job.status === 'APPROVED' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleToggleStatus(job.id, job.status)}
                                      className="gap-1 text-amber-600 hover:text-amber-700"
                                    >
                                      <ArrowDownToLine className="size-3" />
                                      下架
                                    </Button>
                                  )}
                                  {(job.status === 'TAKEN_DOWN' || job.status === 'REJECTED') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleToggleStatus(job.id, job.status)}
                                      className="gap-1 text-green-600 hover:text-green-700"
                                    >
                                      <ArrowUpFromLine className="size-3" />
                                      恢复
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={7} className="bg-muted/30">
                                  <div className="py-3 px-4 space-y-3 text-sm">
                                    {job.content && (
                                      <div>
                                        <p className="font-medium mb-1">工作内容</p>
                                        <p className="text-muted-foreground whitespace-pre-wrap">
                                          {job.content}
                                        </p>
                                      </div>
                                    )}
                                    {job.requirements && (
                                      <div>
                                        <p className="font-medium mb-1">岗位要求</p>
                                        <p className="text-muted-foreground whitespace-pre-wrap">
                                          {job.requirements}
                                        </p>
                                      </div>
                                    )}
                                    {job.workMode && (
                                      <div className="flex gap-2">
                                        <span className="text-muted-foreground">工作方式:</span>
                                        <span>{job.workMode === 'REMOTE' ? '远程' : job.workMode === 'ONSITE' ? '线下' : '混合'}</span>
                                      </div>
                                    )}
                                    {job.contactEmail && (
                                      <div className="flex gap-2">
                                        <span className="text-muted-foreground">联系邮箱:</span>
                                        <span>{job.contactEmail}</span>
                                      </div>
                                    )}
                                    {job.tags && job.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5">
                                        {job.tags.map((tag) => (
                                          <Badge key={tag} variant="outline" className="text-xs">
                                            {tag}
                                          </Badge>
                                        ))}
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
    </div>
  );
}
