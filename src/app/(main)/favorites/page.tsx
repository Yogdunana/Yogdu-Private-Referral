'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Heart, Loader2, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import SearchBar from '@/components/search-bar';
import JobFilters from '@/components/job-filters';
import JobCard from '@/components/job-card';
import JobCardSkeleton from '@/components/job-card-skeleton';
import type { JobFilterParams } from '@/types';
import type { JobType, WorkMode } from '@prisma/client';

interface FavoriteJobItem {
  id: string;
  jobId: string;
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
  status: string;
  createdAt: string;
  viewCount: number;
  favoriteCount: number;
}

const PAGE_SIZE = 12;

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState<JobFilterParams>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchRemoving, setIsBatchRemoving] = useState(false);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      if (keyword) params.set('keyword', keyword);
      if (filters.type) params.set('type', filters.type);
      if (filters.location) params.set('location', filters.location);
      if (filters.workMode) params.set('workMode', filters.workMode);
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

      const res = await fetch(`/api/favorites?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setFavorites(json.data);
        setTotalPages(json.totalPages);
        setTotal(json.total);
      } else {
        toast.error(json.error || '获取收藏列表失败');
        setFavorites([]);
      }
    } catch {
      toast.error('网络错误，请重试');
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, filters]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleSearchChange = useCallback((value: string) => {
    setKeyword(value);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((newFilters: JobFilterParams) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleToggleFavorite = async (jobId: string) => {
    try {
      const res = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });

      const json = await res.json();

      if (json.success) {
        setFavorites((prev) => prev.filter((f) => f.jobId !== jobId));
        toast.success('已取消收藏');
      } else {
        toast.error(json.error || '操作失败');
      }
    } catch {
      toast.error('操作失败，请重试');
    }
  };

  const toggleSelect = (jobId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allIds = favorites.map((f) => f.jobId);
    const allSelected = allIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const handleBatchUnfavorite = async () => {
    if (selectedIds.size === 0) {
      toast.error('请先选择要取消收藏的职位');
      return;
    }

    setIsBatchRemoving(true);
    try {
      const res = await fetch('/api/favorites/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds: Array.from(selectedIds) }),
      });

      const json = await res.json();

      if (json.success) {
        toast.success(`已取消 ${selectedIds.size} 个收藏`);
        setSelectedIds(new Set());
        fetchFavorites();
      } else {
        toast.error(json.error || '批量取消收藏失败');
      }
    } catch {
      toast.error('操作失败，请重试');
    } finally {
      setIsBatchRemoving(false);
    }
  };

  const isExpired = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  const isUnavailable = (status: string, deadline: string) => {
    return status === 'TAKEN_DOWN' || status === 'REJECTED' || isExpired(deadline);
  };

  const getStatusBadge = (status: string, deadline: string) => {
    if (status === 'TAKEN_DOWN') return { label: '已下架', variant: 'outline' as const };
    if (status === 'REJECTED') return { label: '已驳回', variant: 'destructive' as const };
    if (status === 'PENDING') return { label: '待审核', variant: 'secondary' as const };
    if (isExpired(deadline)) return { label: '已过期', variant: 'outline' as const };
    return null;
  };

  const allSelected = favorites.length > 0 && favorites.every((f) => selectedIds.has(f.jobId));

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="size-6 text-red-500" />
            我的收藏
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? '加载中...' : `共 ${total} 个收藏`}
          </p>
        </div>
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBatchUnfavorite}
            disabled={isBatchRemoving}
            className="gap-2"
          >
            {isBatchRemoving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Heart className="size-4" />
            )}
            批量取消收藏 ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Search */}
      <SearchBar value={keyword} onChange={handleSearchChange} placeholder="搜索收藏的职位..." />

      {/* Filters */}
      <JobFilters filters={filters} onFilterChange={handleFilterChange} />

      {/* Select all */}
      {!loading && favorites.length > 0 && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-muted-foreground">全选</span>
        </div>
      )}

      {/* Job grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Heart className="size-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">暂无收藏，去首页看看吧</p>
            <Link href="/">
              <Button variant="outline" className="mt-4 gap-2">
                <Home className="size-4" />
                去首页看看
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {favorites.map((fav) => {
            const unavailable = isUnavailable(fav.status, fav.deadline);
            const statusBadge = getStatusBadge(fav.status, fav.deadline);
            const jobData = {
              id: fav.jobId,
              title: fav.title,
              type: fav.type,
              location: fav.location,
              content: fav.content,
              requirements: fav.requirements,
              researchField: fav.researchField,
              businessTrack: fav.businessTrack,
              bonusPoints: fav.bonusPoints,
              workMode: fav.workMode,
              contactEmail: fav.contactEmail,
              emailFormat: fav.emailFormat,
              deadline: fav.deadline,
              tags: fav.tags,
              status: fav.status,
              createdAt: fav.createdAt,
              viewCount: fav.viewCount,
              favoriteCount: fav.favoriteCount,
            };

            return (
              <div key={fav.jobId} className="relative">
                {/* Checkbox */}
                <div className="absolute top-3 left-3 z-10">
                  <Checkbox
                    checked={selectedIds.has(fav.jobId)}
                    onCheckedChange={() => toggleSelect(fav.jobId)}
                    className="bg-background border-border"
                  />
                </div>

                {/* Unavailable overlay */}
                {unavailable && (
                  <div className="absolute inset-0 z-[5] rounded-lg bg-gray-100/70 dark:bg-gray-900/70 backdrop-blur-[1px] flex items-start justify-end p-3 pointer-events-none">
                    {statusBadge && (
                      <Badge variant={statusBadge.variant} className="pointer-events-auto">
                        {statusBadge.label}
                      </Badge>
                    )}
                  </div>
                )}

                <JobCard
                  job={jobData}
                  isFavorited={true}
                  onToggleFavorite={handleToggleFavorite}
                />
              </div>
            );
          })}
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
