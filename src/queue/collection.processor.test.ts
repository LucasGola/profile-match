import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NormalizedJob } from '../pipeline/job.schema.js';
import type { JobSource } from '../sources/job-source.js';
import type { CollectionJobData } from './queues.js';

vi.mock('../db/job-repository.js', () => ({
  upsertSource: vi.fn(),
  saveJobs: vi.fn(),
  recordSourceRun: vi.fn(),
}));
vi.mock('../sources/registry.js', () => ({
  getSourceBySlug: vi.fn(),
}));

import { recordSourceRun, saveJobs, upsertSource } from '../db/job-repository.js';
import { getSourceBySlug } from '../sources/registry.js';
import { processCollectionJob } from './collection.processor.js';

const mockUpsertSource = vi.mocked(upsertSource);
const mockSaveJobs = vi.mocked(saveJobs);
const mockRecordSourceRun = vi.mocked(recordSourceRun);
const mockGetSourceBySlug = vi.mocked(getSourceBySlug);

function makeJob(sourceSlug: string): Job<CollectionJobData> {
  return { id: '1', data: { sourceSlug } } as unknown as Job<CollectionJobData>;
}

const sampleJobs: NormalizedJob[] = [
  { title: 'Dev', company: 'Acme', url: 'https://x.com/1', location: null, description: null },
  { title: 'SRE', company: 'Acme', url: 'https://x.com/2', location: null, description: null },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('processCollectionJob', () => {
  it('resolve a fonte, coleta e persiste, retornando as contagens', async () => {
    const fetchMock = vi.fn<() => Promise<NormalizedJob[]>>().mockResolvedValue(sampleJobs);
    const fakeSource: JobSource = { slug: 'remotive', name: 'Remotive', fetch: fetchMock };
    mockGetSourceBySlug.mockReturnValue(fakeSource);
    mockUpsertSource.mockResolvedValue('source-id');
    mockSaveJobs.mockResolvedValue({ inserted: 2, updated: 0 });

    const result = await processCollectionJob(makeJob('remotive'));

    expect(result).toEqual({ fetched: 2, inserted: 2, updated: 0 });
    expect(mockUpsertSource).toHaveBeenCalledWith('remotive', 'Remotive');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mockSaveJobs).toHaveBeenCalledWith('source-id', sampleJobs);
    expect(mockRecordSourceRun).toHaveBeenCalledWith('source-id', {
      status: 'success',
      durationMs: expect.any(Number) as number,
    });
  });

  it('registra a falha (status error) e propaga o erro quando a coleta falha', async () => {
    const fetchMock = vi
      .fn<() => Promise<NormalizedJob[]>>()
      .mockRejectedValue(new Error('fonte fora do ar'));
    const fakeSource: JobSource = { slug: 'remotive', name: 'Remotive', fetch: fetchMock };
    mockGetSourceBySlug.mockReturnValue(fakeSource);
    mockUpsertSource.mockResolvedValue('source-id');

    await expect(processCollectionJob(makeJob('remotive'))).rejects.toThrow('fonte fora do ar');

    expect(mockSaveJobs).not.toHaveBeenCalled();
    expect(mockRecordSourceRun).toHaveBeenCalledWith('source-id', {
      status: 'error',
      durationMs: expect.any(Number) as number,
    });
  });

  it('lança para fonte desconhecida (sem tocar no banco)', async () => {
    mockGetSourceBySlug.mockReturnValue(undefined);

    await expect(processCollectionJob(makeJob('inexistente'))).rejects.toThrow(
      'fonte desconhecida: inexistente',
    );
    expect(mockUpsertSource).not.toHaveBeenCalled();
    expect(mockSaveJobs).not.toHaveBeenCalled();
    expect(mockRecordSourceRun).not.toHaveBeenCalled();
  });
});
