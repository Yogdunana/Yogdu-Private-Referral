'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SearchBar from '@/components/search-bar';
import JobFilters from '@/components/job-filters';
import JobCard from '@/components/job-card';
import JobCardSkeleton from '@/components/job-card-skeleton';
import type { JobFilterParams, PaginatedResponse } from '@/types';
import type { JobType, WorkMode } from '@prisma/client';

interface JobItem {
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
  status: string;
  createdAt: string;
  viewCount: number;
  favoriteCount: number;
}

const PAGE_SIZE = 12;

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [filters, setFilters] = useState<JobFilterParams>({});
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Sync keyword from URL
  useEffect(() => {
    const kw = searchParams.get('keyword');
    if (kw) {
      setKeyword(kw);
    }
  }, [searchParams]);

  const fetchJobs = useCallback(async () => {
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

      const res = await fetch(`/api/jobs?${params.toString()}`);
      const json: PaginatedResponse<JobItem> = await res.json();

      if (json.success && json.data) {
        setJobs(json.data);
        setTotalPages(json.totalPages);
        setTotal(json.total);
      } else {
        toast.error(json.error || '获取职位列表失败');
        setJobs([]);
      }
    } catch {
      toast.error('网络错误，请重试');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, filters]);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await fetch('/api/favorites/check');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setFavoriteIds(new Set(json.data as string[]));
        }
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

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
      const isFav = favoriteIds.has(jobId);
      const res = await fetch('/api/favorites', {
        method: isFav ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });

      const json = await res.json();

      if (json.success) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (isFav) {
            next.delete(jobId);
          } else {
            next.add(jobId);
          }
          return next;
        });
        toast.success(isFav ? '已取消收藏' : '已收藏');
      } else {
        toast.error(json.error || '操作失败');
      }
    } catch {
      toast.error('操作失败，请重试');
    }
  };

  const isExpiringSoon = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffDays = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 3;
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Search */}
      <SearchBar value={keyword} onChange={handleSearchChange} placeholder="搜索职位标题、内容、标签..." />

      {/* Filters */}
      <JobFilters filters={filters} onFilterChange={handleFilterChange} />

      {/* Results info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? '加载中...' : `共 ${total} 个职位`}
        </p>
      </div>

      {/* Job grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Inbox className="size-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">暂无职位</p>
            <p className="text-sm text-muted-foreground mt-1">
              {keyword || filters.type || filters.location
                ? '尝试调整搜索条件或筛选条件'
                : '目前还没有发布的职位'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isExpiringSoon={isExpiringSoon(job.deadline)}
              isFavorited={favoriteIds.has(job.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
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
