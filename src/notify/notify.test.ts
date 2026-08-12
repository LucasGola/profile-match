import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/job-repository.js', () => ({
  findJobsToNotify: vi.fn(),
  markNotified: vi.fn(),
}));

import { findJobsToNotify, markNotified } from '../db/job-repository.js';
import type { Notifier } from './notifier.js';
import { getNotifyMinScore, notifyNewJobs } from './notify.js';

const mockFind = vi.mocked(findJobsToNotify);
const mockMark = vi.mocked(markNotified);
type JobRows = Awaited<ReturnType<typeof findJobsToNotify>>;

const jobs = [
  { id: '1', title: 'A', company: 'C', url: 'https://u/1', score: 90 },
  { id: '2', title: 'B', company: 'C', url: 'https://u/2', score: 85 },
] as unknown as JobRows;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('notifyNewJobs', () => {
  it('envia cada vaga e marca as enviadas', async () => {
    mockFind.mockResolvedValue(jobs);
    const notifier: Notifier = { send: vi.fn().mockResolvedValue(undefined) };

    const count = await notifyNewJobs(notifier, 80);

    expect(count).toBe(2);
    expect(notifier.send).toHaveBeenCalledTimes(2);
    expect(mockMark).toHaveBeenCalledWith(['1', '2']);
  });

  it('não marca a vaga cujo envio falhou', async () => {
    mockFind.mockResolvedValue(jobs);
    const send = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('telegram fora'))
      .mockResolvedValue(undefined);

    const count = await notifyNewJobs({ send }, 80);

    expect(count).toBe(1);
    expect(mockMark).toHaveBeenCalledWith(['2']);
  });
});

describe('getNotifyMinScore', () => {
  const original = process.env['NOTIFY_MIN_SCORE'];
  afterEach(() => {
    if (original === undefined) delete process.env['NOTIFY_MIN_SCORE'];
    else process.env['NOTIFY_MIN_SCORE'] = original;
  });

  it('usa 80 por padrão', () => {
    delete process.env['NOTIFY_MIN_SCORE'];
    expect(getNotifyMinScore()).toBe(80);
  });

  it('respeita o valor do ambiente', () => {
    process.env['NOTIFY_MIN_SCORE'] = '90';
    expect(getNotifyMinScore()).toBe(90);
  });
});
