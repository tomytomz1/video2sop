const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface Job {
  id: string;
  videoUrl: string;
  type: 'file' | 'youtube';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  resultUrl?: string;
  error?: string;
  screenshots: string[];
  transcript?: string;
  sop?: string;
  metadata?: Record<string, any>;
}

interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }
  return response.json();
}

export async function createJob(videoUrl: string): Promise<Job> {
  const response = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ videoUrl }),
  });

  const result = await handleResponse<ApiResponse<Job>>(response);
  return result.data;
}

export async function getJob(id: string): Promise<Job> {
  const response = await fetch(`${API_URL}/jobs/${id}`);
  const result = await handleResponse<ApiResponse<Job>>(response);
  return result.data;
}

export async function getAllJobs(params?: {
  status?: Job['status'];
  page?: number;
  limit?: number;
}): Promise<{ data: Job[]; meta: ApiResponse<Job>['meta'] }> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const response = await fetch(`${API_URL}/jobs?${queryParams.toString()}`);
  const result = await handleResponse<ApiResponse<Job[]>>(response);
  return {
    data: result.data,
    meta: result.meta,
  };
} 