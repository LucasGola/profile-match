import { GreenhouseSource } from './greenhouse/greenhouse.source.js';
import type { JobSource } from './job-source.js';
import { RemotiveSource } from './remotive/remotive.source.js';
import { WwrSource } from './wwr/wwr.source.js';

/**
 * Registry das fontes habilitadas.
 *
 * Adicionar uma nova fonte = implementar `JobSource` e incluí-la nesta lista.
 * Nenhum outro ponto do sistema precisa ser alterado.
 */
export const sources: JobSource[] = [new RemotiveSource(), new WwrSource(), new GreenhouseSource()];

const sourcesBySlug = new Map(sources.map((source) => [source.slug, source]));

/** Resolve uma fonte pelo slug (usado pelos workers a partir do job). */
export function getSourceBySlug(slug: string): JobSource | undefined {
  return sourcesBySlug.get(slug);
}
