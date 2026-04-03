'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2,
  FileText,
  Clock,
  Briefcase,
  Users,
  Download,
  TrendingUp,
  Eye,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

interface StatsData {
  submissionStats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  jobStats: {
    active: number;
    expired: number;
    takenDown: number;
    expiringSoon: number;
  };
  userStats: {
    total: number;
    activeRecent: number;
    byRole: { role: string; count: number }[];
  };
  topJobs: {
    id: string;
    title: string;
    viewCount: number;
    favoriteCount: number;
  }[];
  submissionTrend: {
    date: string;
    count: number;
  }[];
  avgReviewTime: number;
  jobTypeDistribution: {
    type: string;
    count: number;
  }[];
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const JOB_TYPE_LABELS: Record<string, string> = {
  DAILY_INTERNSHIP: '日常实习',
  SUMMER_INTERNSHIP: '暑期实习',
  RESEARCH_INTERNSHIP: '科研实习',
  FULL_TIME: '全职',
  OTHER: '其他',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: '管理员',
  CONTRIBUTOR: '投稿者',
  USER: '普通用户',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
};

const timeRanges = [
  { key: 'day', label: '日' },
  { key: 'week', label: '周' },
  { key: 'month', label: '月' },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('range', timeRange);

      const res = await fetch(`/api/stats?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setStats(json.data);
      } else {
        toast.error(json.error || '获取统计数据失败');
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.set('range', timeRange);

      const res = await fetch(`/api/stats/export?${params.toString()}`);
      if (!res.ok) {
        toast.error('导出失败');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stats-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch {
      toast.error('导出失败，请重试');
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Prepare chart data
  const pieData = stats
    ? [
        { name: '待审核', value: stats.submissionStats.pending },
        { name: '已通过', value: stats.submissionStats.approved },
        { name: '已驳回', value: stats.submissionStats.rejected },
      ].filter((d) => d.value > 0)
    : [];

  const lineData = stats?.submissionTrend || [];

  const barData = (stats?.jobTypeDistribution || []).map((item) => ({
    type: JOB_TYPE_LABELS[item.type] || item.type,
    count: item.count,
  }));

  const roleData = stats?.userStats.byRole || [];

  const rolePieData = roleData.map((item) => ({
    name: ROLE_LABELS[item.role] || item.role,
    value: item.count,
  }));

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">数据统计</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理后台数据概览
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time range selector */}
          <div className="flex items-center rounded-lg border bg-muted p-0.5">
            {timeRanges.map((range) => (
              <Button
                key={range.key}
                variant={timeRange === range.key ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range.key)}
                className="h-7 px-3 text-xs"
              >
                {range.label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="size-4" />
            导出
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总投稿数</p>
                <p className="text-3xl font-bold mt-1">
                  {stats?.submissionStats.total ?? 0}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FileText className="size-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">待审核</p>
                <p className="text-3xl font-bold mt-1">
                  {stats?.submissionStats.pending ?? 0}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="size-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已上架岗位</p>
                <p className="text-3xl font-bold mt-1">
                  {stats?.jobStats.active ?? 0}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Briefcase className="size-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总用户数</p>
                <p className="text-3xl font-bold mt-1">
                  {stats?.userStats.total ?? 0}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Users className="size-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Submission status pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">投稿状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                暂无数据
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} 条`, '数量']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Submission trend line chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4" />
              投稿趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lineData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                暂无数据
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    formatter={(value) => [`${value} 条`, '投稿数']}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Job type distribution bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">岗位类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                暂无数据
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="type"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    formatter={(value) => [`${value} 个`, '岗位数']}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top 10 jobs table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="size-4" />
              热门岗位 Top 10
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!stats?.topJobs || stats.topJobs.length === 0) ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                暂无数据
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>标题</TableHead>
                    <TableHead className="text-right">
                      <Eye className="size-3 inline mr-1" />
                      浏览
                    </TableHead>
                    <TableHead className="text-right">
                      <Heart className="size-3 inline mr-1" />
                      收藏
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topJobs.slice(0, 10).map((job, index) => (
                    <TableRow key={job.id}>
                      <TableCell className="text-muted-foreground font-medium">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {job.title}
                      </TableCell>
                      <TableCell className="text-right">{job.viewCount}</TableCell>
                      <TableCell className="text-right">{job.favoriteCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
