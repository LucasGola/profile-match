import type { JobsResponse, Profile, Stats } from './types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API respondeu ${String(res.status)} em ${path}`);
  }
  return res.json() as Promise<T>;
}

export interface JobFilters {
  page?: number;
  pageSize?: number;
  minScore?: number;
  source?: string;
  stack?: string;
}

export const api = {
  getProfile: () => request<Profile>('/profile'),

  saveProfile: (profile: Profile) =>
    request<{ profile: Profile; rescored: number }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),

  getJobs: (filters: JobFilters = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') params.set(key, String(value));
    }
    return request<JobsResponse>(`/jobs?${params.toString()}`);
  },

  getStats: () => request<Stats>('/stats'),
};
