import type { Job } from 'bullmq';
import { recordSourceRun, saveJobs, upsertSource } from '../db/job-repository.js';
import { logger } from '../logger.js';
import { getSourceBySlug } from '../sources/registry.js';
import type { CollectionJobData } from './queues.js';

export interface CollectionResult {
  fetched: number;
  inserted: number;
  updated: number;
}

/**
 * Processa um job de coleta: resolve a fonte pelo slug e executa
 * fetch → normalização → persistência.
 *
 * Lançar aqui marca o job como falho no BullMQ (e dispara o retry, quando
 * configurado). Cada fonte é um job independente, então a falha de uma não
 * afeta as demais.
 */
export async function processCollectionJob(job: Job<CollectionJobData>): Promise<CollectionResult> {
  const { sourceSlug } = job.data;
  const source = getSourceBySlug(sourceSlug);
  if (!source) {
    throw new Error(`fonte desconhecida: ${sourceSlug}`);
  }

  const log = logger.child({ source: source.slug, jobId: job.id });

  const sourceId = await upsertSource(source.slug, source.name);
  const startedAt = Date.now();

  try {
    const jobs = await source.fetch();
    const { inserted, updated } = await saveJobs(sourceId, jobs);

    await recordSourceRun(sourceId, { status: 'success', durationMs: Date.now() - startedAt });
    log.info({ fetched: jobs.length, inserted, updated }, 'coleta concluída');
    return { fetched: jobs.length, inserted, updated };
  } catch (err) {
    await recordSourceRun(sourceId, { status: 'error', durationMs: Date.now() - startedAt });
    throw err;
  }
}
