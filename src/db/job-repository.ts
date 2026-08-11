import { computeDedupeHash } from '../pipeline/dedupe.js';
import type { ScoredJob } from '../scoring/scorer.js';
import type { Prisma } from '../generated/prisma/client.js';
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

export interface SourceRun {
  status: 'success' | 'error';
  durationMs: number;
}

/** Registra o resultado da última coleta de uma fonte (status + duração). */
export async function recordSourceRun(sourceId: string, run: SourceRun): Promise<void> {
  await prisma.source.update({
    where: { id: sourceId },
    data: {
      lastRunAt: new Date(),
      lastRunStatus: run.status,
      lastRunDurationMs: run.durationMs,
    },
  });
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
export async function saveJobs(sourceId: string, jobs: ScoredJob[]): Promise<SaveJobsResult> {
  if (jobs.length === 0) return { inserted: 0, updated: 0 };

  // Deduplica o lote por hash.
  const byHash = new Map<string, ScoredJob>();
  for (const job of jobs) {
    const dedupeHash = computeDedupeHash(job);
    if (!byHash.has(dedupeHash)) {
      byHash.set(dedupeHash, job);
    }
  }

  // Quais desses hashes já existem no banco?
  const existing = await prisma.job.findMany({
    where: { dedupeHash: { in: [...byHash.keys()] } },
    select: { dedupeHash: true },
  });
  const existingHashes = new Set(existing.map((row) => row.dedupeHash));

  const toCreate: Prisma.JobCreateManyInput[] = [...byHash.entries()]
    .filter(([dedupeHash]) => !existingHashes.has(dedupeHash))
    .map(([dedupeHash, job]) => ({
      title: job.title,
      company: job.company,
      url: job.url,
      location: job.location,
      description: job.description,
      dedupeHash,
      sourceId,
      score: job.score,
      // Breakdown tipado → Json do Prisma (cast padrão para campos Json).
      scoreBreakdown: job.scoreBreakdown as unknown as Prisma.InputJsonValue,
    }));

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
