import { createHash } from 'node:crypto';
import type { NormalizedJob } from './job.schema.js';

/** Campos que compõem a identidade de uma vaga para fins de deduplicação. */
type DedupeInput = Pick<NormalizedJob, 'company' | 'title' | 'url'>;

/** Separador NUL entre campos: evita colisões do tipo "ab"+"c" vs "a"+"bc". */
const FIELD_SEPARATOR = String.fromCharCode(0);

/** Normaliza texto para comparação: minúsculas, sem espaços redundantes. */
function normalizeForHash(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Calcula o hash de deduplicação de uma vaga (SHA-256 de empresa+título+url).
 *
 * Duas coletas da mesma vaga produzem o mesmo hash, permitindo que a
 * constraint única no banco impeça a reinserção.
 */
export function computeDedupeHash(job: DedupeInput): string {
  const key = [
    normalizeForHash(job.company),
    normalizeForHash(job.title),
    normalizeForHash(job.url),
  ].join(FIELD_SEPARATOR);

  return createHash('sha256').update(key).digest('hex');
}
