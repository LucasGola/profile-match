import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./queues.js', () => ({
  COLLECTION_QUEUE: 'collection',
  collectionQueue: { upsertJobScheduler: vi.fn() },
}));
vi.mock('../sources/registry.js', () => ({
  sources: [
    { slug: 'remotive', name: 'Remotive', fetch: vi.fn() },
    { slug: 'wwr', name: 'We Work Remotely', fetch: vi.fn() },
  ],
}));

import { collectionQueue } from './queues.js';
import { getCollectionIntervalMs, registerCollectionSchedulers } from './scheduler.js';

const mockUpsert = vi.mocked(collectionQueue.upsertJobScheduler);
const THIRTY_MIN = 30 * 60 * 1000;

describe('getCollectionIntervalMs', () => {
  const original = process.env['COLLECT_INTERVAL_MS'];
  afterEach(() => {
    if (original === undefined) delete process.env['COLLECT_INTERVAL_MS'];
    else process.env['COLLECT_INTERVAL_MS'] = original;
  });

  it('usa 30 minutos por padrão quando não definido', () => {
    delete process.env['COLLECT_INTERVAL_MS'];
    expect(getCollectionIntervalMs()).toBe(THIRTY_MIN);
  });

  it('respeita o valor do ambiente', () => {
    process.env['COLLECT_INTERVAL_MS'] = '60000';
    expect(getCollectionIntervalMs()).toBe(60000);
  });

  it('ignora valor inválido e cai no padrão', () => {
    process.env['COLLECT_INTERVAL_MS'] = 'abc';
    expect(getCollectionIntervalMs()).toBe(THIRTY_MIN);
  });
});

describe('registerCollectionSchedulers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['COLLECT_INTERVAL_MS'] = '60000';
  });

  it('registra um job repetível por fonte, com o intervalo configurado', async () => {
    await registerCollectionSchedulers();

    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(mockUpsert).toHaveBeenCalledWith(
      'collect:remotive',
      { every: 60000 },
      { name: 'collect', data: { sourceSlug: 'remotive' } },
    );
    expect(mockUpsert).toHaveBeenCalledWith(
      'collect:wwr',
      { every: 60000 },
      { name: 'collect', data: { sourceSlug: 'wwr' } },
    );
  });
});
