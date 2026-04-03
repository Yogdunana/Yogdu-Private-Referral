'use client';

import { useState, useEffect, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { JobFilterParams } from '@/types';
import type { JobType, WorkMode } from '@prisma/client';

interface JobFiltersProps {
  filters: JobFilterParams;
  onFilterChange: (filters: JobFilterParams) => void;
}

const JOB_TYPE_OPTIONS: { value: JobType; label: string }[] = [
  { value: 'DAILY_INTERNSHIP', label: '日常实习' },
  { value: 'SUMMER_INTERNSHIP', label: '暑期实习' },
  { value: 'RESEARCH_INTERNSHIP', label: '科研实习' },
  { value: 'FULL_TIME', label: '全职' },
  { value: 'OTHER', label: '其他' },
];

const WORK_MODE_OPTIONS: { value: WorkMode; label: string }[] = [
  { value: 'REMOTE', label: '远程' },
  { value: 'ONSITE', label: '线下' },
  { value: 'HYBRID', label: '混合' },
];

const SORT_OPTIONS = [
  { value: 'createdAt_desc', label: '最新发布' },
  { value: 'createdAt_asc', label: '最早发布' },
  { value: 'deadline_asc', label: '即将截止' },
  { value: 'deadline_desc', label: '截止日期最晚' },
];

export default function JobFilters({ filters, onFilterChange }: JobFiltersProps) {
  const [cities, setCities] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const fetchOptions = useCallback(async () => {
    try {
      const [citiesRes, tagsRes] = await Promise.all([
        fetch('/api/jobs/cities'),
        fetch('/api/jobs/tags'),
      ]);

      if (citiesRes.ok) {
        const citiesJson = await citiesRes.json();
        if (citiesJson.success && citiesJson.data) {
          setCities(citiesJson.data);
        }
      }

      if (tagsRes.ok) {
        const tagsJson = await tagsRes.json();
        if (tagsJson.success && tagsJson.data) {
          setTags(tagsJson.data);
        }
      }
    } catch {
      // Silently fail - filters will just not show options
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate data-fetching-on-mount pattern
    fetchOptions();
  }, [fetchOptions]);

  const updateFilter = (key: keyof JobFilterParams, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value || undefined };

    if (key === 'sortBy') {
      if (value) {
        const [field, order] = value.split('_');
        newFilters.sortBy = field as JobFilterParams['sortBy'];
        newFilters.sortOrder = order as JobFilterParams['sortOrder'];
      } else {
        newFilters.sortBy = undefined;
        newFilters.sortOrder = undefined;
      }
      delete (newFilters as Record<string, unknown>)['sortBy_value'];
    }

    onFilterChange(newFilters);
  };

  const handleReset = () => {
    onFilterChange({});
  };

  const hasActiveFilters =
    filters.type || filters.location || filters.workMode || filters.sortBy;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">职位类型</Label>
        <Select
          value={filters.type || ''}
          onValueChange={(val) => updateFilter('type', val || undefined)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent>
            {JOB_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">地点</Label>
        <Select
          value={filters.location || ''}
          onValueChange={(val) => updateFilter('location', val || undefined)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="全部地点" />
          </SelectTrigger>
          <SelectContent>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">工作方式</Label>
        <Select
          value={filters.workMode || ''}
          onValueChange={(val) => updateFilter('workMode', val || undefined)}
        >
          <SelectTrigger className="w-[110px]">
            <SelectValue placeholder="全部方式" />
          </SelectTrigger>
          <SelectContent>
            {WORK_MODE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">排序</Label>
        <Select
          value={
            filters.sortBy && filters.sortOrder
              ? `${filters.sortBy}_${filters.sortOrder}`
              : ''
          }
          onValueChange={(val) => updateFilter('sortBy', val || undefined)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="默认排序" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1">
          <RotateCcw className="size-3" />
          重置筛选
        </Button>
      )}
    </div>
  );
}
