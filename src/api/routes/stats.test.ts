import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/job-repository.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../db/job-repository.js')>()),
  getStats: vi.fn(),
}));

import { getStats } from '../../db/job-repository.js';
import { buildApp } from '../server.js';

const mockGetStats = vi.mocked(getStats);

const app = buildApp();

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /stats', () => {
  it('retorna as agregações', async () => {
    mockGetStats.mockResolvedValue({
      total: 3,
      notified: 1,
      byScoreBucket: [{ bucket: '80-100', count: 1 }],
      bySource: [{ source: 'remotive', count: 2 }],
      byDay: [{ date: '2026-08-01', count: 3 }],
    });

    const response = await app.inject({ method: 'GET', url: '/stats' });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ total: number }>().total).toBe(3);
    expect(mockGetStats).toHaveBeenCalledOnce();
  });
});
