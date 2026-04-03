'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
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

interface AuditLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  detail: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  USER_LOGIN: '用户登录',
  USER_LOGOUT: '用户退出',
  USER_REGISTER: '用户注册',
  JOB_SUBMIT: '提交投稿',
  JOB_APPROVE: '审核通过',
  JOB_REJECT: '审核驳回',
  JOB_TAKE_DOWN: '下架岗位',
  JOB_RESTORE: '恢复岗位',
  USER_DISABLE: '禁用用户',
  USER_ENABLE: '启用用户',
  USER_ROLE_CHANGE: '更改角色',
  INVITE_CODE_CREATE: '创建邀请码',
  INVITE_CODE_DISABLE: '禁用邀请码',
  INVITE_CODE_ENABLE: '启用邀请码',
  PASSWORD_RESET: '重置密码',
  FAVORITE_ADD: '添加收藏',
  FAVORITE_REMOVE: '取消收藏',
};

const ACTION_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  USER_LOGIN: 'secondary',
  USER_LOGOUT: 'outline',
  USER_REGISTER: 'default',
  JOB_SUBMIT: 'default',
  JOB_APPROVE: 'default',
  JOB_REJECT: 'destructive',
  JOB_TAKE_DOWN: 'destructive',
  JOB_RESTORE: 'default',
  USER_DISABLE: 'destructive',
  USER_ENABLE: 'default',
  USER_ROLE_CHANGE: 'secondary',
  INVITE_CODE_CREATE: 'default',
  INVITE_CODE_DISABLE: 'destructive',
  INVITE_CODE_ENABLE: 'default',
  PASSWORD_RESET: 'secondary',
  FAVORITE_ADD: 'secondary',
  FAVORITE_REMOVE: 'outline',
};

const PAGE_SIZE = 15;

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      if (actionFilter !== 'all') params.set('action', actionFilter);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setLogs(json.data);
        setTotalPages(json.totalPages || 1);
      } else {
        toast.error(json.error || '获取操作日志失败');
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDetail = (detail: string) => {
    try {
      const parsed = JSON.parse(detail);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return detail;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">操作日志</h1>
          <p className="text-sm text-muted-foreground mt-1">
            查看系统操作审计日志
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">操作类型</Label>
          <Select value={actionFilter} onValueChange={(val) => { if (val) { setActionFilter(val); setPage(1); } }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="全部操作" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部操作</SelectItem>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
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
          <p className="text-lg">暂无操作日志</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>操作人</TableHead>
                <TableHead>操作类型</TableHead>
                <TableHead>详情</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const isExpanded = expandedRows.has(log.id);

                return (
                  <React.Fragment key={log.id}>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {log.userName}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ACTION_VARIANTS[log.action] || 'secondary'}>
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground max-w-[300px] truncate"
                          onClick={() => toggleRow(log.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="size-4 shrink-0" />
                          ) : (
                            <ChevronDown className="size-4 shrink-0" />
                          )}
                          <span className="truncate">{log.detail}</span>
                        </button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={4} className="bg-muted/30">
                          <div className="py-3 px-4 space-y-2">
                            <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono">
                              {formatDetail(log.detail)}
                            </pre>
                            {log.ipAddress && (
                              <p className="text-xs text-muted-foreground">
                                IP 地址: {log.ipAddress}
                              </p>
                            )}
                            {log.userAgent && (
                              <p className="text-xs text-muted-foreground">
                                User Agent: {log.userAgent}
                              </p>
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
