import Parser from 'rss-parser';
import { logger } from '../../logger.js';
import { normalizedJobSchema, type NormalizedJob } from '../../pipeline/job.schema.js';
import type { JobSource } from '../job-source.js';

const WWR_RSS_URL = 'https://weworkremotely.com/remote-jobs.rss';

/** Campos que usamos de cada <item> do feed (inclui o custom field `region`). */
interface WwrRssItem {
  title?: string;
  link?: string;
  region?: string;
  contentSnippet?: string;
}

/** Separa "Empresa: Cargo" (formato do título do WWR) em empresa e cargo. */
function splitTitle(rawTitle: string): { company: string; title: string } {
  const separatorIndex = rawTitle.indexOf(':');
  if (separatorIndex === -1) {
    return { company: '', title: rawTitle.trim() };
  }
  return {
    company: rawTitle.slice(0, separatorIndex).trim(),
    title: rawTitle.slice(separatorIndex + 1).trim(),
  };
}

/**
 * Coletor do We Work Remotely (feed RSS).
 *
 * O HTTP é feito com o fetch nativo (timeout consistente com as demais fontes);
 * o rss-parser só faz o parse do XML já baixado. `normalize()` é separado para
 * permitir teste unitário sem rede.
 */
export class WwrSource implements JobSource {
  readonly slug = 'wwr';
  readonly name = 'We Work Remotely';

  private readonly timeoutMs: number;
  private readonly parser = new Parser<Record<string, never>, WwrRssItem>({
    customFields: { item: ['region'] },
  });

  constructor(opts: { timeoutMs?: number } = {}) {
    this.timeoutMs = opts.timeoutMs ?? 10_000;
  }

  async fetch(): Promise<NormalizedJob[]> {
    const response = await globalThis.fetch(WWR_RSS_URL, {
      headers: { Accept: 'application/rss+xml, application/xml' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(
        `We Work Remotely respondeu ${String(response.status)} ${response.statusText}`,
      );
    }

    const xml = await response.text();
    const feed = await this.parser.parseString(xml);
    return this.normalize(feed.items);
  }

  /** Mapeia e valida os itens do feed; descarta (com log) os inválidos. */
  normalize(items: WwrRssItem[]): NormalizedJob[] {
    const jobs: NormalizedJob[] = [];

    for (const item of items) {
      const { company, title } = splitTitle(item.title ?? '');
      const parsed = normalizedJobSchema.safeParse({
        title,
        company,
        url: item.link,
        location: item.region?.trim() || null,
        description: item.contentSnippet?.trim() || null,
      });

      if (parsed.success) {
        jobs.push(parsed.data);
      } else {
        logger.warn(
          { source: this.slug, url: item.link, issues: parsed.error.issues },
          'vaga descartada na normalização',
        );
      }
    }

    return jobs;
  }
}
