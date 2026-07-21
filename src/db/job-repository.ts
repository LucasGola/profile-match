import { computeDedupeHash } from '../pipeline/dedupe.js';
import type { NormalizedJob } from '../pipeline/job.schema.js';
import { prisma } from './client.js';

/**
 * Garante que a fonte exista e retorna seu id.
 * Idempotente: cria na primeira vez, atualiza o nome nas seguintes.
 */
export async function upsertSource(slug: string, name: string): Promise<string> {
  const source = await prisma.source.upsert({
    where: { slug },
    create: { slug, name },
    update: { name },
  });
  return source.id;
}

/**
 * Persiste as vagas de uma fonte, ignorando duplicatas.
 *
 * - Deduplica dentro do próprio lote por `dedupeHash` (evita conflito na
 *   mesma instrução de insert).
 * - `skipDuplicates` ignora vagas já presentes no banco (constraint única).
 *
 * A semântica de histórico (first_seen/last_seen) entra no Milestone 3.
 *
 * @returns quantidade de vagas efetivamente inseridas.
 */
export async function saveJobs(sourceId: string, jobs: NormalizedJob[]): Promise<number> {
  if (jobs.length === 0) return 0;

  const seen = new Set<string>();
  const data = [];
  for (const job of jobs) {
    const dedupeHash = computeDedupeHash(job);
    if (seen.has(dedupeHash)) continue;
    seen.add(dedupeHash);
    data.push({ ...job, sourceId, dedupeHash });
  }

  const result = await prisma.job.createMany({ data, skipDuplicates: true });
  return result.count;
}
