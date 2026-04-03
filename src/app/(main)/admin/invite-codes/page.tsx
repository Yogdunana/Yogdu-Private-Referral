'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Copy,
  Ban,
  Ticket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

interface InviteCodeItem {
  id: string;
  code: string;
  createdBy: {
    name: string;
    email: string;
  };
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  status: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: '有效',
  DISABLED: '已禁用',
  EXPIRED: '已过期',
  USED_UP: '已用完',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  DISABLED: 'destructive',
  EXPIRED: 'outline',
  USED_UP: 'secondary',
};

const PAGE_SIZE = 15;

export default function AdminInviteCodesPage() {
  const [codes, setCodes] = useState<InviteCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Generate dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quantity, setQuantity] = useState('5');
  const [maxUses, setMaxUses] = useState('1');
  const [expiresAt, setExpiresAt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      const res = await fetch(`/api/invite-codes?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setCodes(json.data);
        setTotalPages(json.totalPages || 1);
      } else {
        toast.error(json.error || '获取邀请码列表失败');
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleGenerate = async () => {
    const qty = parseInt(quantity, 10);
    const uses = parseInt(maxUses, 10);

    if (isNaN(qty) || qty < 1 || qty > 100) {
      toast.error('数量需在 1-100 之间');
      return;
    }
    if (isNaN(uses) || uses < 1) {
      toast.error('最大使用次数需大于 0');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: qty,
          maxUses: uses,
          expiresAt: expiresAt || null,
        }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(`成功生成 ${qty} 个邀请码`);
        setDialogOpen(false);
        setQuantity('5');
        setMaxUses('1');
        setExpiresAt('');
        fetchCodes();
      } else {
        toast.error(json.error || '生成邀请码失败');
      }
    } catch {
      toast.error('操作失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('邀请码已复制到剪贴板');
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  const handleToggleCode = async (codeId: string, currentStatus: string) => {
    const action = currentStatus === 'ACTIVE' ? '禁用' : '启用';

    try {
      const res = await fetch(`/api/invite-codes/${codeId}/toggle`, {
        method: 'PATCH',
      });
      const json = await res.json();

      if (json.success) {
        toast.success(`已${action}该邀请码`);
        fetchCodes();
      } else {
        toast.error(json.error || '操作失败');
      }
    } catch {
      toast.error('操作失败，请重试');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '永不过期';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateStr || '永不过期';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">邀请码管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理注册邀请码的生成和使用
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            批量生成邀请码
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>批量生成邀请码</DialogTitle>
              <DialogDescription>
                设置邀请码的参数，批量生成后可复制使用
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">生成数量</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses">最大使用次数</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min={1}
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="每个邀请码可使用的次数"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">有效期</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">留空表示永不过期</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isGenerating}>
                取消
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
                {isGenerating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Ticket className="size-4" />
                )}
                生成
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">暂无邀请码</p>
          <p className="text-sm mt-1">点击上方按钮生成邀请码</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>邀请码</TableHead>
                <TableHead>创建者</TableHead>
                <TableHead className="text-center">最大使用次数</TableHead>
                <TableHead className="text-center">已使用次数</TableHead>
                <TableHead>有效期</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {code.code}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm">
                    {code.createdBy?.name || '未知'}
                  </TableCell>
                  <TableCell className="text-center">{code.maxUses}</TableCell>
                  <TableCell className="text-center">
                    <span className={code.usedCount >= code.maxUses ? 'text-destructive font-medium' : ''}>
                      {code.usedCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(code.expiresAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[code.status] || 'secondary'}>
                      {STATUS_LABELS[code.status] || code.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleCopyCode(code.code)}
                        title="复制邀请码"
                      >
                        <Copy className="size-3.5" />
                      </Button>
                      {code.status === 'ACTIVE' && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleToggleCode(code.id, code.status)}
                          className="text-destructive hover:text-destructive"
                          title="禁用"
                        >
                          <Ban className="size-3.5" />
                        </Button>
                      )}
                      {code.status === 'DISABLED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleCode(code.id, code.status)}
                          className="text-green-600 hover:text-green-700"
                        >
                          启用
                        </Button>
                      )}
                    </div>
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
