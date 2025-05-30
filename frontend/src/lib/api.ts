const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface Job {
  id: string;
  videoUrl: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resultUrl?: string;
  error?: string;
}

export async function createJob(videoUrl: string): Promise<Job> {
  const response = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ videoUrl }),
  });

  if (!response.ok) {
    throw new Error('Failed to create job');
  }

  return response.json();
}

export async function getJob(id: string): Promise<Job> {
  const response = await fetch(`${API_URL}/jobs/${id}`);

  if (!response.ok) {
    throw new Error('Failed to fetch job');
  }

  return response.json();
}

export async function getAllJobs(): Promise<Job[]> {
  const response = await fetch(`${API_URL}/jobs`);

  if (!response.ok) {
    throw new Error('Failed to fetch jobs');
  }

  return response.json();
} 