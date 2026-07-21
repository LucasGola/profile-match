import { sources } from '../sources/registry.js';
import { collectionQueue, type CollectionJobData } from './queues.js';

/**
 * Enfileira 1 job de coleta por fonte registrada.
 *
 * @returns os ids dos jobs enfileirados.
 */
export async function enqueueCollection(): Promise<string[]> {
  const enqueued = await Promise.all(
    sources.map((source) =>
      collectionQueue.add('collect', { sourceSlug: source.slug } satisfies CollectionJobData),
    ),
  );

  return enqueued.map((job) => job.id ?? '');
}
