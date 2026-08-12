import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/job-repository.js', () => ({
  findJobs: vi.fn(),
  findJobById: vi.fn(),
  listSources: vi.fn(),
}));

import { listSources } from '../../db/job-repository.js';
import { buildApp } from '../server.js';

const mockListSources = vi.mocked(listSources);
type SourceRow = Awaited<ReturnType<typeof listSources>>[number];

const app = buildApp();

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /sources', () => {
  it('retorna a lista de fontes com status da última coleta', async () => {
    mockListSources.mockResolvedValue([
      { slug: 'remotive', name: 'Remotive', lastRunStatus: 'success' } as unknown as SourceRow,
    ]);

    const response = await app.inject({ method: 'GET', url: '/sources' });

    const body = response.json<unknown[]>();
    expect(response.statusCode).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ slug: 'remotive', lastRunStatus: 'success' });
    expect(mockListSources).toHaveBeenCalledOnce();
  });
});
