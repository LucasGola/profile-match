import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/job-repository.js', () => ({
  findJobs: vi.fn(),
  findJobById: vi.fn(),
}));

import { findJobById, findJobs } from '../../db/job-repository.js';
import { buildApp } from '../server.js';

const mockFindJobs = vi.mocked(findJobs);
const mockFindJobById = vi.mocked(findJobById);
type JobRow = NonNullable<Awaited<ReturnType<typeof findJobById>>>;

const app = buildApp();

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /jobs', () => {
  it('lista com defaults de paginação', async () => {
    mockFindJobs.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20 });

    const response = await app.inject({ method: 'GET', url: '/jobs' });

    expect(response.statusCode).toBe(200);
    expect(mockFindJobs).toHaveBeenCalledWith(
      { minScore: undefined, source: undefined, since: undefined, stack: undefined },
      { page: 1, pageSize: 20 },
    );
  });

  it('coage e repassa os filtros', async () => {
    mockFindJobs.mockResolvedValue({ data: [], total: 0, page: 2, pageSize: 5 });

    await app.inject({ method: 'GET', url: '/jobs?page=2&pageSize=5&minScore=70&source=wwr' });

    expect(mockFindJobs).toHaveBeenCalledWith(
      expect.objectContaining({ minScore: 70, source: 'wwr' }),
      { page: 2, pageSize: 5 },
    );
  });

  it('rejeita pageSize acima do limite com 400', async () => {
    const response = await app.inject({ method: 'GET', url: '/jobs?pageSize=999' });
    expect(response.statusCode).toBe(400);
    expect(mockFindJobs).not.toHaveBeenCalled();
  });
});

describe('GET /jobs/:id', () => {
  it('retorna 404 quando a vaga não existe', async () => {
    mockFindJobById.mockResolvedValue(null);

    const response = await app.inject({ method: 'GET', url: '/jobs/inexistente' });

    expect(response.statusCode).toBe(404);
  });

  it('retorna a vaga quando existe', async () => {
    mockFindJobById.mockResolvedValue({ id: 'abc', title: 'Senior Node' } as unknown as JobRow);

    const response = await app.inject({ method: 'GET', url: '/jobs/abc' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: 'abc' });
  });
});
