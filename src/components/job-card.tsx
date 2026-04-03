'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Heart,
  Copy,
  MapPin,
  Clock,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Mail,
  Tag,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { JobType, WorkMode } from '@prisma/client';

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

export interface JobCardData {
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
  status?: string;
  createdAt: string;
  viewCount?: number;
  favoriteCount?: number;
}

interface JobCardProps {
  job: JobCardData;
  isExpiringSoon?: boolean;
  isFavorited?: boolean;
  onToggleFavorite?: (jobId: string) => void;
}

export default function JobCard({
  job,
  isExpiringSoon = false,
  isFavorited = false,
  onToggleFavorite,
}: JobCardProps) {
  const [expanded, setExpanded] = useState(false);

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

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(job.contactEmail);
      toast.success('邮箱已复制到剪贴板');
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  const handleCopyFormat = async () => {
    try {
      await navigator.clipboard.writeText(job.emailFormat);
      toast.success('邮件格式已复制到剪贴板');
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  const handleToggleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite(job.id);
    }
  };

  const isExpired = new Date(job.deadline) < new Date();

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isExpiringSoon ? 'job-card-expiring border-amber-300 dark:border-amber-700' : ''
      } ${isExpired ? 'job-card-inactive' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-snug flex-1">
            {job.title}
          </CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            {isExpiringSoon && (
              <Badge variant="destructive" className="text-xs">
                即将截止
              </Badge>
            )}
            {expanded ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-1">
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <MapPin className="size-3 mr-1" />
            {job.location}
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <Briefcase className="size-3 mr-1" />
            {JOB_TYPE_LABELS[job.type]}
          </Badge>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            {WORK_MODE_LABELS[job.workMode]}
          </Badge>
          {job.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              <Tag className="size-3 mr-1" />
              {tag}
            </Badge>
          ))}
          {job.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{job.tags.length - 3}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-2">
        {/* Work content */}
        <div className={`text-sm text-muted-foreground ${!expanded ? 'line-clamp-3' : ''}`}>
          <p className="whitespace-pre-wrap">{job.content}</p>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 space-y-3">
            {job.requirements && (
              <div>
                <p className="text-sm font-medium mb-1">岗位要求</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {job.requirements}
                </p>
              </div>
            )}

            {job.researchField && (
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground shrink-0">研究方向:</span>
                <span>{job.researchField}</span>
              </div>
            )}

            {job.businessTrack && (
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground shrink-0">业务方向:</span>
                <span>{job.businessTrack}</span>
              </div>
            )}

            {job.bonusPoints && (
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground shrink-0">加分项:</span>
                <span>{job.bonusPoints}</span>
              </div>
            )}

            <Separator />

            {/* Contact info */}
            <div className="space-y-2">
              <p className="text-sm font-medium">联系方式</p>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="size-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{job.contactEmail}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyEmail();
                  }}
                  className="shrink-0"
                >
                  <Copy className="size-3" />
                </Button>
              </div>
              {job.emailFormat && (
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0 mt-0.5">邮件格式:</span>
                  <span className="whitespace-pre-wrap text-xs bg-muted/50 p-2 rounded flex-1">
                    {job.emailFormat}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyFormat();
                    }}
                    className="shrink-0"
                  >
                    <Copy className="size-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* All tags */}
            {job.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {job.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            截止: {formatDate(job.deadline)}
          </span>
          <span className="hidden sm:inline">
            发布于 {formatDate(job.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite();
            }}
            className={isFavorited ? 'text-red-500 hover:text-red-600' : ''}
          >
            <Heart className={`size-4 ${isFavorited ? 'fill-current favorite-animate' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyEmail();
            }}
          >
            <Copy className="size-3" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
