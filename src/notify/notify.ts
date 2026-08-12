import { findJobsToNotify, markNotified } from '../db/job-repository.js';
import { logger } from '../logger.js';
import type { Notifier } from './notifier.js';

const DEFAULT_MIN_SCORE = 80;

/** Limiar mínimo de score para notificar (via NOTIFY_MIN_SCORE). */
export function getNotifyMinScore(): number {
  const raw = process.env['NOTIFY_MIN_SCORE'];
  const parsed = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : DEFAULT_MIN_SCORE;
}

interface NotifiableJob {
  title: string;
  company: string;
  url: string;
  score: number | null;
}

function formatJob(job: NotifiableJob): string {
  return `⭐ ${String(job.score ?? '?')} — ${job.title} @ ${job.company}\n${job.url}`;
}

/**
 * Notifica as vagas novas acima do limiar e as marca como notificadas.
 *
 * Envia uma mensagem por vaga; uma que falhe ao enviar NÃO é marcada (será
 * tentada na próxima coleta).
 *
 * @returns quantidade de vagas efetivamente notificadas.
 */
export async function notifyNewJobs(notifier: Notifier, minScore: number): Promise<number> {
  const jobs = await findJobsToNotify(minScore);

  const notifiedIds: string[] = [];
  for (const job of jobs) {
    try {
      await notifier.send(formatJob(job));
      notifiedIds.push(job.id);
    } catch (err) {
      logger.error({ err, jobId: job.id }, 'falha ao notificar vaga');
    }
  }

  await markNotified(notifiedIds);
  return notifiedIds.length;
}
