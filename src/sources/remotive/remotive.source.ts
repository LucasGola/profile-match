import { logger } from '../../logger.js';
import { normalizedJobSchema, type NormalizedJob } from '../../pipeline/job.schema.js';
import type { JobSource } from '../job-source.js';

const REMOTIVE_API_URL = 'https://remotive.com/api/remote-jobs';

/** Formato bruto de uma vaga na API da Remotive (campos relevantes). */
interface RemotiveJob {
  title?: string;
  company_name?: string;
  url?: string;
  candidate_required_location?: string;
  description?: string;
}

interface RemotiveResponse {
  jobs?: RemotiveJob[];
}

/**
 * Coletor da Remotive (https://remotive.com) — API JSON pública.
 *
 * `fetch()` faz a requisição; `normalize()` mapeia o formato bruto para o
 * schema canônico e é separado de propósito para permitir teste unitário
 * sem rede.
 */
export class RemotiveSource implements JobSource {
  readonly slug = 'remotive';
  readonly name = 'Remotive';

  private readonly limit: number;
  private readonly timeoutMs: number;

  constructor(opts: { limit?: number; timeoutMs?: number } = {}) {
    this.limit = opts.limit ?? 50;
    this.timeoutMs = opts.timeoutMs ?? 10_000;
  }

  async fetch(): Promise<NormalizedJob[]> {
    const url = `${REMOTIVE_API_URL}?limit=${String(this.limit)}`;

    const response = await globalThis.fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Remotive respondeu ${String(response.status)} ${response.statusText}`);
    }

    const body = (await response.json()) as RemotiveResponse;
    return this.normalize(body.jobs ?? []);
  }

  /** Mapeia e valida as vagas brutas; descarta (com log) as inválidas. */
  normalize(rawJobs: RemotiveJob[]): NormalizedJob[] {
    const jobs: NormalizedJob[] = [];

    for (const raw of rawJobs) {
      const parsed = normalizedJobSchema.safeParse({
        title: raw.title,
        company: raw.company_name,
        url: raw.url,
        location: raw.candidate_required_location ?? null,
        description: raw.description ?? null,
      });

      if (parsed.success) {
        jobs.push(parsed.data);
      } else {
        logger.warn(
          { source: this.slug, url: raw.url, issues: parsed.error.issues },
          'vaga descartada na normalização',
        );
      }
    }

    return jobs;
  }
}
