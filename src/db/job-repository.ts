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

export interface SaveJobsResult {
  /** Vagas inéditas inseridas nesta coleta. */
  inserted: number;
  /** Vagas já conhecidas cujo lastSeenAt foi atualizado. */
  updated: number;
}

/**
 * Persiste as vagas de uma fonte com semântica de histórico (upsert).
 *
 * - Deduplica dentro do próprio lote por `dedupeHash`.
 * - Vaga inédita → inserida (firstSeenAt/lastSeenAt recebem o default now()).
 * - Vaga já conhecida → apenas o `lastSeenAt` é atualizado (firstSeenAt
 *   permanece), registrando que ela ainda está ativa.
 *
 * Usa consulta em lote (findMany → createMany + updateMany) em vez de N upserts
 * individuais: menos round-trips e contagens exatas de inserção/atualização.
 */
export async function saveJobs(sourceId: string, jobs: NormalizedJob[]): Promise<SaveJobsResult> {
  if (jobs.length === 0) return { inserted: 0, updated: 0 };

  // Deduplica o lote por hash.
  const byHash = new Map<string, NormalizedJob & { dedupeHash: string }>();
  for (const job of jobs) {
    const dedupeHash = computeDedupeHash(job);
    if (!byHash.has(dedupeHash)) {
      byHash.set(dedupeHash, { ...job, dedupeHash });
    }
  }

  // Quais desses hashes já existem no banco?
  const existing = await prisma.job.findMany({
    where: { dedupeHash: { in: [...byHash.keys()] } },
    select: { dedupeHash: true },
  });
  const existingHashes = new Set(existing.map((row) => row.dedupeHash));

  const toCreate = [...byHash.values()]
    .filter((job) => !existingHashes.has(job.dedupeHash))
    .map((job) => ({ ...job, sourceId }));

  let inserted = 0;
  if (toCreate.length > 0) {
    // skipDuplicates protege contra corrida entre o findMany e o insert.
    const created = await prisma.job.createMany({ data: toCreate, skipDuplicates: true });
    inserted = created.count;
  }

  let updated = 0;
  if (existingHashes.size > 0) {
    const bumped = await prisma.job.updateMany({
      where: { dedupeHash: { in: [...existingHashes] } },
      data: { lastSeenAt: new Date() },
    });
    updated = bumped.count;
  }

  return { inserted, updated };
}
