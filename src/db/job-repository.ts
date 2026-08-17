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

export interface JobFilters {
  /** Score mínimo (0..100). */
  minScore?: number;
  /** Slug da fonte (ex.: "remotive"). */
  source?: string;
  /** Vagas vistas pela primeira vez a partir desta data. */
  since?: Date;
  /** Termo buscado no título/descrição (case-insensitive). */
  stack?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

/**
 * Lista vagas com filtros e paginação, ordenadas por score (desc, nulls por
 * último) e depois por lastSeenAt.
 */
export async function findJobs(filters: JobFilters, pagination: Pagination) {
  const where: Prisma.JobWhereInput = {};
  if (filters.minScore !== undefined) where.score = { gte: filters.minScore };
  if (filters.source !== undefined) where.source = { slug: filters.source };
  if (filters.since !== undefined) where.firstSeenAt = { gte: filters.since };
  if (filters.stack !== undefined) {
    where.OR = [
      { title: { contains: filters.stack, mode: 'insensitive' } },
      { description: { contains: filters.stack, mode: 'insensitive' } },
    ];
  }

  const { page, pageSize } = pagination;
  const [data, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: [{ score: { sort: 'desc', nulls: 'last' } }, { lastSeenAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.job.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

/** Busca uma vaga pelo id (com o breakdown do score). */
export async function findJobById(id: string) {
  return prisma.job.findUnique({ where: { id } });
}

/** Lista as fontes com o status/duração da última coleta. */
export async function listSources() {
  return prisma.source.findMany({ orderBy: { slug: 'asc' } });
}

const SCORE_BUCKETS = [
  { bucket: '0-19', min: 0, max: 20 },
  { bucket: '20-39', min: 20, max: 40 },
  { bucket: '40-59', min: 40, max: 60 },
  { bucket: '60-79', min: 60, max: 80 },
  { bucket: '80-100', min: 80, max: 101 },
];

/** Agregações para os gráficos do dashboard (tudo calculado no servidor). */
export async function getStats() {
  const [total, notified, sources, dayRows] = await Promise.all([
    prisma.job.count(),
    prisma.job.count({ where: { notifiedAt: { not: null } } }),
    prisma.source.findMany({
      select: { slug: true, _count: { select: { jobs: true } } },
      orderBy: { slug: 'asc' },
    }),
    prisma.job.findMany({ select: { firstSeenAt: true } }),
  ]);

  const byScoreBucket = await Promise.all(
    SCORE_BUCKETS.map(async ({ bucket, min, max }) => ({
      bucket,
      count: await prisma.job.count({ where: { score: { gte: min, lt: max } } }),
    })),
  );

  const bySource = sources.map((source) => ({ source: source.slug, count: source._count.jobs }));

  // Agrupa por dia (YYYY-MM-DD) a partir do firstSeenAt.
  const byDayMap = new Map<string, number>();
  for (const { firstSeenAt } of dayRows) {
    const day = firstSeenAt.toISOString().slice(0, 10);
    byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
  }
  const byDay = [...byDayMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { total, notified, byScoreBucket, bySource, byDay };
}

/**
 * Vagas elegíveis para notificação: score ≥ limiar e ainda não notificadas,
 * das melhores para as piores.
 */
export async function findJobsToNotify(minScore: number, limit = 20) {
  return prisma.job.findMany({
    where: { notifiedAt: null, score: { gte: minScore } },
    orderBy: { score: { sort: 'desc', nulls: 'last' } },
    take: limit,
  });
}

/** Marca vagas como notificadas (idempotência: não renotificar). */
export async function markNotified(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.job.updateMany({
    where: { id: { in: ids } },
    data: { notifiedAt: new Date() },
  });
}
