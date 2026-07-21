import { Queue } from 'bullmq';
import { createRedisConnection } from './connection.js';
import { COLLECTION_JOB_OPTIONS } from './job-options.js';

/** Nome da fila de coleta (1 job por fonte). */
export const COLLECTION_QUEUE = 'collection';

/** Dados de um job de coleta: identifica qual fonte coletar. */
export interface CollectionJobData {
  sourceSlug: string;
}

/**
 * Fila de coleta. O produtor (scheduler/CLI) enfileira 1 job por fonte;
 * os workers consomem e processam cada fonte de forma isolada.
 */
export const collectionQueue = new Queue<CollectionJobData>(COLLECTION_QUEUE, {
  connection: createRedisConnection(),
  defaultJobOptions: COLLECTION_JOB_OPTIONS,
});
