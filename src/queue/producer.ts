import { logger } from '../logger.js';
import { sources } from '../sources/registry.js';
import { collectionQueue, type CollectionJobData } from './queues.js';

/**
 * Enfileira 1 job de coleta por fonte registrada.
 *
 * O enfileiramento de cada fonte é independente: se uma falhar (ex.: Redis
 * indisponível momentaneamente), as demais continuam sendo enfileiradas. A
 * fonte que falhou será tentada de novo na próxima coleta.
 *
 * @returns os ids dos jobs efetivamente enfileirados.
 */
export async function enqueueCollection(): Promise<string[]> {
  const results = await Promise.allSettled(
    sources.map((source) =>
      collectionQueue.add('collect', { sourceSlug: source.slug } satisfies CollectionJobData),
    ),
  );

  const ids: string[] = [];
  results.forEach((result, index) => {
    const source = sources[index];
    if (result.status === 'fulfilled') {
      ids.push(result.value.id ?? '');
    } else {
      logger.error(
        { source: source?.slug, err: result.reason },
        'falha ao enfileirar coleta da fonte',
      );
    }
  });

  return ids;
}
