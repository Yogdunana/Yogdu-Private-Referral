export { Role, JobStatus, JobType, WorkMode, EmailType, AuditAction } from '@prisma/client';
import { Role, JobType, WorkMode } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface JobFormData {
  title: string;
  type: JobType;
  location: string;
  content: string;
  requirements: string;
  researchField?: string;
  businessTrack?: string;
  bonusPoints?: string;
  workMode: WorkMode;
  contactEmail: string;
  emailFormat: string;
  deadline: string;
  tags: string[];
}

export interface AiParseResult {
  title: string;
  type: string;
  location: string;
  content: string;
  requirements: string;
  researchField?: string;
  businessTrack?: string;
  bonusPoints?: string;
  workMode: string;
  contactEmail: string;
  emailFormat: string;
  deadline: string;
  tags: string[];
}

export interface DashboardStats {
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
}

export interface JobFilterParams {
  keyword?: string;
  type?: JobType;
  location?: string;
  workMode?: WorkMode;
  tags?: string[];
  sortBy?: 'createdAt' | 'deadline';
  sortOrder?: 'asc' | 'desc';
}
