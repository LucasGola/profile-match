import { logger } from '../../logger.js';
import { normalizedJobSchema, type NormalizedJob } from '../../pipeline/job.schema.js';
import type { JobSource } from '../job-source.js';
import { greenhouseCompanies, type GreenhouseCompany } from './companies.js';

const GREENHOUSE_API_URL = 'https://boards-api.greenhouse.io/v1/boards';

/** Formato bruto de uma vaga no board do Greenhouse (campos relevantes). */
interface GreenhouseJob {
  title?: string;
  absolute_url?: string;
  company_name?: string;
  location?: { name?: string };
}

interface GreenhouseResponse {
  jobs?: GreenhouseJob[];
}

/**
 * Coletor do Greenhouse — agrega os boards públicos de várias empresas.
 *
 * Cada board é buscado de forma isolada: um board indisponível (404, comum
 * para empresas que usam outro ATS) é logado e ignorado, sem afetar os demais.
 * A lista de empresas vem do config (`greenhouseCompanies`) e pode ser injetada
 * no construtor — o seam para uma futura descoberta dinâmica de empresas.
 */
export class GreenhouseSource implements JobSource {
  readonly slug = 'greenhouse';
  readonly name = 'Greenhouse';

  private readonly timeoutMs: number;
  private readonly companies: GreenhouseCompany[];

  constructor(opts: { timeoutMs?: number; companies?: GreenhouseCompany[] } = {}) {
    this.timeoutMs = opts.timeoutMs ?? 10_000;
    this.companies = opts.companies ?? greenhouseCompanies;
  }

  async fetch(): Promise<NormalizedJob[]> {
    const all: NormalizedJob[] = [];

    for (const company of this.companies) {
      try {
        const jobs = await this.fetchBoard(company);
        all.push(...this.normalize(jobs, company));
      } catch (err) {
        logger.warn(
          { source: this.slug, company: company.boardToken, err },
          'board do Greenhouse indisponível; ignorando',
        );
      }
    }

    return all;
  }

  private async fetchBoard(company: GreenhouseCompany): Promise<GreenhouseJob[]> {
    const url = `${GREENHOUSE_API_URL}/${company.boardToken}/jobs`;
    const response = await globalThis.fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`board ${company.boardToken} respondeu ${String(response.status)}`);
    }

    const body = (await response.json()) as GreenhouseResponse;
    return body.jobs ?? [];
  }

  /** Mapeia e valida as vagas de um board; descarta (com log) as inválidas. */
  normalize(jobs: GreenhouseJob[], company: GreenhouseCompany): NormalizedJob[] {
    const result: NormalizedJob[] = [];

    for (const job of jobs) {
      const parsed = normalizedJobSchema.safeParse({
        title: job.title,
        company: job.company_name ?? company.name,
        url: job.absolute_url,
        location: job.location?.name?.trim() || null,
        description: null,
      });

      if (parsed.success) {
        result.push(parsed.data);
      } else {
        logger.warn(
          {
            source: this.slug,
            company: company.boardToken,
            url: job.absolute_url,
            issues: parsed.error.issues,
          },
          'vaga descartada na normalização',
        );
      }
    }

    return result;
  }
}
