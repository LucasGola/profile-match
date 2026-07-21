import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./queues.js', () => ({
  COLLECTION_QUEUE: 'collection',
  collectionQueue: { add: vi.fn() },
}));
vi.mock('../sources/registry.js', () => ({
  sources: [
    { slug: 'remotive', name: 'Remotive', fetch: vi.fn() },
    { slug: 'wwr', name: 'We Work Remotely', fetch: vi.fn() },
  ],
}));

import { collectionQueue } from './queues.js';
import { enqueueCollection } from './producer.js';

const mockAdd = vi.mocked(collectionQueue.add);
type AddResult = Awaited<ReturnType<typeof collectionQueue.add>>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('enqueueCollection', () => {
  it('enfileira 1 job por fonte com o slug correto', async () => {
    mockAdd
      .mockResolvedValueOnce({ id: 'job-remotive' } as unknown as AddResult)
      .mockResolvedValueOnce({ id: 'job-wwr' } as unknown as AddResult);

    const ids = await enqueueCollection();

    expect(mockAdd).toHaveBeenCalledTimes(2);
    expect(mockAdd).toHaveBeenCalledWith('collect', { sourceSlug: 'remotive' });
    expect(mockAdd).toHaveBeenCalledWith('collect', { sourceSlug: 'wwr' });
    expect(ids).toEqual(['job-remotive', 'job-wwr']);
  });
});
