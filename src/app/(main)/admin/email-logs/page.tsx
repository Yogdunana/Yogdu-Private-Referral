'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface EmailLogItem {
  id: string;
  sentAt: string;
  recipient: string;
  type: string;
  subject: string;
  status: string;
  errorMessage: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  WELCOME: '欢迎邮件',
  PASSWORD_RESET: '密码重置',
  JOB_APPROVED: '投稿通过',
  JOB_REJECTED: '投稿驳回',
  JOB_EXPIRING: '即将过期',
  INVITE_CODE: '邀请码',
  NOTIFICATION: '通知',
};

const STATUS_LABELS: Record<string, string> = {
  SENT: '已发送',
  FAILED: '发送失败',
  PENDING: '待发送',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SENT: 'default',
  FAILED: 'destructive',
  PENDING: 'secondary',
};

const PAGE_SIZE = 15;

export default function AdminEmailLogsPage() {
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/email-logs?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setLogs(json.data);
        setTotalPages(json.totalPages || 1);
      } else {
        toast.error(json.error || '获取邮件记录失败');
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
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
          <h1 className="text-2xl font-bold">邮件记录</h1>
          <p className="text-sm text-muted-foreground mt-1">
            查看系统发送的所有邮件记录
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">邮件类型</Label>
          <Select value={typeFilter} onValueChange={(val) => { if (val) { setTypeFilter(val); setPage(1); } }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">发送状态</Label>
          <Select value={statusFilter} onValueChange={(val) => { if (val) { setStatusFilter(val); setPage(1); } }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">暂无邮件记录</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>发送时间</TableHead>
                <TableHead>接收人</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>主题</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>错误信息</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(log.sentAt)}
                  </TableCell>
                  <TableCell className="text-sm">{log.recipient}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {TYPE_LABELS[log.type] || log.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate" title={log.subject}>
                    {log.subject}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[log.status] || 'secondary'}>
                      {STATUS_LABELS[log.status] || log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-destructive max-w-[200px] truncate" title={log.errorMessage || ''}>
                    {log.errorMessage || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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
    </div>
  );
}
